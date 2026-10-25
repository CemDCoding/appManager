import { describe, expect, it } from 'vitest'
import {
  COLLECTIONS,
  SCHEMA_VERSION,
  emptyCollectionFile,
  parseCollectionFile
} from '../collections'
import { PdfExportInputSchema, BackupNameSchema, OpenExternalInputSchema, ok, fail } from '../ipc'
import { MoneySchema, RateSchema } from '../money'
import {
  AllocationSchema,
  CampaignSchema,
  ExchangeRateSchema,
  ExpenseSchema,
  GoalSchema,
  IncomeSchema,
  PersonSchema,
  ProjectSchema,
  RecurrenceSchema,
  ServiceSchema,
  SettingsSchema,
  UserMetricSchema,
  DateStringSchema
} from './index'

const U1 = '11111111-1111-4111-8111-111111111111'
const U2 = '22222222-2222-4222-8222-222222222222'
const U3 = '33333333-3333-4333-8333-333333333333'
const base = {
  id: U1,
  ownerId: 'local' as const,
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z'
}
const allocAll = { mode: 'all' as const, split: 'equal' as const, shares: [] }
const eur = { cents: 1999, currency: 'EUR' }

describe('money', () => {
  it('accepts valid money and rejects negative, fractional, unsafe, bad currency', () => {
    expect(MoneySchema.safeParse(eur).success).toBe(true)
    expect(MoneySchema.safeParse({ cents: 0, currency: 'USD' }).success).toBe(true)
    expect(MoneySchema.safeParse({ cents: -1, currency: 'EUR' }).success).toBe(false)
    expect(MoneySchema.safeParse({ cents: 1.5, currency: 'EUR' }).success).toBe(false)
    expect(MoneySchema.safeParse({ cents: 2 ** 53, currency: 'EUR' }).success).toBe(false)
    expect(MoneySchema.safeParse({ cents: Number.MAX_SAFE_INTEGER, currency: 'EUR' }).success).toBe(
      true
    )
    expect(MoneySchema.safeParse({ cents: 1, currency: 'eur' }).success).toBe(false)
    expect(MoneySchema.safeParse({ cents: 1, currency: 'EURO' }).success).toBe(false)
  })
  it('validates rates as decimal strings > 0', () => {
    for (const r of ['1', '0.92', '1.0850000001', '123456789.5'])
      expect(RateSchema.safeParse(r).success).toBe(true)
    for (const r of ['0', '0.0', '-1', '1,5', '.5', '01', '1.', 'abc', '1.12345678901'])
      expect(RateSchema.safeParse(r).success).toBe(false)
    expect(RateSchema.safeParse(1.5).success).toBe(false)
  })
})

describe('date', () => {
  it('validates real calendar dates', () => {
    expect(DateStringSchema.safeParse('2024-02-29').success).toBe(true)
    expect(DateStringSchema.safeParse('2025-02-29').success).toBe(false)
    expect(DateStringSchema.safeParse('2025-13-01').success).toBe(false)
    expect(DateStringSchema.safeParse('2025-1-1').success).toBe(false)
    expect(DateStringSchema.safeParse('2025-01-01T00:00:00Z').success).toBe(false)
  })
})

