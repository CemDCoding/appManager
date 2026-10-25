import { describe, expect, it } from 'vitest'
import type { Expense } from '@shared/schemas/expense'
import type { Income } from '@shared/schemas/income'
import type { Campaign } from '@shared/schemas/campaign'
import { toEur } from '@core/currency/currency'
import { activeShares, buildLedger, splitOnto, type LedgerEntry, type LedgerInput } from './ledger'
import {
  ALL,
  campaign,
  equal,
  oneTimeExpense,
  oneTimeIncome,
  percent,
  project,
  recurringExpense,
  recurringIncome,
  rng
} from './testFactories'

const YEAR_2026 = { from: '2026-01-01', to: '2026-12-31' }

function input(partial: Partial<LedgerInput>): LedgerInput {
  return { projects: [], expenses: [], incomes: [], campaigns: [], ...partial }
}

function sumBy(entries: readonly LedgerEntry[], projectId: string | null): number {
  return entries.filter((e) => e.projectId === projectId).reduce((a, e) => a + e.eurCents, 0)
}

const A = project('a', '2026-01-01')
const B = project('b', '2026-01-01')
const C = project('c', '2026-01-01')

describe('buildLedger: acceptance reference scenario (section 1)', () => {
  // 100 EUR licence on 3 projects, USD expense with snapshot, yearly subscription,
  // payment to a person split 60/40 on 2 projects.
  const ledger = buildLedger(
    input({
      projects: [A, B, C],
      expenses: [
        oneTimeExpense('licence', '2026-03-10', { cents: 10_000 }, equal('a', 'b', 'c'), {
          category: 'softwareLicense'
        }),
        oneTimeExpense(
          'usd',
          '2026-03-15',
          { cents: 1000, currency: 'USD', rateToEur: '0.92' },
          ALL
        ),
        recurringExpense(
          'abo',
          { interval: 'yearly', startDate: '2026-02-01' },
          { cents: 12_000 },
          equal('a')
        ),
        oneTimeExpense('pay', '2026-04-01', { cents: 5000 }, percent(['a', 6000], ['b', 4000]), {
          category: 'staff',
          personId: 'person-1'
        })
      ]
    }),
    YEAR_2026
  )

  it('produces exact per-project values', () => {
    expect(ledger.errors).toEqual([])
    expect(sumBy(ledger.entries, 'a')).toBe(3334 + 307 + 12_000 + 3000)
    expect(sumBy(ledger.entries, 'b')).toBe(3333 + 307 + 2000)
    expect(sumBy(ledger.entries, 'c')).toBe(3333 + 306)
    expect(sumBy(ledger.entries, null)).toBe(0)
  })

  it('splits the licence 33.34 / 33.33 / 33.33 and the USD booking from 9.20 EUR', () => {
    const licence = ledger.entries.filter((e) => e.sourceId === 'licence')
    expect(licence.map((e) => [e.projectId, e.eurCents])).toEqual([
      ['a', 3334],
      ['b', 3333],
      ['c', 3333]
    ])
    const usd = ledger.entries.filter((e) => e.sourceId === 'usd')
    expect(usd.map((e) => e.eurCents)).toEqual([307, 307, 306])
    expect(usd[0].original).toEqual({ cents: 1000, currency: 'USD' })
  })

  it('keeps person and category on the entries', () => {
    const pay = ledger.entries.filter((e) => e.sourceId === 'pay')
    expect(pay).toEqual([
      expect.objectContaining({
        projectId: 'a',
        eurCents: 3000,
        personId: 'person-1',
        category: 'staff'
      }),
      expect.objectContaining({
        projectId: 'b',
        eurCents: 2000,
        personId: 'person-1',
        category: 'staff'
      })
    ])
  })

  it('is deterministic', () => {
    const again = buildLedger(
      input({
        projects: [A, B, C],
        expenses: [
          oneTimeExpense('licence', '2026-03-10', { cents: 10_000 }, equal('a', 'b', 'c'), {
            category: 'softwareLicense'
          }),
          oneTimeExpense(
            'usd',
            '2026-03-15',
            { cents: 1000, currency: 'USD', rateToEur: '0.92' },
            ALL
          ),
          recurringExpense(
            'abo',
            { interval: 'yearly', startDate: '2026-02-01' },
            { cents: 12_000 },
            equal('a')
          ),
          oneTimeExpense('pay', '2026-04-01', { cents: 5000 }, percent(['a', 6000], ['b', 4000]), {
            category: 'staff',
            personId: 'person-1'
          })
        ]
      }),
      YEAR_2026
    )
    expect(again).toEqual(ledger)
  })
})

