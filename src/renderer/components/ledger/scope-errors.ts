import type { FixedCostsError } from '@core/aggregate/fixedCosts'
import { activeShares, type LedgerError, type LedgerProject } from '@core/ledger/ledger'
import type { Allocation } from '@shared/schemas/common'

export interface ScopeErrorSources {
  projects: readonly LedgerProject[]
  expenses: readonly { id: string; allocation: Allocation }[]
  incomes: readonly { id: string; projectId: string }[]
  campaigns: readonly { id: string; allocation: Allocation }[]
}

/**
 * Nicht umrechenbare Buchungen, die (umrechenbar) auf `projectId` gebucht worden wären.
 * Einnahmen gehören ihrem Projekt; Ausgaben und Kampagnen den am Buchungsdatum aktiven
 * Anteilen (`activeShares`, dieselbe Regel wie im Journal). Nur für die Anzeige.
 */
export function ledgerErrorsForProject(
  errors: readonly LedgerError[],
  sources: ScopeErrorSources,
  projectId: string
): LedgerError[] {
  const incomes = new Map(sources.incomes.map((i) => [i.id, i.projectId]))
  const expenses = new Map(sources.expenses.map((e) => [e.id, e.allocation]))
  const campaigns = new Map(sources.campaigns.map((c) => [c.id, c.allocation]))
  return errors.filter((err) => {
    if (err.sourceType === 'income') return incomes.get(err.sourceId) === projectId
    const allocation = (err.sourceType === 'expense' ? expenses : campaigns).get(err.sourceId)
    return (
      allocation !== undefined && hitsProject(allocation, sources.projects, err.date, projectId)
    )
  })
}

/** Nicht umrechenbare Fixkosten, die am Stichtag `date` auf `projectId` entfallen wären. */
export function fixedErrorsForProject(
  errors: readonly FixedCostsError[],
  sources: Pick<ScopeErrorSources, 'projects' | 'expenses'>,
  date: string,
  projectId: string
): FixedCostsError[] {
  const expenses = new Map(sources.expenses.map((e) => [e.id, e.allocation]))
  return errors.filter((err) => {
    const allocation = expenses.get(err.expenseId)
    return allocation !== undefined && hitsProject(allocation, sources.projects, date, projectId)
  })
}

function hitsProject(
  allocation: Allocation,
  projects: readonly LedgerProject[],
  date: string,
  projectId: string
): boolean {
  return activeShares(allocation, projects, date).some((s) => s.projectId === projectId)
}
