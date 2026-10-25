import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** Invented test data only (R2). */

export async function makeTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'appmanager-test-'))
}

export async function removeDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true })
}

let counter = 0
/** Deterministic UUIDs (valid v4 format). */
export function testId(): string {
  counter += 1
  return `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`
}

export function fixedNow(iso = '2026-03-01T10:00:00.000Z'): () => Date {
  return () => new Date(iso)
}

export const allEqual = { mode: 'all', split: 'equal', shares: [] } as const

export function selected(projectId: string) {
  return { mode: 'selected', split: 'equal', shares: [{ projectId, percentBasisPoints: 0 }] }
}

export function projectInput(name = 'Demo App') {
  return {
    name,
    description: '',
    platforms: ['web'],
    phase: 'idea',
    startDate: '2026-01-01',
    links: [],
    archived: false
  }
}

export function serviceInput() {
  return { provider: 'Demo Host', purpose: '', plan: 'Free', note: '', allocation: allEqual }
}

export function personInput() {
  return { name: 'Person A', role: 'Dev', status: 'active', note: '' }
}

export function expenseInput(extra: Record<string, unknown> = {}) {
  return {
    kind: 'oneTime',
    category: 'hosting',
    amount: { cents: 500, currency: 'EUR' },
    rateToEur: '1',
    allocation: allEqual,
    description: '',
    date: '2026-01-05',
    ...extra
  }
}

export function incomeInput(projectId: string) {
  return {
    kind: 'oneTime',
    category: 'other',
    amount: { cents: 1000, currency: 'EUR' },
    rateToEur: '1',
    projectId,
    description: '',
    date: '2026-01-06'
  }
}

export function campaignInput(allocation: unknown = allEqual) {
  return {
    name: 'Demo Campaign',
    platform: 'google',
    format: 'search',
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    cost: { cents: 2000, currency: 'EUR' },
    rateToEur: '1',
    allocation,
    impressions: 100,
    clicks: 10,
    usersGained: 1,
    rating: 3,
    note: ''
  }
}

export function exchangeRateInput() {
  return { currency: 'USD', rate: '0.92', enteredOn: '2026-01-01' }
}

export function goalInput(projectId: string | null = null) {
  return { projectId, kind: 'free', title: 'Ship v1', done: false }
}

export function userMetricInput(projectId: string) {
  return { projectId, date: '2026-02-01', usersTotal: 10, usersActive: 5, usersPaying: 1 }
}