describe('buildLedger: recurring items', () => {
  it('books monthly on the 31st with month-end clamping and price change', () => {
    const e = recurringExpense(
      'm',
      {
        interval: 'monthly',
        startDate: '2026-01-31',
        endDate: '2026-04-30',
        priceChanges: [{ fromDate: '2026-03-31', cents: 700 }]
      },
      { cents: 500 },
      equal('a'),
      { serviceId: 'svc-1' }
    )
    const { entries } = buildLedger(input({ projects: [A], expenses: [e] }), YEAR_2026)
    expect(entries.map((x) => [x.date, x.eurCents])).toEqual([
      ['2026-01-31', 500],
      ['2026-02-28', 500],
      ['2026-03-31', 700],
      ['2026-04-30', 700]
    ])
    expect(entries[0]).toMatchObject({
      serviceId: 'svc-1',
      category: 'hosting',
      original: { cents: 500, currency: 'EUR' }
    })
    expect(entries[2].original).toEqual({ cents: 700, currency: 'EUR' })
  })

  it('only books occurrences inside the range', () => {
    const e = recurringExpense(
      'w',
      { interval: 'weekly', startDate: '2025-12-01' },
      { cents: 100 },
      ALL
    )
    const { entries } = buildLedger(input({ projects: [A], expenses: [e] }), {
      from: '2026-01-01',
      to: '2026-01-31'
    })
    expect(entries.map((x) => x.date)).toEqual([
      '2026-01-05',
      '2026-01-12',
      '2026-01-19',
      '2026-01-26'
    ])
  })

  it('books recurring income to its project', () => {
    const inc = recurringIncome(
      'i',
      { interval: 'monthly', startDate: '2026-11-15' },
      { cents: 999 },
      'a'
    )
    const { entries } = buildLedger(input({ projects: [A], incomes: [inc] }), YEAR_2026)
    expect(entries).toEqual([
      expect.objectContaining({
        date: '2026-11-15',
        kind: 'income',
        projectId: 'a',
        eurCents: 999,
        category: 'subscription'
      }),
      expect.objectContaining({ date: '2026-12-15', kind: 'income', projectId: 'a', eurCents: 999 })
    ])
  })
})

