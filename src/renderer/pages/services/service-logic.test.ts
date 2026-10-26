import { describe, expect, it } from 'vitest'
import { ExpenseSchema, type Expense } from '@shared/schemas/expense'
import type { Project } from '@shared/schemas/project'
import type { Service } from '@shared/schemas/service'
import {
  buildServiceExpense,
  categoryForPurpose,
  groupServices,
  serviceMonthlyCosts,
  validateServiceDraft,
  SERVICE_PURPOSES
} from './service-logic'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const S1 = '33333333-3333-4333-8333-333333333333'
const base = {
  ownerId: 'local' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
}
const all = { mode: 'all' as const, split: 'equal' as const, shares: [] }
const service = (id: string, provider: string, purpose: string): Service => ({
  ...base,
  id,
  provider,
  purpose,
  plan: '',
  note: '',
  allocation: all
})
const project = (id: string): Project =>
  ({ ...base, id, name: id, startDate: '2026-01-01' }) as unknown as Project

describe('categoryForPurpose', () => {
  it('maps every purpose to a category', () => {
    expect(SERVICE_PURPOSES.map(categoryForPurpose)).toEqual([
      'hosting',
      'hosting',
      'database',
      'hosting',
      'storageCdn',
      'domain',
      'other'
    ])
  })
  it('falls back to other for free text', () => {
    expect(categoryForPurpose('CI runner')).toBe('other')
  })
})

describe('groupServices', () => {
  it('groups by purpose in fixed order and drops empty groups', () => {
    const groups = groupServices([
      service(A, 'Supabase', 'database'),
      service(B, 'Vercel', 'frontend'),
      service(S1, 'Neon', 'unknown')
    ])
    expect(groups.map((g) => g.purpose)).toEqual(['frontend', 'database', 'other'])
  })
})

describe('validateServiceDraft', () => {
  const ok = { provider: ' Railway ', purpose: 'backend', plan: 'Pro', url: '', note: '' }
  it('trims and omits empty url', () => {
    expect(validateServiceDraft(ok)).toEqual({
      ok: true,
      value: { provider: 'Railway', purpose: 'backend', plan: 'Pro', note: '' }
    })
  })
  it('requires a provider', () => {
    expect(validateServiceDraft({ ...ok, provider: '  ' })).toEqual({
      ok: false,
      error: ['providerRequired']
    })
  })
  it('rejects non-http urls', () => {
    const r = validateServiceDraft({ ...ok, url: 'javascript:alert(1)' })
    expect(r).toEqual({ ok: false, error: ['invalidUrl'] })
    expect(validateServiceDraft({ ...ok, url: 'https://railway.app' }).ok).toBe(true)
  })
})

describe('buildServiceExpense', () => {
  const common = {
    serviceId: S1,
    category: 'hosting',
    amount: { cents: 2000, currency: 'EUR' },
    rateToEur: '1',
    allocation: all,
    description: ' Pro ',
    date: '2026-10-01',
    recurrence: { interval: 'monthly' as const, startDate: '2026-10-01', priceChanges: [] }
  }
  it('creates a valid one-time expense linked to the service', () => {
    const e = buildServiceExpense({ ...common, kind: 'oneTime' })
    expect(e).toMatchObject({ kind: 'oneTime', serviceId: S1, description: 'Pro' })
    expect(ExpenseSchema.safeParse({ ...base, id: A, ...e }).success).toBe(true)
  })
  it('creates a valid recurring expense without a date', () => {
    const e = buildServiceExpense({ ...common, kind: 'recurring' })
    expect(e).not.toHaveProperty('date')
    expect(ExpenseSchema.safeParse({ ...base, id: A, ...e }).success).toBe(true)
  })
})

describe('serviceMonthlyCosts', () => {
  it('splits a shared service onto both projects and ignores other expenses', () => {
    const s = service(S1, 'Railway', 'backend')
    const e = ExpenseSchema.parse({
      ...base,
      id: A,
      ...buildServiceExpense({
        serviceId: S1,
        category: 'hosting',
        amount: { cents: 1001, currency: 'EUR' },
        rateToEur: '1',
        allocation: all,
        description: '',
        kind: 'recurring',
        date: '',
        recurrence: { interval: 'monthly', startDate: '2026-01-01', priceChanges: [] }
      })
    })
    const other = { ...e, id: B, serviceId: undefined } as Expense
    const c = serviceMonthlyCosts([s], [e, other], [project(A), project(B)], '2026-10-26').get(S1)
    expect(c?.totalCents).toBe(1001)
    expect(c?.byProject.map((p) => p.cents)).toEqual([501, 500])
  })
})
