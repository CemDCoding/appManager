import type { MonthlyFixedCosts } from '@core/aggregate/fixedCosts'
import type { Expense } from '@shared/schemas/expense'
import type { Project } from '@shared/schemas/project'
import type { Service } from '@shared/schemas/service'
import { DataTable, type DataColumn } from '@/components/data'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useFormat, useT } from '@/i18n'
import { useDisplayCurrency } from '@/hooks'
import { servicesDict } from './i18n'

export interface ServiceCostsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  service: Service
  expenses: readonly Expense[]
  projects: readonly Project[]
  monthly: MonthlyFixedCosts | undefined
  onAddCost: () => void
}

/** Verknüpfte Ausgaben eines Dienstes und der monatliche Anteil je Projekt. */
export function ServiceCostsDialog({
  open,
  onOpenChange,
  service,
  expenses,
  projects,
  monthly,
  onAddCost
}: ServiceCostsDialogProps) {
  const tc = useT()
  const tp = useT(servicesDict)
  const fmt = useFormat()
  const display = useDisplayCurrency()

  const columns: DataColumn<Expense>[] = [
    {
      id: 'date',
      header: tp('colDate'),
      cell: (e) => fmt.date(e.kind === 'oneTime' ? e.date : e.recurrence.startDate),
      sortValue: (e) => (e.kind === 'oneTime' ? e.date : e.recurrence.startDate)
    },
    {
      id: 'description',
      header: tp('colDescription'),
      cell: (e) => e.description,
      sortValue: (e) => e.description
    },
    {
      id: 'kind',
      header: tp('colKind'),
      cell: (e) => (e.kind === 'oneTime' ? tp('kindOneTime') : tp('kindRecurring'))
    },
    {
      id: 'amount',
      header: tp('colAmount'),
      align: 'right',
      cell: (e) => fmt.money(e.amount.cents, e.amount.currency),
      sortValue: (e) => e.amount.cents
    }
  ]

  const names = new Map(projects.map((p) => [p.id, p.name]))
  const shares = (monthly?.byProject ?? []).filter((s) => s.cents > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tp('detailTitle', { name: service.provider })}</DialogTitle>
          <DialogDescription>{tp('costsHint')}</DialogDescription>
        </DialogHeader>
        <DataTable
          columns={columns}
          rows={expenses}
          getRowId={(e) => e.id}
          initialSort={{ columnId: 'date', direction: 'desc' }}
          empty={<p className="p-4 text-sm text-muted-foreground">{tp('costsEmpty')}</p>}
          caption={tp('costsTitle')}
        />
        {monthly && (shares.length > 0 || monthly.unallocatedCents > 0) && (
          <section aria-label={tp('sharesTitle')} className="grid gap-1 text-sm">
            <h3 className="font-medium">{tp('sharesTitle')}</h3>
            <ul>
              {shares.map((s) => (
                <li key={s.projectId} className="flex justify-between">
                  <span>{names.get(s.projectId) ?? s.projectId}</span>
                  <span>{display.format(s.cents).text}</span>
                </li>
              ))}
              {monthly.unallocatedCents > 0 && (
                <li className="flex justify-between">
                  <span>{tp('unallocated')}</span>
                  <span>{display.format(monthly.unallocatedCents).text}</span>
                </li>
              )}
            </ul>
          </section>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tc('common.close')}
          </Button>
          <Button type="button" onClick={onAddCost}>
            {tp('addCost')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
