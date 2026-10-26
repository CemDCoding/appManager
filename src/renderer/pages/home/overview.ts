import { aggregate } from '@core/aggregate/aggregate'
import { monthlyFixedCosts, type MonthlyFixedCosts } from '@core/aggregate/fixedCosts'
import { buildLedger, type Ledger, type LedgerInput } from '@core/ledger/ledger'
import type { Project } from '@shared/schemas/project'

/** Kennzahlen der Startseite (nur Zusammenstellung, gerechnet wird im Kern). */
export interface ProjectRow {
  /** `null` = Buchungen ohne aktives Projekt. */
  projectId: string | null
  name: string | null
  incomeCents: number
  expenseCents: number
  balanceCents: number
}

export interface Overview {
  incomeCents: number
  expenseCents: number
  balanceCents: number
  fixedCostsCents: number
  rows: ProjectRow[]
  /** Anzahl nicht zuordenbarer Buchungen im Zeitraum (0 = keine). */
  unallocatedCount: number
  ledgerErrors: Ledger['errors']
  fixedCostErrors: MonthlyFixedCosts['errors']
}

export type OverviewInput = Omit<LedgerInput, 'projects'> & { projects: readonly Project[] }

/** Stichtag der Fixkosten: heute, begrenzt auf den gewählten Zeitraum. */
export function fixedCostDate(today: string, range: { from: string; to: string }): string {
  if (today < range.from) return range.from
  if (today > range.to) return range.to
  return today
}

/** Lokales Datum "YYYY-MM-DD" (nicht UTC). */
export function localIsoDate(now: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${String(now.getFullYear()).padStart(4, '0')}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}

export function buildOverview(
  input: OverviewInput,
  range: { from: string; to: string },
  today: string
): Overview {
  const ledger = buildLedger(input, range)
  const byProject = aggregate(ledger.entries, { groupBy: 'project' })
  const names = new Map(input.projects.map((p) => [p.id, p.name]))
  const fixed = monthlyFixedCosts(input.expenses, input.projects, fixedCostDate(today, range))
  const rows: ProjectRow[] = byProject.groups.map((g) => ({
    projectId: g.key,
    name: g.key === null ? null : (names.get(g.key) ?? g.key),
    incomeCents: g.incomeCents,
    expenseCents: g.expenseCents,
    balanceCents: g.balanceCents
  }))
  // Aktive Projekte ohne Buchungen im Zeitraum bleiben sichtbar (mit 0).
  for (const [id, name] of names) {
    if (!rows.some((r) => r.projectId === id)) {
      rows.push({ projectId: id, name, incomeCents: 0, expenseCents: 0, balanceCents: 0 })
    }
  }
  return {
    ...byProject.total,
    fixedCostsCents: fixed.totalCents,
    rows,
    unallocatedCount: ledger.entries.filter((e) => e.unallocated).length,
    ledgerErrors: ledger.errors,
    fixedCostErrors: fixed.errors
  }
}