describe('buildLedger: activity on the booking day (PE-06, PE-50)', () => {
  const ended = project('b', '2026-01-01', '2026-03-31')

  it('discontinued project gets no "all" shares after its end date', () => {
    const e = recurringExpense(
      'm',
      { interval: 'monthly', startDate: '2026-03-01', endDate: '2026-04-30' },
      { cents: 1001 },
      ALL
    )
    const { entries } = buildLedger(input({ projects: [A, ended], expenses: [e] }), YEAR_2026)
    expect(entries.map((x) => [x.date, x.projectId, x.eurCents])).toEqual([
      ['2026-03-01', 'a', 501],
      ['2026-03-01', 'b', 500],
      ['2026-04-01', 'a', 1001]
    ])
  })

  it('end date is inclusive', () => {
    const e = oneTimeExpense('x', '2026-03-31', { cents: 2 }, ALL)
    const { entries } = buildLedger(input({ projects: [A, ended], expenses: [e] }), YEAR_2026)
    expect(entries.map((x) => x.projectId)).toEqual(['a', 'b'])
  })

  it('selected inactive projects are dropped, percent ratio of the rest is kept', () => {
    const c = project('c', '2026-01-01')
    const e = oneTimeExpense(
      'x',
      '2026-05-01',
      { cents: 1000 },
      percent(['a', 2000], ['b', 5000], ['c', 3000])
    )
    const { entries } = buildLedger(input({ projects: [A, ended, c], expenses: [e] }), YEAR_2026)
    expect(entries.map((x) => [x.projectId, x.eurCents])).toEqual([
      ['a', 400],
      ['c', 600]
    ])
  })

  it('project that has not started yet gets nothing', () => {
    const later = project('l', '2026-06-01')
    const e = oneTimeExpense('x', '2026-05-31', { cents: 300 }, ALL)
    const { entries } = buildLedger(input({ projects: [A, later], expenses: [e] }), YEAR_2026)
    expect(entries.map((x) => [x.projectId, x.eurCents])).toEqual([['a', 300]])
  })

  it('no active project -> one unallocated entry with the full amount', () => {
    const e = oneTimeExpense('x', '2026-05-01', { cents: 1234 }, equal('b'))
    const { entries } = buildLedger(input({ projects: [ended], expenses: [e] }), YEAR_2026)
    expect(entries).toEqual([
      expect.objectContaining({ projectId: null, unallocated: true, eurCents: 1234 })
    ])
  })

  it('no projects at all and unknown selected ids -> unallocated', () => {
    const e1 = oneTimeExpense('x', '2026-05-01', { cents: 10 }, ALL)
    const e2 = oneTimeExpense('y', '2026-05-01', { cents: 20 }, equal('zzz'))
    const { entries } = buildLedger(input({ expenses: [e1, e2] }), YEAR_2026)
    expect(entries.every((x) => x.projectId === null && x.unallocated === true)).toBe(true)
    expect(sumBy(entries, null)).toBe(30)
  })

  it('zero-weight shares are dropped', () => {
    const e = oneTimeExpense('x', '2026-05-01', { cents: 10 }, percent(['a', 10_000], ['b', 0]))
    const { entries } = buildLedger(input({ projects: [A, B], expenses: [e] }), YEAR_2026)
    expect(entries.map((x) => x.projectId)).toEqual(['a'])
  })

  it('allocated entries carry no unallocated flag', () => {
    const e = oneTimeExpense('x', '2026-05-01', { cents: 10 }, ALL)
    const { entries } = buildLedger(input({ projects: [A], expenses: [e] }), YEAR_2026)
    expect('unallocated' in entries[0]).toBe(false)
    expect('personId' in entries[0]).toBe(false)
  })
})

describe('buildLedger: incomes and campaigns', () => {
  it('income on an unknown project is unallocated, otherwise on its project regardless of activity', () => {
    const ended = project('b', '2026-01-01', '2026-01-31')
    const i1 = oneTimeIncome('i1', '2026-06-01', { cents: 500 }, 'b')
    const i2 = oneTimeIncome('i2', '2026-06-01', { cents: 700 }, 'gone')
    const { entries } = buildLedger(input({ projects: [ended], incomes: [i1, i2] }), YEAR_2026)
    expect(entries.map((x) => [x.projectId, x.eurCents, x.unallocated])).toEqual([
      ['b', 500, undefined],
      [null, 700, true]
    ])
  })

  it('campaign counts once on its start date as advertising (PE-49)', () => {
    const c = campaign(
      'k',
      '2026-02-10',
      '2026-03-10',
      { cents: 1000, currency: 'USD', rateToEur: '0.9' },
      equal('a', 'b')
    )
    const outside = campaign('o', '2025-12-31', '2026-01-10', { cents: 999 }, ALL)
    const { entries } = buildLedger(input({ projects: [A, B], campaigns: [c, outside] }), YEAR_2026)
    expect(entries).toEqual([
      expect.objectContaining({
        date: '2026-02-10',
        kind: 'expense',
        category: 'advertising',
        sourceType: 'campaign',
        sourceId: 'k',
        projectId: 'a',
        eurCents: 450
      }),
      expect.objectContaining({
        date: '2026-02-10',
        projectId: 'b',
        eurCents: 450,
        original: { cents: 1000, currency: 'USD' }
      })
    ])
  })

  it('one-time items outside the range are ignored', () => {
    const e = oneTimeExpense('x', '2027-01-01', { cents: 10 }, ALL)
    const i = oneTimeIncome('i', '2025-12-31', { cents: 10 }, 'a')
    const r = buildLedger(input({ projects: [A], expenses: [e], incomes: [i] }), YEAR_2026)
    expect(r).toEqual({ entries: [], errors: [] })
  })

  it('project without bookings simply has no entries', () => {
    const e = oneTimeExpense('x', '2026-02-01', { cents: 10 }, equal('a'))
    const { entries } = buildLedger(input({ projects: [A, B], expenses: [e] }), YEAR_2026)
    expect(sumBy(entries, 'b')).toBe(0)
  })
})

