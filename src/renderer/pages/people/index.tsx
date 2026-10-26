import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Person } from '@shared/schemas/person'
import { DataTable, type DataColumn } from '@/components/data'
import { ConfirmDialog } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { PersonDialog } from '@/features/people/PersonDialog'
import { peopleDict } from '@/features/people/i18n'
import {
  filterPersons,
  personDetailPath,
  totalsByPerson,
  type StatusFilter
} from '@/features/people/people-logic'
import { localToday } from '@/features/bookings/booking-logic'
import { useCollection, useDisplayCurrency, useEntityMutation } from '@/hooks'
import { useT } from '@/i18n'
import { LedgerWarnings } from '@/pages/projects/LedgerWarnings'
import { useProjectLedger } from '@/pages/projects/useProjectLedger'

export { PersonDetailPage } from './PersonDetailPage'

/** Personen (F-05, F-11): Liste mit Jahressumme, Filter aktiv/inaktiv, Anlegen und Löschen. */
export function PeoplePage() {
  const tc = useT()
  const tp = useT(peopleDict)
  const display = useDisplayCurrency()
  const persons = useCollection('persons')
  const { remove, errorText, reset } = useEntityMutation('persons')
  const today = useMemo(() => localToday(), [])
  const year = today.slice(0, 4)
  const state = useProjectLedger({ from: `${year}-01-01`, to: `${year}-12-31` }, today)

  const [filter, setFilter] = useState<StatusFilter>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Person | null>(null)
  const [deleting, setDeleting] = useState<Person | null>(null)

  const rows = useMemo(() => filterPersons(persons.items, filter), [persons.items, filter])
  const totals = useMemo(
    () =>
      state.ledger
        ? totalsByPerson(state.ledger, persons.items, {
            from: `${year}-01-01`,
            to: `${year}-12-31`
          })
        : null,
    [state.ledger, persons.items, year]
  )

  const columns: DataColumn<Person>[] = [
    {
      id: 'name',
      header: tp('colName'),
      cell: (p) => (
        <Link to={personDetailPath(p.id)} className="font-medium hover:underline">
          {p.name}
        </Link>
      ),
      sortValue: (p) => p.name
    },
    { id: 'role', header: tp('colRole'), cell: (p) => p.role, sortValue: (p) => p.role },
    {
      id: 'status',
      header: tp('colStatus'),
      cell: (p) => (p.status === 'active' ? tp('statusActive') : tp('statusInactive')),
      sortValue: (p) => p.status
    },
    {
      id: 'sum',
      header: tp('colSum', { year }),
      align: 'right',
      cell: (p) => (totals ? display.format(totals.get(p.id) ?? 0).text : '…'),
      sortValue: (p) => totals?.get(p.id) ?? 0
    },
    {
      id: 'actions',
      header: tp('colActions'),
      align: 'right',
      cell: (p) => (
        <span className="inline-flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditing(p)
              setFormOpen(true)
            }}
          >
            {tc('common.edit')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              reset()
              setDeleting(p)
            }}
          >
            {tc('common.delete')}
          </Button>
        </span>
      )
    }
  ]

  return (
    <div className="grid gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{tp('title')}</h1>
          <p className="text-sm text-muted-foreground">{tp('intro')}</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          {tp('add')}
        </Button>
      </header>
      <LedgerWarnings ledger={state.ledger} />
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(p) => p.id}
        initialSort={{ columnId: 'name', direction: 'asc' }}
        loading={persons.loading || state.loading}
        error={persons.errorText ?? state.errorText}
        onRetry={() => void persons.reload()}
        filtered={filter !== 'all'}
        filters={
          <div className="flex items-center gap-2">
            <Label htmlFor="people-status">{tp('filterStatus')}</Label>
            <Select
              id="people-status"
              value={filter}
              onValueChange={(v) => setFilter(v === 'active' || v === 'inactive' ? v : 'all')}
              className="w-36"
            >
              <option value="all">{tp('filterAll')}</option>
              <option value="active">{tp('statusActive')}</option>
              <option value="inactive">{tp('statusInactive')}</option>
            </Select>
          </div>
        }
        empty={
          <p className="p-4 text-sm text-muted-foreground">
            {filter === 'all' ? tp('empty') : tp('emptyFiltered')}
          </p>
        }
      />
      {formOpen && <PersonDialog open={formOpen} onOpenChange={setFormOpen} person={editing} />}
      {deleting && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setDeleting(null)}
          destructive
          title={tp('deleteTitle', { name: deleting.name })}
          description={tp('deleteText')}
          confirmLabel={tc('common.delete')}
          error={errorText}
          onConfirm={async () => {
            const res = await remove(deleting.id)
            if (res.ok) setDeleting(null)
            return res.ok
          }}
        />
      )}
    </div>
  )
}
