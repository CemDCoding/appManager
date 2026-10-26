import type { Ledger } from '@core/ledger/ledger'
import type { MonthlyFixedCosts } from '@core/aggregate/fixedCosts'
import { useT } from '@/i18n'
import { projectsDict } from './i18n'

/** Zeigt Buchungen, die der Kern nicht umrechnen konnte (`ledger.errors`, `fixed.errors`). */
export function LedgerWarnings({
  ledger,
  fixedCosts
}: {
  ledger: Ledger | null
  fixedCosts?: MonthlyFixedCosts | null
}) {
  const tp = useT(projectsDict)
  const ledgerCount = ledger?.errors.length ?? 0
  const fixedCount = fixedCosts?.errors.length ?? 0
  if (ledgerCount === 0 && fixedCount === 0) return null
  return (
    <div role="alert" className="grid gap-1 rounded-md border border-destructive p-3 text-sm">
      {ledgerCount > 0 && <p>{tp('ledgerErrors', { count: ledgerCount })}</p>}
      {fixedCount > 0 && <p>{tp('fixedErrors', { count: fixedCount })}</p>}
    </div>
  )
}
