import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { personSummary } from '@core/metrics/metrics'
import {
  DataTable,
  KpiCard,
  PeriodPicker,
  isValidPeriod,
  periodFor,
  type DataColumn,
  type Period
} from '@/components/data'
import { ConfirmDialog } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ExpenseForm, PERSON_CATEGORY, localToday } from '@/features/bookings'
import { PersonDialog } from '@/features/people/PersonDialog'
import { peopleDict } from '@/features/people/i18n'
import { personPayments, type PaymentRow } from '@/features/people/people-logic'
import { useCollection, useDisplayCurrency, useEntityMutation } from '@/hooks'
import { useFormat, useT } from '@/i18n'
import { projectDetailPath } from '@/pages/projects/paths'
import { LedgerWarnings } from '@/pages/projects/LedgerWarnings'
import { useProjectLedger } from '@/pages/projects/useProjectLedger'

/** Beginn der Gesamtbetrachtung („gesamt“ = ab hier bis heute). */
const TOTAL_FROM = '2000-01-01'

interface ByProjectRow {
  projectId: string | null
  cents: number
}

/** Profil `/people/:id` (F-11): Stammdaten, KPIs, Summen je Projekt, Zahlungsliste, „+ Zahlung“. */
export function PersonDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const tc = useT()
  const tp = useT(peopleDict)
  const fmt = useFormat()
  const display = useDisplayCurrency()
  const persons = useCollection('persons')
  const expenses = useCollection('expenses')
  const { remove, errorText, reset } = useEntityMutation('persons')
  const today = useMemo(() => localToday(), [])
  const [period, setPeriod] = useState<Period>(() => periodFor('year', today))
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)

  // Ein Ledger deckt „gesamt“ (bis heute) und den gewählten Zeitraum ab.
  const ledgerPeriod = useMemo(
    () => ({
      from: period.from < TOTAL_FROM ? period.from : TOTAL_FROM,
      to: period.to > today ? period.to : today
    }),
    [period.from, period.to, today]
  )
  const state = useProjectLedger(ledgerPeriod, today)
  const { ledger } = state
  const person = persons.items.find((p) => p.id === id) ?? null
  const periodValid = isValidPeriod(period)

  const total = useMemo(
    () => (ledger ? personSummary(ledger, id, { from: TOTAL_FROM, to: today }) : null),
    [ledger, id, today]
  )
  const inPeriod = useMemo(
    () => (ledger && periodValid ? personSummary(ledger, id, period) : null),
    [ledger, id, period, periodValid]
  )
  const payments = useMemo(
    () => (ledger && periodValid ? personPayments(ledger, id, period) : []),
    [ledger, id, period, periodValid]
  )
  const projectNames = useMemo(
    () => new Map(state.projects.map((p) => [p.id, p.name])),
    [state.projects]
  )
  const descriptions = useMemo(
    () => new Map(expenses.items.map((e) => [e.id, e.description])),
    [expenses.items]
  )

  const projectCell = (projectId: string | null) => {
    if (projectId === null) return tp('noProject')
    const name = projectNames.get(projectId)
    return name ? (
      <Link to={projectDetailPath(projectId)} className="hover:underline">
        {name}
      </Link>
    ) : (
      tp('deletedProject')
    )
  }

  const projectColumns: DataColumn<ByProjectRow>[] = [
    {
      id: 'project',
      header: tp('colProject'),
      cell: (r) => projectCell(r.projectId),
      sortValue: (r) => (r.projectId === null ? '' : (projectNames.get(r.projectId) ?? ''))
    },
    {
      id: 'amount',
      header: tp('colAmount'),
      align: 'right',
      cell: (r) => display.format(r.cents).text,
      sortValue: (r) => r.cents
    }
  ]
  const paymentColumns: DataColumn<PaymentRow>[] = [
    {
      id: 'date',
      header: tp('colDate'),
      cell: (r) => fmt.date(r.date),
      sortValue: (r) => r.date
    },
    {
      id: 'description',
      header: tp('colDescription'),
      cell: (r) => descriptions.get(r.sourceId) ?? ''
    },
    {
      id: 'projects',
      header: tp('colProjects'),
      cell: (r) => (
        <span className="inline-flex flex-wrap gap-x-2">
          {r.projectIds.map((pid) => (
            <span key={pid ?? 'none'}>{projectCell(pid)}</span>
          ))}
        </span>
      )
    },
    {
      id: 'amount',
      header: tp('colAmount'),
      align: 'right',
      cell: (r) => display.format(r.eurCents).text,
      sortValue: (r) => r.eurCents
    }
  ]

  const loading = persons.loading || state.loading || expenses.loading
  const errorMessage = persons.errorText ?? state.errorText ?? expenses.errorText
  const back = (
    <Link to="/people" className="inline-flex items-center gap-1 text-primary hover:underline">
      <ArrowLeft aria-hidden="true" className="size-4" />
      {tp('back')}
    </Link>
  )

  if (!person) {
    return (
      <div className="grid gap-4">
        {back}
        <p role={errorMessage ? 'alert' : undefined} className="text-sm text-muted-foreground">
          {loading ? '…' : (errorMessage ?? tp('notFound'))}
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      {back}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{person.name}</h1>
          <p className="text-sm text-muted-foreground">
            {[person.role, person.status === 'active' ? tp('statusActive') : tp('statusInactive')]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {person.note && <p className="mt-2 whitespace-pre-wrap text-sm">{person.note}</p>}
        </div>
        <span className="inline-flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            {tc('common.edit')}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              reset()
              setDeleteOpen(true)
            }}
          >
            {tc('common.delete')}
          </Button>
        </span>
      </header>

      <LedgerWarnings ledger={ledger} />
      <PeriodPicker value={period} onChange={setPeriod} />
      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard
          title={tp('kpiTotal')}
          eurCents={total?.totalCents ?? 0}
          loading={loading || !total}
        />
        <KpiCard
          title={tp('kpiPeriod')}
          eurCents={inPeriod?.totalCents ?? 0}
          loading={loading || !inPeriod}
        />
      </div>

      <section aria-labelledby="by-project" className="grid gap-2">
        <h2 id="by-project" className="text-lg font-medium">
          {tp('byProject')}
        </h2>
        <DataTable
          columns={projectColumns}
          rows={inPeriod?.byProject ?? []}
          getRowId={(r) => r.projectId ?? 'none'}
          loading={loading}
          error={errorMessage}
          empty={<p className="p-4 text-sm text-muted-foreground">{tp('noPayments')}</p>}
        />
      </section>

      <section aria-labelledby="payments" className="grid gap-2">
        <div className="flex items-center justify-between gap-4">
          <h2 id="payments" className="text-lg font-medium">
            {tp('payments')}
          </h2>
          <Button onClick={() => setPaymentOpen(true)}>{tp('addPayment')}</Button>
        </div>
        <DataTable
          columns={paymentColumns}
          rows={payments}
          getRowId={(r) => r.key}
          initialSort={{ columnId: 'date', direction: 'desc' }}
          loading={loading}
          error={errorMessage}
          empty={<p className="p-4 text-sm text-muted-foreground">{tp('noPayments')}</p>}
        />
      </section>

      {editOpen && <PersonDialog open onOpenChange={setEditOpen} person={person} />}
      {paymentOpen && (
        <Dialog open onOpenChange={setPaymentOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{tp('paymentTitle', { name: person.name })}</DialogTitle>
            </DialogHeader>
            <ExpenseForm
              category={PERSON_CATEGORY}
              personId={person.id}
              onSaved={() => setPaymentOpen(false)}
              onCancel={() => setPaymentOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
      {deleteOpen && (
        <ConfirmDialog
          open
          onOpenChange={setDeleteOpen}
          destructive
          title={tp('deleteTitle', { name: person.name })}
          description={tp('deleteText')}
          confirmLabel={tc('common.delete')}
          error={errorText}
          onConfirm={async () => {
            const res = await remove(person.id)
            if (res.ok) void navigate('/people')
            return res.ok
          }}
        />
      )}
    </div>
  )
}
