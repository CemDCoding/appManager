import { describe, expect, it } from 'vitest'
import type { LedgerError } from '@core/ledger/ledger'
import type { Allocation } from '@shared/schemas/common'
import { fixedErrorsForProject, ledgerErrorsForProject } from './scope-errors'

const P1 = 'p1'
const P2 = 'p2'
const projects = [
  { id: P1, startDate: '2026-01-01' },
  { id: P2, startDate: '2026-01-01', endDate: '2026-03-31' }
]
const ALL: Allocation = { mode: 'all', split: 'equal', shares: [] }
const only = (id: string): Allocation => ({
  mode: 'selected',
  split: 'equal',
  shares: [{ projectId: id, percentBasisPoints: 0 }]
})

function err(sourceType: LedgerError['sourceType'], sourceId: string, date: string): LedgerError {
  return {
    date,
    sourceType,
    sourceId,
    original: { cents: 100, currency: 'USD' },
    error: 'missingRate'
  }
}

const sources = {
  projects,
  incomes: [
    { id: 'i1', projectId: P1 },
    { id: 'i2', projectId: P2 }
  ],
  expenses: [
    { id: 'e-all', allocation: ALL },
    { id: 'e-p2', allocation: only(P2) }
  ],
  campaigns: [{ id: 'c-p1', allocation: only(P1) }]
}

describe('ledgerErrorsForProject', () => {
  it('keeps only errors that would have been booked onto the project', () => {
    const errors = [
      err('income', 'i1', '2026-02-01'),
      err('income', 'i2', '2026-02-01'),
      err('expense', 'e-all', '2026-02-01'),
      err('expense', 'e-p2', '2026-02-01'),
      err('campaign', 'c-p1', '2026-02-01')
    ]
    expect(ledgerErrorsForProject(errors, sources, P1).map((e) => e.sourceId)).toEqual([
      'i1',
      'e-all',
      'c-p1'
    ])
    expect(ledgerErrorsForProject(errors, sources, P2).map((e) => e.sourceId)).toEqual([
      'i2',
      'e-all',
      'e-p2'
    ])
  })

  it('uses the active shares on the booking date and ignores unknown sources', () => {
    const errors = [
      err('expense', 'e-all', '2026-05-01'),
      err('expense', 'e-p2', '2026-05-01'),
      err('expense', 'gone', '2026-02-01'),
      err('income', 'gone', '2026-02-01')
    ]
    expect(ledgerErrorsForProject(errors, sources, P2)).toEqual([])
    expect(ledgerErrorsForProject(errors, sources, P1).map((e) => e.sourceId)).toEqual(['e-all'])
  })
})

describe('fixedErrorsForProject', () => {
  const errors = [
    { expenseId: 'e-all', error: 'missingRate' as const },
    { expenseId: 'e-p2', error: 'missingRate' as const },
    { expenseId: 'gone', error: 'missingRate' as const }
  ]

  it('filters by the active shares on the fixed-cost date', () => {
    expect(
      fixedErrorsForProject(errors, sources, '2026-02-01', P2).map((e) => e.expenseId)
    ).toEqual(['e-all', 'e-p2'])
    expect(
      fixedErrorsForProject(errors, sources, '2026-05-01', P2).map((e) => e.expenseId)
    ).toEqual([])
    expect(
      fixedErrorsForProject(errors, sources, '2026-05-01', P1).map((e) => e.expenseId)
    ).toEqual(['e-all'])
  })
})