describe('allocation', () => {
  it('accepts all/equal', () => expect(AllocationSchema.safeParse(allocAll).success).toBe(true))
  it('accepts percent summing to 10000', () => {
    const a = {
      mode: 'selected',
      split: 'percent',
      shares: [
        { projectId: U1, percentBasisPoints: 3333 },
        { projectId: U2, percentBasisPoints: 6667 }
      ]
    }
    expect(AllocationSchema.safeParse(a).success).toBe(true)
  })
  it('rejects percent sum != 10000', () => {
    const a = {
      mode: 'selected',
      split: 'percent',
      shares: [
        { projectId: U1, percentBasisPoints: 5000 },
        { projectId: U2, percentBasisPoints: 4999 }
      ]
    }
    expect(AllocationSchema.safeParse(a).success).toBe(false)
  })
  it('rejects bad shapes', () => {
    expect(AllocationSchema.safeParse({ mode: 'all', split: 'percent', shares: [] }).success).toBe(
      false
    )
    expect(
      AllocationSchema.safeParse({
        mode: 'all',
        split: 'equal',
        shares: [{ projectId: U1, percentBasisPoints: 0 }]
      }).success
    ).toBe(false)
    expect(
      AllocationSchema.safeParse({ mode: 'selected', split: 'equal', shares: [] }).success
    ).toBe(false)
    expect(
      AllocationSchema.safeParse({
        mode: 'selected',
        split: 'equal',
        shares: [
          { projectId: U1, percentBasisPoints: 0 },
          { projectId: U1, percentBasisPoints: 0 }
        ]
      }).success
    ).toBe(false)
    expect(
      AllocationSchema.safeParse({
        mode: 'selected',
        split: 'percent',
        shares: [{ projectId: U1, percentBasisPoints: 10001 }]
      }).success
    ).toBe(false)
  })
  it('accepts selected/equal', () => {
    expect(
      AllocationSchema.safeParse({
        mode: 'selected',
        split: 'equal',
        shares: [
          { projectId: U1, percentBasisPoints: 0 },
          { projectId: U2, percentBasisPoints: 0 }
        ]
      }).success
    ).toBe(true)
  })
})

describe('recurrence', () => {
  const r = { interval: 'monthly', startDate: '2026-01-31', priceChanges: [] }
  it('validates', () => {
    expect(RecurrenceSchema.safeParse(r).success).toBe(true)
    expect(RecurrenceSchema.safeParse({ ...r, endDate: '2026-01-31' }).success).toBe(true)
    expect(RecurrenceSchema.safeParse({ ...r, endDate: '2026-01-30' }).success).toBe(false)
    expect(RecurrenceSchema.safeParse({ ...r, interval: 'hourly' }).success).toBe(false)
    expect(
      RecurrenceSchema.safeParse({ ...r, priceChanges: [{ fromDate: '2026-03-01', cents: 500 }] })
        .success
    ).toBe(true)
    expect(
      RecurrenceSchema.safeParse({ ...r, priceChanges: [{ fromDate: '2025-12-31', cents: 500 }] })
        .success
    ).toBe(false)
    expect(
      RecurrenceSchema.safeParse({ ...r, priceChanges: [{ fromDate: '2026-03-01', cents: -5 }] })
        .success
    ).toBe(false)
  })
})

describe('project', () => {
  const p = {
    ...base,
    name: 'App',
    description: '',
    platforms: ['mobile', 'web'],
    phase: 'live',
    startDate: '2026-01-01',
    links: [{ label: 'Store', url: 'https://example.com/app' }],
    archived: false
  }
  it('validates', () => {
    expect(ProjectSchema.safeParse(p).success).toBe(true)
    expect(ProjectSchema.safeParse({ ...p, name: '' }).success).toBe(false)
    expect(ProjectSchema.safeParse({ ...p, name: 'x'.repeat(200) }).success).toBe(true)
    expect(ProjectSchema.safeParse({ ...p, name: 'x'.repeat(201) }).success).toBe(false)
    expect(ProjectSchema.safeParse({ ...p, description: 'x'.repeat(2001) }).success).toBe(false)
    expect(ProjectSchema.safeParse({ ...p, phase: 'foo' }).success).toBe(false)
    expect(ProjectSchema.safeParse({ ...p, endDate: '2025-12-31' }).success).toBe(false)
    expect(ProjectSchema.safeParse({ ...p, startDate: '2026-02-30' }).success).toBe(false)
    expect(ProjectSchema.safeParse({ ...p, ownerId: 'other' }).success).toBe(false)
    expect(ProjectSchema.safeParse({ ...p, id: 'nope' }).success).toBe(false)
    expect(
      ProjectSchema.safeParse({ ...p, links: [{ label: 'x', url: 'javascript:alert(1)' }] }).success
    ).toBe(false)
  })
})

describe('service', () => {
  const s = {
    ...base,
    provider: 'Vercel',
    purpose: 'Hosting',
    plan: 'Pro',
    note: '',
    allocation: allocAll
  }
  it('validates', () => {
    expect(ServiceSchema.safeParse(s).success).toBe(true)
    expect(ServiceSchema.safeParse({ ...s, url: 'https://vercel.com' }).success).toBe(true)
    expect(ServiceSchema.safeParse({ ...s, url: 'file:///etc/passwd' }).success).toBe(false)
    expect(ServiceSchema.safeParse({ ...s, note: 'x'.repeat(5001) }).success).toBe(false)
    expect(ServiceSchema.safeParse({ ...s, provider: '' }).success).toBe(false)
  })
})

