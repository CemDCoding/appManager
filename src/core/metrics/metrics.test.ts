import { describe, expect, it } from 'vitest'
import type { Campaign } from '@shared/schemas/campaign'
import type { UserMetric } from '@shared/schemas/userMetric'
import { buildLedger, type Ledger, type LedgerEntry } from '@core/ledger/ledger'
import {
  ALL,
  campaign,
  equal,
  oneTimeExpense,
  oneTimeIncome,
  project,
  percent
} from '@core/ledger/testFactories'
import {
  campaignKpis,
  campaignRanking,
  campaignUsersByProject,
  personSummary,
  userMetrics
} from './metrics'

const YEAR = { from: '2026-01-01', to: '2026-12-31' }
const A = project('a', '2026-01-01')
const B = project('b', '2026-01-01')
const TS = '2026-01-01T00:00:00.000Z'

function camp(
  id: string,
  over: Partial<Campaign> & { cents?: number; currency?: string; rate?: string }
): Campaign {
  const { cents, currency, rate, ...rest } = over
  return {
    ...campaign(
      id,
      over.startDate ?? '2026-03-01',
      over.endDate ?? '2026-03-31',
      { cents: cents ?? 10_000, currency, rateToEur: rate },
      over.allocation ?? ALL
    ),
    ...rest
  }
}

function snap(projectId: string, date: string, total: number, paying = 0, active = 0): UserMetric {
  return {
    id: `${projectId}-${date}`,
    ownerId: 'local',
    createdAt: TS,
    updatedAt: TS,
    projectId,
    date,
    usersTotal: total,
    usersActive: active,
    usersPaying: paying
  }
}

describe('personSummary', () => {
  it('splits 100 EUR to a person over 2 projects into 50 EUR each', () => {
    const ledger = buildLedger(
      {
        projects: [A, B],
        expenses: [oneTimeExpense('e1', '2026-02-10', { cents: 10_000 }, ALL, { personId: 'p1' })],
        incomes: [],
        campaigns: []
      },
      YEAR
    )
    const s = personSummary(ledger, 'p1', YEAR)
    expect(s.totalCents).toBe(10_000)
    expect(s.byProject).toEqual([
      { projectId: 'a', cents: 5000 },
      { projectId: 'b', cents: 5000 }
    ])
    expect(s.byMonth).toEqual([{ month: '2026-02', cents: 10_000 }])
  })

  it('filters by person, range and kind; sorts months and projects, null last', () => {
    const entry = (over: Partial<LedgerEntry>): LedgerEntry => ({
      date: '2026-05-01',
      kind: 'expense',
      category: 'other',
      projectId: 'b',
      eurCents: 100,
      original: { cents: 100, currency: 'EUR' },
      sourceType: 'expense',
      sourceId: 'x',
      personId: 'p1',
      ...over
    })
    const ledger: Ledger = {
      errors: [],
      entries: [
        entry({ projectId: null, unallocated: true }),
        entry({ date: '2026-04-30', projectId: 'a', eurCents: 7 }),
        entry({ date: '2026-04-30', projectId: 'b', eurCents: 3 }),
        entry({ date: '2026-04-15', projectId: 'b', eurCents: 1 }),
        entry({ personId: 'p2' }),
        entry({ personId: undefined }),
        entry({ kind: 'income' }),
        entry({ date: '2025-12-31' })
      ]
    }
    const s = personSummary(ledger, 'p1', YEAR)
    expect(s.totalCents).toBe(111)
    expect(s.byProject).toEqual([
      { projectId: 'a', cents: 7 },
      { projectId: 'b', cents: 4 },
      { projectId: null, cents: 100 }
    ])
    expect(s.byMonth).toEqual([
      { month: '2026-04', cents: 11 },
      { month: '2026-05', cents: 100 }
    ])
  })

  it('handles sort comparisons with null in both positions and unknown person', () => {
    const e = (projectId: string | null): LedgerEntry => ({
      date: '2026-05-01',
      kind: 'expense',
      category: 'other',
      projectId,
      eurCents: 1,
      original: { cents: 1, currency: 'EUR' },
      sourceType: 'expense',
      sourceId: 'x',
      personId: 'p'
    })
    for (const order of [
      ['b', null, 'a'],
      [null, 'b', 'a'],
      ['a', 'b', null]
    ]) {
      const s = personSummary({ errors: [], entries: order.map(e) }, 'p', YEAR)
      expect(s.byProject.map((x) => x.projectId)).toEqual(['a', 'b', null])
    }
    expect(personSummary({ errors: [], entries: [] }, 'zz', YEAR)).toEqual({
      totalCents: 0,
      byProject: [],
      byMonth: []
    })
  })

  it('throws for an invalid range and for sums beyond the safe range', () => {
    expect(() =>
      personSummary({ errors: [], entries: [] }, 'p', { from: '2026-02-01', to: '2026-01-01' })
    ).toThrow(RangeError)
    const big: LedgerEntry = {
      date: '2026-05-01',
      kind: 'expense',
      category: 'other',
      projectId: 'a',
      eurCents: Number.MAX_SAFE_INTEGER,
      original: { cents: 1, currency: 'EUR' },
      sourceType: 'expense',
      sourceId: 'x',
      personId: 'p'
    }
    expect(() => personSummary({ errors: [], entries: [big, big] }, 'p', YEAR)).toThrow(RangeError)
  })
})

