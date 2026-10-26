import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { buildLedger, type Ledger } from '@core/ledger/ledger'
import type { Expense } from '@shared/schemas/expense'
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
  ExpenseForm,
  localToday,
  QUICK_CATEGORIES,
  type BookingFilter,
  type ExpenseFormProps,
  type QuickAction
} from '@/features/bookings'
import { expensesPageDict } from './i18n'

const EMPTY_LEDGER: Ledger = { entries: [], errors: [] }

type FormState =
  | { mode: 'closed' }
  | { mode: 'create'; prefill: Pick<ExpenseFormProps, 'category' | 'kind'>; seq: number }
  | { mode: 'edit'; expense: Expense }

/** Ausgaben (F-03, F-06, PE-48): Liste je Zeitraum, Erfassen, Bearbeiten, Löschen. */
export function ExpensesPage() {
  const tp = useT(expensesPageDict)
  const tb = useT(bookingsDict)
  const t = useT()
  const categoryLabel = useListLabel('expenseCategories')
  const projects = useCollection('projects')
  const expenses = useCollection('expenses')
  const { remove, errorText: removeError, reset } = useEntityMutation('expenses')

  const [period, setPeriod] = useState<Period>(() => periodFor('month', localToday()))
  const [filter, setFilter] = useState<BookingFilter>({ projectId: '', category: '' })
  const [form, setForm] = useState<FormState>({ mode: 'closed' })
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const byId = useMemo(() => new Map(expenses.items.map((e) => [e.id, e])), [expenses.items])

  const ledger = useMemo(() => {
    if (!isValidPeriod(period)) return EMPTY_LEDGER
    return buildLedger(
      { projects: projects.items, expenses: expenses.items, incomes: [], campaigns: [] },
      { from: period.from, to: period.to }
    )
  }, [projects.items, expenses.items, period])

  const rows = useMemo(
    () => bookingRows(ledger, 'expense', filter, (id) => byId.get(id)?.category),
    [ledger, filter, byId]
  )
  const errorCount = ledger.errors.filter((e) => e.sourceType === 'expense').length

  const openCreate = (prefill: Pick<ExpenseFormProps, 'category' | 'kind'> = {}) =>
    setForm({ mode: 'create', prefill, seq: Date.now() })
  const openQuick = (action: QuickAction) => openCreate({ category: QUICK_CATEGORIES[action] })
  const close = () => setForm({ mode: 'closed' })

  const editTarget = (id: string) => {
    const expense = byId.get(id)
    if (expense) setForm({ mode: 'edit', expense })
  }
  const deleteTarget = deleteId ? byId.get(deleteId) : undefined

  return (
    <section className="grid gap-6" aria-label={tp('title')}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-prose text-sm text-muted-foreground">{tp('intro')}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => openQuick('personPayment')}>
            {tb('quickPersonPayment')}
          </Button>
          <Button variant="outline" onClick={() => openQuick('aiCredit')}>
            {tb('quickAiCredit')}
          </Button>
          <Button variant="outline" onClick={() => openQuick('subscription')}>
            {tb('quickSubscription')}
          </Button>
          <Button onClick={() => openCreate()}>
            <Plus aria-hidden="true" />
            {tp('add')}
          </Button>
        </div>
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
        projectHeader={tb('columnProjects')}
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
            list="expenseCategories"
          />
        }
        filtered={filter.projectId !== '' || filter.category !== ''}
        loading={projects.loading || expenses.loading}
        error={expenses.errorText ?? projects.errorText}
        onRetry={() => {
          void projects.reload()
          void expenses.reload()
        }}
      />

      <Dialog open={form.mode !== 'closed'} onOpenChange={(open) => !open && close()}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.mode === 'edit' ? tb('editExpense') : tb('newExpense')}</DialogTitle>
          </DialogHeader>
          {form.mode === 'edit' && (
            <ExpenseForm
              key={form.expense.id}
              expense={form.expense}
              onSaved={close}
              onCancel={close}
            />
          )}
          {form.mode === 'create' && (
            <ExpenseForm key={form.seq} {...form.prefill} onSaved={close} onCancel={close} />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        destructive
        title={tb('deleteExpenseTitle')}
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