describe('person', () => {
  const p = { ...base, name: 'AB', role: 'Dev', status: 'active', note: '' }
  it('validates', () => {
    expect(PersonSchema.safeParse(p).success).toBe(true)
    expect(PersonSchema.safeParse({ ...p, status: 'gone' }).success).toBe(false)
    expect(PersonSchema.safeParse({ ...p, name: ' ' }).success).toBe(false)
  })
  it('has no personal extra fields', () => {
    expect(Object.keys(PersonSchema.shape).sort()).toEqual(
      ['createdAt', 'id', 'name', 'note', 'ownerId', 'role', 'status', 'updatedAt'].sort()
    )
  })
})

describe('expense', () => {
  const one = {
    ...base,
    kind: 'oneTime',
    date: '2026-03-01',
    category: 'hosting',
    amount: eur,
    rateToEur: '1',
    allocation: allocAll,
    description: 'x'
  }
  const rest = { ...one, date: undefined }
  const rec = {
    ...rest,
    kind: 'recurring',
    recurrence: { interval: 'monthly', startDate: '2026-01-01', priceChanges: [] }
  }
  it('validates one-time and recurring', () => {
    expect(ExpenseSchema.safeParse(one).success).toBe(true)
    expect(ExpenseSchema.safeParse(rec).success).toBe(true)
    expect(ExpenseSchema.safeParse({ ...one, serviceId: U2, personId: U3 }).success).toBe(true)
  })
  it('rejects invalid', () => {
    expect(
      ExpenseSchema.safeParse({ ...one, amount: { cents: -1, currency: 'EUR' } }).success
    ).toBe(false)
    expect(ExpenseSchema.safeParse({ ...one, date: '2026-02-30' }).success).toBe(false)
    expect(ExpenseSchema.safeParse(rest).success).toBe(false)
    expect(ExpenseSchema.safeParse({ ...one, kind: 'recurring' }).success).toBe(false)
    expect(ExpenseSchema.safeParse({ ...one, rateToEur: '0.9' }).success).toBe(false)
    expect(
      ExpenseSchema.safeParse({
        ...one,
        amount: { cents: 100, currency: 'USD' },
        rateToEur: '0.92'
      }).success
    ).toBe(true)
    expect(ExpenseSchema.safeParse({ ...one, rateToEur: 1 }).success).toBe(false)
    expect(
      ExpenseSchema.safeParse({
        ...one,
        allocation: {
          mode: 'selected',
          split: 'percent',
          shares: [{ projectId: U1, percentBasisPoints: 9999 }]
        }
      }).success
    ).toBe(false)
    expect(ExpenseSchema.safeParse({ ...one, description: 'x'.repeat(2001) }).success).toBe(false)
  })
})

describe('income', () => {
  const inc = {
    ...base,
    kind: 'oneTime',
    date: '2026-03-01',
    category: 'steam',
    amount: { cents: 500, currency: 'USD' },
    rateToEur: '0.92',
    projectId: U2,
    description: ''
  }
  it('validates', () => {
    expect(IncomeSchema.safeParse(inc).success).toBe(true)
    expect(IncomeSchema.safeParse({ ...inc, projectId: undefined }).success).toBe(false)
    expect(IncomeSchema.safeParse({ ...inc, projectId: 'x' }).success).toBe(false)
    expect(IncomeSchema.safeParse({ ...inc, amount: { cents: -5, currency: 'USD' } }).success).toBe(
      false
    )
    expect(IncomeSchema.safeParse({ ...inc, amount: eur, rateToEur: '2' }).success).toBe(false)
    expect(IncomeSchema.safeParse({ ...inc, date: undefined, kind: 'recurring' }).success).toBe(
      false
    )
  })
})

