import { useMemo } from 'react'
import { buildLedger, type Ledger } from '@core/ledger/ledger'
import { monthlyFixedCosts, type MonthlyFixedCosts } from '@core/aggregate/fixedCosts'
import type { Campaign } from '@shared/schemas/campaign'
import type { Project } from '@shared/schemas/project'
import type { Service } from '@shared/schemas/service'
import { useCollection } from '@/hooks'
import { isValidPeriod } from '@/components/data'

export interface ProjectLedgerState {
  loading: boolean
  errorText: string | null
  reload: () => Promise<void>
  /** `null`, solange Daten laden oder der Zeitraum ungültig ist. */
  ledger: Ledger | null
  /** Fixkosten pro Monat am Stichtag `today` (PE-51). */
  fixedCosts: MonthlyFixedCosts | null
  projects: Project[]
  services: Service[]
  /** Geladene Kampagnen (dieselbe Liste wie im Journal, kein zweites Laden). */
  campaigns: Campaign[]
}

/**
 * Lädt Projekte, Ausgaben, Einnahmen, Kampagnen und Dienste und baut daraus das
 * Buchungsjournal des Zeitraums (nur Kern-Funktionen, keine eigene Rechenlogik).
 */
export function useProjectLedger(
  period: { from: string; to: string },
  today: string
): ProjectLedgerState {
  const projects = useCollection('projects')
  const expenses = useCollection('expenses')
  const incomes = useCollection('incomes')
  const campaigns = useCollection('campaigns')
  const services = useCollection('services')
  const all = [projects, expenses, incomes, campaigns, services]
  const loading = all.some((c) => c.loading)
  const errorText = all.find((c) => c.errorText !== null)?.errorText ?? null
  const valid = isValidPeriod(period)

  const ledger = useMemo(() => {
    if (loading || errorText || !valid) return null
    return buildLedger(
      {
        projects: projects.items,
        expenses: expenses.items,
        incomes: incomes.items,
        campaigns: campaigns.items
      },
      { from: period.from, to: period.to }
    )
  }, [
    loading,
    errorText,
    valid,
    projects.items,
    expenses.items,
    incomes.items,
    campaigns.items,
    period.from,
    period.to
  ])

  const fixedCosts = useMemo(
    () => (loading || errorText ? null : monthlyFixedCosts(expenses.items, projects.items, today)),
    [loading, errorText, expenses.items, projects.items, today]
  )

  const reload = async () => {
    await Promise.all(all.map((c) => c.reload()))
  }

  return {
    loading,
    errorText,
    reload,
    ledger,
    fixedCosts,
    projects: projects.items,
    services: services.items,
    campaigns: campaigns.items
  }
}
