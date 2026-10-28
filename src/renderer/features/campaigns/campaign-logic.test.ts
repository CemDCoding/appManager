import { describe, expect, it } from 'vitest'
import { buildLedger } from '@core/ledger/ledger'
import { campaignKpis } from '@core/metrics/metrics'
import type { Campaign } from '@shared/schemas/campaign'
import type { Project } from '@shared/schemas/project'
import { setAllocationMode, setAllocationProjects } from '@/components/forms/allocation-logic'
import {
  campaignDraftFrom,
  campaignDraftToInput,
  emptyCampaignDraft,
  parseCount,
  projectCampaignShares,
  type CampaignDraft
} from './campaign-logic'

/* Invented test data only (R2). */
const P1 = '11111111-1111-4111-8111-111111111111'
const P2 = '22222222-2222-4222-8222-222222222222'
const TS = '2026-01-01T00:00:00.000Z'
const BASE = { ownerId: 'local' as const, createdAt: TS, updatedAt: TS }

function project(id: string): Project {
  return {
    ...BASE,
    id,
    name: `Test ${id.slice(0, 4)}`,
    description: '',
    platforms: [],
    phase: 'live',
    startDate: '2020-01-01',
    links: [],
    archived: false
  }
}

function draft(patch: Partial<CampaignDraft> = {}): CampaignDraft {
  const d = emptyCampaignDraft('2026-03-01')
  return {
    ...d,
    name: '  Spring push ',
    platform: 'google',
    format: 'banner',
    endDate: '2026-03-31',
    money: { ...d.money, amountText: '100' },
    impressions: '10000',
    clicks: '200',
    usersGained: '40',
    rating: 4,
    ...patch
  }
}

function asCampaign(d: CampaignDraft): Campaign {
  const r = campaignDraftToInput(d, 'de')
  if (!r.ok) throw new Error(r.error.join(','))
  return { ...BASE, id: '77777777-7777-4777-8777-777777777777', ...r.value }
}

describe('campaignDraftToInput', () => {
  it('maps a form draft to an entity input', () => {
    const r = campaignDraftToInput(draft(), 'de')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value).toMatchObject({
      name: 'Spring push',
      platform: 'google',
      cost: { cents: 10000, currency: 'EUR' },
      rateToEur: '1',
      clicks: 200,
      impressions: 10000,
      usersGained: 40,
      rating: 4,
      allocation: { mode: 'all' }
    })
  })

  it('treats empty counts as 0', () => {
    const r = campaignDraftToInput(draft({ impressions: '', clicks: '', usersGained: '' }), 'de')
    expect(r.ok && r.value.clicks).toBe(0)
  })

  it('reports all problems at once', () => {
    const r = campaignDraftToInput(
      draft({ name: ' ', platform: '', format: '', clicks: '-1', endDate: '2026-02-01' }),
      'de'
    )
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toEqual(
      expect.arrayContaining([
        'nameRequired',
        'platformRequired',
        'formatRequired',
        'invalidCount',
        'endBeforeStart'
      ])
    )
  })

  it('rejects a bad amount and blocks invalid allocation', () => {
    const d = draft()
    expect(campaignDraftToInput({ ...d, money: { ...d.money, amountText: 'x' } }, 'de').ok).toBe(
      false
    )
    const alloc = setAllocationMode(d.allocation, 'selected')
    const r = campaignDraftToInput({ ...d, allocation: alloc }, 'de')
    expect(!r.ok && r.error).toContain('allocationInvalid')
  })

  it('round-trips through campaignDraftFrom', () => {
    const c = asCampaign(draft())
    const again = campaignDraftToInput(campaignDraftFrom(c, 'de'), 'de')
    expect(again.ok && again.value).toMatchObject({ name: c.name, cost: c.cost, clicks: 200 })
  })

  it('parseCount accepts digits only', () => {
    expect(parseCount('12')).toBe(12)
    expect(parseCount('1.5')).toBeNull()
    expect(parseCount('abc')).toBeNull()
  })
})

describe('projectCampaignShares', () => {
  const projects = [project(P1), project(P2)]

  it('splits cost (ledger) and users (core) over the allocated projects', () => {
    const d = draft({ money: { ...draft().money, amountText: '100,01' }, usersGained: '5' })
    const c = asCampaign(d)
    const a = projectCampaignShares([c], projects, P1)
    const b = projectCampaignShares([c], projects, P2)
    expect(a[0]!.costEurCents! + b[0]!.costEurCents!).toBe(10001)
    expect(a[0]!.users + b[0]!.users).toBe(5)
  })

  it('skips campaigns that do not include the project', () => {
    const d = draft()
    const alloc = setAllocationProjects(setAllocationMode(d.allocation, 'selected'), [P1], 'de')
    const c = asCampaign({ ...d, allocation: alloc })
    expect(projectCampaignShares([c], projects, P2)).toEqual([])
    expect(projectCampaignShares([c], projects, P1)[0]!.costEurCents).toBe(10000)
  })

  it('cost appears only as advertising ledger entry, not additionally', () => {
    const c = asCampaign(draft())
    const ledger = buildLedger(
      { projects, expenses: [], incomes: [], campaigns: [c] },
      { from: '2026-03-01', to: '2026-03-31' }
    )
    expect(ledger.entries.every((e) => e.category === 'advertising')).toBe(true)
    const k = campaignKpis(c)
    expect(k.ok && k.value.costEurCents).toBe(10000)
  })
})