describe('campaign', () => {
  const c = {
    ...base,
    name: 'Launch',
    platform: 'google',
    format: 'search',
    startDate: '2026-02-01',
    endDate: '2026-02-28',
    cost: eur,
    rateToEur: '1',
    allocation: allocAll,
    impressions: 1000,
    clicks: 50,
    usersGained: 5,
    rating: 5,
    note: ''
  }
  it('validates boundaries', () => {
    expect(CampaignSchema.safeParse(c).success).toBe(true)
    expect(CampaignSchema.safeParse({ ...c, rating: 0 }).success).toBe(true)
    expect(CampaignSchema.safeParse({ ...c, rating: 6 }).success).toBe(false)
    expect(CampaignSchema.safeParse({ ...c, rating: -1 }).success).toBe(false)
    expect(CampaignSchema.safeParse({ ...c, rating: 2.5 }).success).toBe(false)
    expect(CampaignSchema.safeParse({ ...c, clicks: -1 }).success).toBe(false)
    expect(CampaignSchema.safeParse({ ...c, impressions: 1.5 }).success).toBe(false)
    expect(CampaignSchema.safeParse({ ...c, endDate: '2026-01-31' }).success).toBe(false)
    expect(CampaignSchema.safeParse({ ...c, endDate: '2026-02-01' }).success).toBe(true)
    expect(CampaignSchema.safeParse({ ...c, cost: { cents: -1, currency: 'EUR' } }).success).toBe(
      false
    )
    expect(CampaignSchema.safeParse({ ...c, rateToEur: '3' }).success).toBe(false)
  })
})

describe('exchangeRate', () => {
  const r = { ...base, currency: 'USD', rate: '0.92', enteredOn: '2026-01-01' }
  it('validates', () => {
    expect(ExchangeRateSchema.safeParse(r).success).toBe(true)
    expect(ExchangeRateSchema.safeParse({ ...r, currency: 'EUR' }).success).toBe(false)
    expect(ExchangeRateSchema.safeParse({ ...r, rate: '0' }).success).toBe(false)
    expect(ExchangeRateSchema.safeParse({ ...r, enteredOn: '2026-00-01' }).success).toBe(false)
  })
})

describe('goal', () => {
  const g = {
    ...base,
    projectId: U2,
    kind: 'revenue',
    title: 'Revenue',
    targetValue: 100000,
    fromDate: '2026-01-01',
    dueDate: '2026-12-31',
    done: false
  }
  it('validates', () => {
    expect(GoalSchema.safeParse(g).success).toBe(true)
    expect(GoalSchema.safeParse({ ...g, projectId: null }).success).toBe(true)
    expect(GoalSchema.safeParse({ ...g, targetValue: undefined }).success).toBe(false)
    expect(GoalSchema.safeParse({ ...g, targetValue: -1 }).success).toBe(false)
    expect(GoalSchema.safeParse({ ...g, done: true }).success).toBe(false)
    expect(GoalSchema.safeParse({ ...g, dueDate: '2025-12-31' }).success).toBe(false)
    expect(
      GoalSchema.safeParse({ ...g, kind: 'breakEven', targetValue: undefined, fromDate: undefined })
        .success
    ).toBe(true)
    expect(GoalSchema.safeParse({ ...g, kind: 'breakEven' }).success).toBe(false)
    expect(
      GoalSchema.safeParse({ ...g, kind: 'free', targetValue: undefined, done: true }).success
    ).toBe(true)
    expect(GoalSchema.safeParse({ ...g, kind: 'other' }).success).toBe(false)
  })
})

describe('userMetric', () => {
  const m = {
    ...base,
    projectId: U2,
    date: '2026-03-01',
    usersTotal: 100,
    usersActive: 50,
    usersPaying: 5
  }
  it('validates', () => {
    expect(UserMetricSchema.safeParse(m).success).toBe(true)
    expect(
      UserMetricSchema.safeParse({ ...m, perPlatform: [{ platform: 'mobile', users: 60 }] }).success
    ).toBe(true)
    expect(UserMetricSchema.safeParse({ ...m, usersActive: 101 }).success).toBe(false)
    expect(UserMetricSchema.safeParse({ ...m, usersPaying: 101 }).success).toBe(false)
    expect(UserMetricSchema.safeParse({ ...m, usersTotal: -1 }).success).toBe(false)
    expect(UserMetricSchema.safeParse({ ...m, date: 'x' }).success).toBe(false)
  })
})