describe('campaignKpis', () => {
  it.each([
    // cost, clicks, impressions, users, cpc, costPerUser, ctr
    [10_000, 400, 20_000, 50, 25, 200, 200],
    [10_000, 0, 0, 0, null, null, null],
    [10_000, 3, 7, 3, 3333, 3333, 4286],
    [1, 2, 3, 2, 1, 1, 6667], // 0.5 -> 1 (half-up)
    [0, 5, 10, 5, 0, 0, 5000]
  ])('cost %i clicks %i impr %i users %i', (cost, clicks, impr, users, cpc, cpu, ctr) => {
    const r = campaignKpis(
      camp('c', { cents: cost, clicks, impressions: impr, usersGained: users })
    )
    expect(r).toEqual({
      ok: true,
      value: { costEurCents: cost, cpcCents: cpc, costPerUserCents: cpu, ctrBasisPoints: ctr }
    })
  })

  it('converts the cost with the snapshot rate', () => {
    const r = campaignKpis(camp('c', { cents: 1000, currency: 'USD', rate: '0.9', clicks: 9 }))
    expect(r).toMatchObject({ ok: true, value: { costEurCents: 900, cpcCents: 100 } })
  })

  it('returns the conversion error', () => {
    const r = campaignKpis(camp('c', { currency: 'USD', rate: 'abc' }))
    expect(r.ok).toBe(false)
  })

  it('does not overflow for huge click counts', () => {
    const r = campaignKpis(
      camp('c', { clicks: Number.MAX_SAFE_INTEGER, impressions: Number.MAX_SAFE_INTEGER })
    )
    expect(r).toMatchObject({ ok: true, value: { ctrBasisPoints: 10_000 } })
  })
})

describe('campaignUsersByProject', () => {
  it('uses largest remainder on whole users', () => {
    const c = camp('c', { usersGained: 10, allocation: ALL })
    expect(campaignUsersByProject(c, [A, B, project('c', '2026-01-01')])).toEqual([
      { projectId: 'a', users: 4 },
      { projectId: 'b', users: 3 },
      { projectId: 'c', users: 3 }
    ])
  })

  it('respects percent shares and drops inactive projects', () => {
    const ended = project('e', '2026-01-01', '2026-02-01')
    const c = camp('c', { usersGained: 10, allocation: percent(['a', 7000], ['e', 3000]) })
    expect(campaignUsersByProject(c, [A, ended])).toEqual([{ projectId: 'a', users: 10 }])
    const c2 = camp('c', { usersGained: 9, allocation: percent(['a', 3333], ['b', 6667]) })
    expect(campaignUsersByProject(c2, [A, B])).toEqual([
      { projectId: 'a', users: 3 },
      { projectId: 'b', users: 6 }
    ])
  })

  it('yields an unallocated part without an active project', () => {
    const c = camp('c', { usersGained: 5, allocation: equal('zz') })
    expect(campaignUsersByProject(c, [A])).toEqual([{ projectId: null, users: 5 }])
  })
})

describe('campaignRanking', () => {
  const c1 = camp('c1', { cents: 1000, usersGained: 10, rating: 3 }) // 100
  const c2 = camp('c2', { cents: 1000, usersGained: 20, rating: 5 }) // 50
  const c3 = camp('c3', { cents: 1000, usersGained: 0, rating: 5 }) // null
  const c4 = camp('c4', { cents: 1000, usersGained: 10, rating: 1 }) // 100
  const bad = camp('bad', { currency: 'USD', rate: 'x' })

  it('ranks by cost per user, cheapest first, null last, stable', () => {
    const r = campaignRanking([c3, c1, c2, c4, c3, bad], 'costPerUser')
    expect(r.items.map((i) => i.campaign.id)).toEqual(['c2', 'c1', 'c4', 'c3', 'c3'])
    expect(r.errors).toEqual([{ campaignId: 'bad', error: expect.any(String) as string }])
  })

  it('handles null in either comparison position', () => {
    for (const list of [
      [c3, c1],
      [c1, c3]
    ]) {
      expect(campaignRanking(list, 'costPerUser').items.map((i) => i.campaign.id)).toEqual([
        'c1',
        'c3'
      ])
    }
  })

  it('ranks by rating, best first, stable', () => {
    const r = campaignRanking([c4, c1, c3, c2], 'rating')
    expect(r.items.map((i) => i.campaign.id)).toEqual(['c3', 'c2', 'c1', 'c4'])
  })
})

