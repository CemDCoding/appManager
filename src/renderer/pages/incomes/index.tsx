import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { buildLedger, type Ledger } from '@core/ledger/ledger'
import type { Income } from '@shared/schemas/income'
import { useListLabel } from '@/components/forms/CategorySelect'
import { ConfirmDialog } from '@/components/forms/ConfirmDialog'
import { isValidPeriod, periodFor, type Period } from '@/components/data/period-logic'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useCollection } from '@/hooks/useCollection'
import { useEntityMutation } from '@/hooks/useEntityMutation'
import { useT } from '@/i18n'
import {
  BookingFilters,
  BookingTable,
  bookingRows,
  bookingsDict,
  IncomeForm,
  localToday,
  type BookingFilter
} from '@/features/bookings'
import { incomesPageDict } from './i18n'

const EMPTY_LEDGER: Ledger = { entries: [], errors: [] }

type FormState =
  { mode: 'closed' } | { mode: 'create'; seq: number } | { mode: 'edit'; income: Income }

/** Einnahmen (F-04, PE-08): Liste je Zeitraum, Erfassen, Bearbeiten, Löschen. */
export function IncomesPage() {
  const tp = useT(incomesPageDict)
  const tb = useT(bookingsDict)
  const t = useT()
  const categoryLabel = useListLabel('incomeCategories')
  const projects = useCollection('projects')
  const incomes = useCollection('incomes')
  const { remove, errorText: removeError, reset } = useEntityMutation('incomes')

  const [period, setPeriod] = useState<Period>(() => periodFor('month', localToday()))
  const [filter, setFilter] = useState<BookingFilter>({ projectId: '', category: '' })
  const [form, setForm] = useState<FormState>({ mode: 'closed' })
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const byId = useMemo(() => new Map(incomes.items.map((e) => [e.id, e])), [incomes.items])

  const ledger = useMemo(() => {
    if (!isValidPeriod(period)) return EMPTY_LEDGER
    return buildLedger(
      { projects: projects.items, expenses: [], incomes: incomes.items, campaigns: [] },
      { from: period.from, to: period.to }
    )
  }, [projects.items, incomes.items, period])

  const rows = useMemo(
    () => bookingRows(ledger, 'income', filter, (id) => byId.get(id)?.category),
    [ledger, filter, byId]
  )
  const errorCount = ledger.errors.filter((e) => e.sourceType === 'income').length

  const close = () => setForm({ mode: 'closed' })
  const editTarget = (id: string) => {
    const income = byId.get(id)
    if (income) setForm({ mode: 'edit', income })
  }
  const deleteTarget = deleteId ? byId.get(deleteId) : undefined

  return (
    <section className="grid gap-6" aria-label={tp('title')}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-prose text-sm text-muted-foreground">{tp('intro')}</p>
        <Button onClick={() => setForm({ mode: 'create', seq: Date.now() })}>
          <Plus aria-hidden="true" />
          {tp('add')}
        </Button>
      </header>

      {errorCount > 0 && (
        <p role="alert" className="text-sm text-destructive">
          {tb('ledgerErrorsHint', { count: errorCount })}
        </p>
      )}

      <BookingTable
        caption={tp('caption')}
        rows={rows}
        projects={projects.items}
        projectHeader={tb('columnProject')}
        categoryLabel={categoryLabel}
        descriptionOf={(id) => byId.get(id)?.description ?? ''}
        isRecurring={(id) => byId.get(id)?.kind === 'recurring'}
        onEdit={editTarget}
        onDelete={(id) => {
          reset()
          setDeleteId(id)
        }}
        filters={
          <BookingFilters
            period={period}
            onPeriodChange={setPeriod}
            filter={filter}
            onFilterChange={setFilter}
            projects={projects.items}
            list="incomeCategories"
          />
        }
        filtered={filter.projectId !== '' || filter.category !== ''}
        loading={projects.loading || incomes.loading}
        error={incomes.errorText ?? projects.errorText}
        onRetry={() => {
          void projects.reload()
          void incomes.reload()
        }}
      />

      <Dialog open={form.mode !== 'closed'} onOpenChange={(open) => !open && close()}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.mode === 'edit' ? tb('editIncome') : tb('newIncome')}</DialogTitle>
          </DialogHeader>
          {form.mode === 'edit' && (
            <IncomeForm
              key={form.income.id}
              income={form.income}
              onSaved={close}
              onCancel={close}
            />
          )}
          {form.mode === 'create' && <IncomeForm key={form.seq} onSaved={close} onCancel={close} />}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        destructive
        title={tb('deleteIncomeTitle')}
        description={
          deleteTarget?.kind === 'recurring' ? tb('deleteRecurringText') : tb('deleteOneTimeText')
        }
        confirmLabel={t('common.delete')}
        error={removeError}
        onConfirm={async () => (deleteId ? (await remove(deleteId)).ok : true)}
      />
    </section>
  )
}
