import { describe, expect, it } from 'vitest'
import type { Income } from '@shared/schemas/income'
import type { Project } from '@shared/schemas/project'
import { buildOverview, fixedCostDate, localIsoDate } from './overview'

const base = {
  ownerId: 'local',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
} as const

const project = (id: string, name: string, startDate: string): Project =>
  ({
    ...base,
    id,
    name,
    description: '',
    platforms: [],
    phase: 'live',
    startDate,
    links: [],
    archived: false
  }) as unknown as Project

const income = (id: string, projectId: string, date: string, cents: number): Income =>
  ({
    ...base,
    id,
    kind: 'oneTime',
    category: 'other',
    amount: { cents, currency: 'EUR' },
    rateToEur: '1',
    projectId,
    description: '',
    date
  }) as unknown as Income

describe('fixedCostDate', () => {
  it('clamps today into the range', () => {
    const r = { from: '2026-04-01', to: '2026-04-30' }
    expect(fixedCostDate('2026-03-15', r)).toBe('2026-04-01')
    expect(fixedCostDate('2026-04-15', r)).toBe('2026-04-15')
    expect(fixedCostDate('2026-06-01', r)).toBe('2026-04-30')
  })
})

describe('localIsoDate', () => {
  it('formats local date with padding', () => {
    expect(localIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('buildOverview', () => {
  it('sums incomes per project and flags unknown projects as unallocated', () => {
    const o = buildOverview(
      {
        projects: [project('p1', 'Alpha', '2026-01-01'), project('p2', 'Beta', '2026-01-01')],
        expenses: [],
        incomes: [
          income('i1', 'p1', '2026-04-10', 10000),
          income('i2', 'ghost', '2026-04-11', 500),
          income('i3', 'p1', '2026-05-01', 999)
        ],
        campaigns: []
      },
      { from: '2026-04-01', to: '2026-04-30' },
      '2026-04-15'
    )
    expect(o.incomeCents).toBe(10500)
    expect(o.balanceCents).toBe(10500)
    expect(o.unallocatedCount).toBe(1)
    expect(o.rows.find((r) => r.projectId === 'p1')?.incomeCents).toBe(10000)
    expect(o.rows.find((r) => r.projectId === 'p2')?.balanceCents).toBe(0)
    expect(o.rows.some((r) => r.projectId === null)).toBe(true)
  })
})