describe('buildLedger: ordering, errors, range', () => {
  it('sorts by date, stable in input order (expenses, incomes, campaigns)', () => {
    const r = buildLedger(
      input({
        projects: [A],
        expenses: [
          oneTimeExpense('e2', '2026-02-02', { cents: 1 }, ALL),
          oneTimeExpense('e1', '2026-02-01', { cents: 1 }, ALL)
        ],
        incomes: [oneTimeIncome('i1', '2026-02-01', { cents: 1 }, 'a')],
        campaigns: [campaign('c1', '2026-02-01', '2026-02-05', { cents: 1 }, ALL)]
      }),
      YEAR_2026
    )
    expect(r.entries.map((x) => x.sourceId)).toEqual(['e1', 'i1', 'c1', 'e2'])
  })

  it('conversion errors stay visible and produce no entries (never silently 0 or 1)', () => {
    const bad = {
      ...oneTimeExpense('bad', '2026-03-02', { cents: 100, currency: 'USD' }, ALL),
      rateToEur: 'abc'
    } as Expense
    const huge = oneTimeIncome(
      'huge',
      '2026-03-01',
      { cents: Number.MAX_SAFE_INTEGER, currency: 'JPY', rateToEur: '2' },
      'a'
    )
    const ok = oneTimeExpense('ok', '2026-03-03', { cents: 100 }, ALL)
    const r = buildLedger(input({ projects: [A], expenses: [bad, ok], incomes: [huge] }), YEAR_2026)
    expect(r.entries.map((x) => x.sourceId)).toEqual(['ok'])
    expect(r.errors).toEqual([
      {
        date: '2026-03-01',
        sourceType: 'income',
        sourceId: 'huge',
        original: { cents: Number.MAX_SAFE_INTEGER, currency: 'JPY' },
        error: 'overflow'
      },
      {
        date: '2026-03-02',
        sourceType: 'expense',
        sourceId: 'bad',
        original: { cents: 100, currency: 'USD' },
        error: 'invalidRate'
      }
    ])
  })

  it('throws on an invalid or reversed range', () => {
    expect(() => buildLedger(input({}), { from: '2026-02-30', to: '2026-03-01' })).toThrow(
      RangeError
    )
    expect(() => buildLedger(input({}), { from: '2026-01-01', to: 'x' })).toThrow(RangeError)
    expect(() => buildLedger(input({}), { from: '2026-03-01', to: '2026-02-01' })).toThrow(
      RangeError
    )
  })
})

describe('helpers', () => {
  it('activeShares returns [] when nothing is resolvable', () => {
    expect(activeShares(equal('x'), [A], '2026-01-01')).toEqual([])
  })
  it('splitOnto without shares yields one unallocated part', () => {
    expect(splitOnto(5, [])).toEqual([{ projectId: null, cents: 5 }])
  })
  it('splitOnto rejects impossible input loudly', () => {
    expect(() => splitOnto(-1, [{ projectId: 'a', weight: 1 }])).toThrow(/invalidTotal/)
  })
})