describe('userMetrics', () => {
  const projects = [A, B]
  const Q = { from: '2026-04-01', to: '2026-06-30' }
  const ledger = buildLedger(
    {
      projects,
      expenses: [
        oneTimeExpense('e1', '2026-05-01', { cents: 10_000 }, ALL),
        oneTimeExpense('e0', '2026-01-01', { cents: 99_999 }, ALL)
      ],
      incomes: [
        oneTimeIncome('i1', '2026-05-02', { cents: 3000 }, 'a'),
        oneTimeIncome('i2', '2026-05-03', { cents: 500 }, 'b')
      ],
      campaigns: [camp('c1', { startDate: '2026-04-10', cents: 2000, usersGained: 5 })]
    },
    YEAR
  )
  const campaigns = [
    camp('c1', { startDate: '2026-04-10', cents: 2000, usersGained: 5 }),
    camp('c0', { startDate: '2026-01-10', usersGained: 100 })
  ]
  const snaps = [
    snap('a', '2026-03-31', 100, 10, 50),
    snap('a', '2026-06-30', 130, 15, 70),
    snap('b', '2026-02-01', 40, 2, 20),
    snap('b', '2026-05-15', 50, 4, 30)
  ]

  it('computes the project view (PE-52)', () => {
    const m = userMetrics(snaps, ledger, campaigns, 'a', Q, projects)
    expect(m.latest).toEqual({
      date: '2026-06-30',
      usersTotal: 130,
      usersActive: 70,
      usersPaying: 15
    })
    expect(m.growth).toBe(30)
    // A: half of 10000 + half of 2000 campaign = 6000
    expect(m.expenseCents).toBe(6000)
    expect(m.incomeCents).toBe(3000)
    expect(m.costPerUserCents).toBe(200)
    expect(m.incomePerPayingUserCents).toBe(200)
    // campaign 5 users split 3 / 2 -> A gets 3
    expect(m.campaignUsers).toBe(3)
    expect(m.campaignShareBasisPoints).toBe(1000)
  })

  it('computes the portfolio view as sum over projects', () => {
    const m = userMetrics(snaps, ledger, campaigns, undefined, Q, projects)
    expect(m.latest).toEqual({
      date: '2026-06-30',
      usersTotal: 180,
      usersActive: 100,
      usersPaying: 19
    })
    expect(m.growth).toBe(40)
    expect(m.expenseCents).toBe(12_000)
    expect(m.incomeCents).toBe(3500)
    expect(m.costPerUserCents).toBe(300)
    expect(m.incomePerPayingUserCents).toBe(184) // 3500/19 = 184.2
    expect(m.campaignUsers).toBe(5)
    expect(m.campaignShareBasisPoints).toBe(1250)
  })

  it('uses the first snapshot in range as baseline when none exists before', () => {
    const m = userMetrics(
      [snap('a', '2026-04-10', 10), snap('a', '2026-05-10', 25)],
      ledger,
      [],
      'a',
      Q,
      projects
    )
    expect(m.growth).toBe(15)
    expect(m.latest?.usersTotal).toBe(25)
  })

  it('ignores snapshots after the range', () => {
    const m = userMetrics([snap('a', '2026-07-01', 500)], ledger, [], 'a', Q, projects)
    expect(m.latest).toBeNull()
    expect(m.growth).toBeNull()
    expect(m.costPerUserCents).toBeNull()
    expect(m.incomePerPayingUserCents).toBeNull()
    expect(m.campaignShareBasisPoints).toBeNull()
  })

  it('returns null for division by zero or non-positive growth', () => {
    const flat = userMetrics(
      [snap('a', '2026-03-01', 10), snap('a', '2026-05-01', 10)],
      ledger,
      campaigns,
      'a',
      Q,
      projects
    )
    expect(flat.growth).toBe(0)
    expect(flat.costPerUserCents).toBeNull()
    expect(flat.campaignShareBasisPoints).toBeNull()
    expect(flat.incomePerPayingUserCents).toBeNull() // no paying users
    const shrink = userMetrics(
      [snap('a', '2026-03-01', 10), snap('a', '2026-05-01', 8)],
      ledger,
      [],
      'a',
      Q,
      projects
    )
    expect(shrink.growth).toBe(-2)
    expect(shrink.costPerUserCents).toBeNull()
  })

  it('sorts unordered snapshots and handles same-day duplicates', () => {
    const m = userMetrics(
      [snap('a', '2026-05-01', 30), snap('a', '2026-05-01', 30), snap('a', '2026-03-01', 10)],
      ledger,
      [],
      'a',
      Q,
      projects
    )
    expect(m.growth).toBe(20)
  })

  it('throws for an invalid range', () => {
    expect(() => userMetrics([], ledger, [], undefined, { from: 'x', to: 'y' }, projects)).toThrow(
      RangeError
    )
  })
})
