/* Test-only factories with invented data (no real persons, PE-18). Not imported by app code. */
import type { Allocation, Recurrence } from '@shared/schemas/common'
import type { Project } from '@shared/schemas/project'
import type { Expense } from '@shared/schemas/expense'
import type { Income } from '@shared/schemas/income'
import type { Campaign } from '@shared/schemas/campaign'

const TS = '2026-01-01T00:00:00.000Z'
const base = { ownerId: 'local' as const, createdAt: TS, updatedAt: TS }

export function project(id: string, startDate: string, endDate?: string): Project {
  return {
    ...base,
    id,
    name: `Project ${id}`,
    description: '',
    platforms: [],
    phase: endDate === undefined ? 'live' : 'discontinued',
    startDate,
    ...(endDate !== undefined ? { endDate } : {}),
    links: [],
    archived: false
  }
}

export const ALL: Allocation = { mode: 'all', split: 'equal', shares: [] }

export function equal(...ids: string[]): Allocation {
  return {
    mode: 'selected',
    split: 'equal',
    shares: ids.map((projectId) => ({ projectId, percentBasisPoints: 0 }))
  }
}

export function percent(...shares: [string, number][]): Allocation {
  return {
    mode: 'selected',
    split: 'percent',
    shares: shares.map(([projectId, percentBasisPoints]) => ({ projectId, percentBasisPoints }))
  }
}

interface MoneyOpts {
  cents: number
  currency?: string
  rateToEur?: string
}

export function oneTimeExpense(
  id: string,
  date: string,
  m: MoneyOpts,
  allocation: Allocation,
  extra: Partial<Pick<Expense, 'category' | 'personId' | 'serviceId'>> = {}
): Expense {
  return {
    ...base,
    id,
    kind: 'oneTime',
    date,
    category: 'other',
    amount: { cents: m.cents, currency: m.currency ?? 'EUR' },
    rateToEur: m.rateToEur ?? '1',
    allocation,
    description: '',
    ...extra
  }
}

export function recurringExpense(
  id: string,
  recurrence: Partial<Recurrence> & Pick<Recurrence, 'interval' | 'startDate'>,
  m: MoneyOpts,
  allocation: Allocation,
  extra: Partial<Pick<Expense, 'category' | 'personId' | 'serviceId'>> = {}
): Expense {
  return {
    ...base,
    id,
    kind: 'recurring',
    recurrence: { priceChanges: [], ...recurrence },
    category: 'hosting',
    amount: { cents: m.cents, currency: m.currency ?? 'EUR' },
    rateToEur: m.rateToEur ?? '1',
    allocation,
    description: '',
    ...extra
  }
}

export function oneTimeIncome(id: string, date: string, m: MoneyOpts, projectId: string): Income {
  return {
    ...base,
    id,
    kind: 'oneTime',
    date,
    category: 'storeSales',
    amount: { cents: m.cents, currency: m.currency ?? 'EUR' },
    rateToEur: m.rateToEur ?? '1',
    projectId,
    description: ''
  }
}

export function recurringIncome(
  id: string,
  recurrence: Partial<Recurrence> & Pick<Recurrence, 'interval' | 'startDate'>,
  m: MoneyOpts,
  projectId: string
): Income {
  return {
    ...base,
    id,
    kind: 'recurring',
    recurrence: { priceChanges: [], ...recurrence },
    category: 'subscription',
    amount: { cents: m.cents, currency: m.currency ?? 'EUR' },
    rateToEur: m.rateToEur ?? '1',
    projectId,
    description: ''
  }
}

export function campaign(
  id: string,
  startDate: string,
  endDate: string,
  m: MoneyOpts,
  allocation: Allocation
): Campaign {
  return {
    ...base,
    id,
    name: `Campaign ${id}`,
    platform: 'google',
    format: 'search',
    startDate,
    endDate,
    cost: { cents: m.cents, currency: m.currency ?? 'EUR' },
    rateToEur: m.rateToEur ?? '1',
    allocation,
    impressions: 0,
    clicks: 0,
    usersGained: 0,
    rating: 0,
    note: ''
  }
}

/** Seeded PRNG (mulberry32), deterministic. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