describe('settings', () => {
  const list = { custom: [{ key: 'myCat', label: 'My', hidden: false }], hiddenDefaults: ['other'] }
  const empty = { custom: [], hiddenDefaults: [] }
  const s = {
    ...base,
    displayCurrency: 'EUR',
    expenseCategories: list,
    incomeCategories: empty,
    projectPlatforms: empty,
    campaignPlatforms: empty,
    campaignFormats: empty
  }
  it('validates', () => {
    expect(SettingsSchema.safeParse(s).success).toBe(true)
    expect(SettingsSchema.safeParse({ ...s, displayCurrency: 'eur' }).success).toBe(false)
    expect(
      SettingsSchema.safeParse({
        ...s,
        expenseCategories: { custom: [list.custom[0], list.custom[0]], hiddenDefaults: [] }
      }).success
    ).toBe(false)
    expect(
      SettingsSchema.safeParse({
        ...s,
        expenseCategories: {
          custom: [{ key: 'a b', label: 'x', hidden: false }],
          hiddenDefaults: []
        }
      }).success
    ).toBe(false)
    expect('dataDir' in SettingsSchema.shape).toBe(false)
  })
})

describe('collections', () => {
  it('maps every entity to a file', () => {
    expect(Object.values(COLLECTIONS).map((c) => c.file)).toContain('projects.json')
    expect(new Set(Object.values(COLLECTIONS).map((c) => c.file)).size).toBe(10)
  })
  it('parses collection files', () => {
    const empty = emptyCollectionFile()
    expect(empty).toEqual({ schemaVersion: SCHEMA_VERSION, items: [] })
    expect(parseCollectionFile('projects', empty).ok).toBe(true)
    const bad = parseCollectionFile('projects', { schemaVersion: 1, items: [{ id: 'x' }] })
    expect(bad.ok).toBe(false)
    const ver = parseCollectionFile('projects', { schemaVersion: 2, items: [] })
    expect(!ver.ok && ver.reason).toBe('unsupportedVersion')
    const no = parseCollectionFile('persons', [])
    expect(!no.ok && no.reason).toBe('notAnObject')
    const person = { ...base, name: 'AB', role: '', status: 'active', note: '' }
    const good = parseCollectionFile('persons', { schemaVersion: 1, items: [person] })
    expect(good.ok && good.file.items).toHaveLength(1)
  })
})

describe('ipc payloads', () => {
  const pdf = {
    scope: 'project',
    projectId: U1,
    period: { from: '2026-01-01', to: '2026-12-31' },
    language: 'de',
    displayCurrency: 'EUR'
  }
  it('validates pdf input', () => {
    expect(PdfExportInputSchema.safeParse(pdf).success).toBe(true)
    expect(PdfExportInputSchema.safeParse({ ...pdf, projectId: undefined }).success).toBe(false)
    expect(PdfExportInputSchema.safeParse({ ...pdf, scope: 'portfolio' }).success).toBe(false)
    expect(
      PdfExportInputSchema.safeParse({ ...pdf, scope: 'portfolio', projectId: undefined }).success
    ).toBe(true)
    expect(
      PdfExportInputSchema.safeParse({ ...pdf, period: { from: '2026-02-01', to: '2026-01-01' } })
        .success
    ).toBe(false)
    expect(PdfExportInputSchema.safeParse({ ...pdf, language: 'fr' }).success).toBe(false)
  })
  it('rejects paths and non-http urls', () => {
    expect(BackupNameSchema.safeParse('backup-2026-01-01').success).toBe(true)
    expect(BackupNameSchema.safeParse('../x').success).toBe(false)
    expect(BackupNameSchema.safeParse('a/b').success).toBe(false)
    expect(OpenExternalInputSchema.safeParse({ url: 'https://a.de' }).success).toBe(true)
    expect(OpenExternalInputSchema.safeParse({ url: 'ftp://a.de' }).success).toBe(false)
  })
  it('builds results', () => {
    expect(ok(1)).toEqual({ ok: true, data: 1 })
    expect(fail('IO', 'm')).toEqual({ ok: false, error: { code: 'IO', message: 'm' } })
  })
})