describe('buildLedger: property tests (seeded)', () => {
  it('sum of all project shares equals the sum of all bookings in EUR', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rand = rng(seed)
      const int = (n: number): number => Math.floor(rand() * n)
      const projects = Array.from({ length: 1 + int(5) }, (_, i) =>
        project(
          `p${String(i)}`,
          `2026-0${String(1 + int(6))}-01`,
          rand() < 0.3 ? `2026-0${String(6 + int(4))}-15` : undefined
        )
      )
      const pick = (): string => projects[int(projects.length)].id
      const allocation = (): Expense['allocation'] => {
        const r = rand()
        if (r < 0.4) return ALL
        if (r < 0.7) return equal(...new Set([pick(), pick()]))
        const ids = [...new Set([pick(), pick(), pick()])]
        const bp = ids.map(() => 1 + int(1000))
        const sum = bp.reduce((a, b) => a + b, 0)
        const scaled = bp.map((b) => Math.floor((b * 10_000) / sum))
        scaled[0] += 10_000 - scaled.reduce((a, b) => a + b, 0)
        return percent(...ids.map((id, i): [string, number] => [id, scaled[i]]))
      }
      const money = (): { cents: number; currency: string; rateToEur: string } =>
        rand() < 0.5
          ? { cents: int(1_000_000), currency: 'EUR', rateToEur: '1' }
          : {
              cents: int(1_000_000),
              currency: 'USD',
              rateToEur: `0.${String(1 + int(9999)).padStart(4, '0')}`
            }
      const day = (): string =>
        `2026-${String(1 + int(12)).padStart(2, '0')}-${String(1 + int(28)).padStart(2, '0')}`
      const expenses: Expense[] = Array.from({ length: int(8) }, (_, i) =>
        rand() < 0.5
          ? oneTimeExpense(`e${String(i)}`, day(), money(), allocation())
          : recurringExpense(
              `e${String(i)}`,
              {
                interval: (['daily', 'weekly', 'monthly', 'yearly'] as const)[int(4)],
                startDate: day()
              },
              money(),
              allocation()
            )
      )
      const incomes: Income[] = Array.from({ length: int(4) }, (_, i) =>
        oneTimeIncome(`i${String(i)}`, day(), money(), pick())
      )
      const campaigns: Campaign[] = Array.from({ length: int(3) }, (_, i) => {
        const d = day()
        return campaign(`c${String(i)}`, d, d, money(), allocation())
      })
      const ledger = buildLedger({ projects, expenses, incomes, campaigns }, YEAR_2026)
      expect(ledger.errors).toEqual([])

      // Expected: every booking converted once, independently of the split.
      const bookings = new Map<string, number>()
      for (const e of ledger.entries) {
        const key = `${e.sourceId}|${e.date}`
        if (!bookings.has(key)) {
          const src = [...expenses, ...incomes].find((x) => x.id === e.sourceId)
          const c = campaigns.find((x) => x.id === e.sourceId)
          const rate = src?.rateToEur ?? c?.rateToEur ?? ''
          const eur = toEur(e.original, rate)
          if (!eur.ok) throw new Error(eur.error)
          bookings.set(key, eur.value.cents)
        }
      }
      const perBooking = new Map<string, number>()
      for (const e of ledger.entries) {
        const key = `${e.sourceId}|${e.date}`
        perBooking.set(key, (perBooking.get(key) ?? 0) + e.eurCents)
        expect(Number.isSafeInteger(e.eurCents) && e.eurCents >= 0).toBe(true)
      }
      expect(perBooking).toEqual(bookings)
      const total = [...bookings.values()].reduce((a, b) => a + b, 0)
      const shares = [...projects.map((p) => p.id), null].reduce(
        (a, id) => a + sumBy(ledger.entries, id),
        0
      )
      expect(shares).toBe(total)
      // No entry goes to a project that is inactive on that day.
      for (const e of ledger.entries) {
        if (e.kind === 'income' || e.projectId === null) continue
        const p = projects.find((x) => x.id === e.projectId)
        expect(
          p !== undefined &&
            p.startDate <= e.date &&
            (p.endDate === undefined || e.date <= p.endDate)
        ).toBe(true)
      }
    }
  })
})
