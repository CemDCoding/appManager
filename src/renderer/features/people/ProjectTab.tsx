import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DataTable,
  PeriodPicker,
  isValidPeriod,
  periodFor,
  type DataColumn,
  type Period
} from '@/components/data'
import { LedgerWarnings, useProjectLedger } from '@/components/ledger'
import { useCollection, useDisplayCurrency } from '@/hooks'
import { useT } from '@/i18n'
import { localToday } from '../bookings/booking-logic'
import type { ProjectTabProps } from '../ComingSoon'
import { peopleDict } from './i18n'
import { personDetailPath, personsOfProject, type ProjectPersonRow } from './people-logic'

/** Projekt-Tab „Personen“: Personen mit Zahlungen im Projekt und ihre Summen (AP-17). */
export function ProjectTab({ projectId }: ProjectTabProps) {
  const tp = useT(peopleDict)
  const display = useDisplayCurrency()
  const persons = useCollection('persons')
  const today = useMemo(() => localToday(), [])
  const [period, setPeriod] = useState<Period>(() => periodFor('year', today))
  const state = useProjectLedger(period, today)
  const { ledger } = state

  const names = useMemo(() => new Map(persons.items.map((p) => [p.id, p.name])), [persons.items])
  const rows = useMemo(
    () => (ledger && isValidPeriod(period) ? personsOfProject(ledger, projectId, period) : []),
    [ledger, projectId, period]
  )

  const columns: DataColumn<ProjectPersonRow>[] = [
    {
      id: 'name',
      header: tp('colName'),
      cell: (r) =>
        names.has(r.personId) ? (
          <Link to={personDetailPath(r.personId)} className="font-medium hover:underline">
            {names.get(r.personId)}
          </Link>
        ) : (
          <span className="italic text-muted-foreground">{tp('deletedPerson')}</span>
        ),
      sortValue: (r) => names.get(r.personId) ?? ''
    },
    {
      id: 'sum',
      header: tp('colAmount'),
      align: 'right',
      cell: (r) => display.format(r.eurCents).text,
      sortValue: (r) => r.eurCents
    }
  ]

  return (
    <div className="grid gap-4">
      <PeriodPicker value={period} onChange={setPeriod} />
      <p className="text-sm text-muted-foreground">{tp('projectTabHint')}</p>
      <LedgerWarnings ledger={ledger} />
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.personId}
        loading={state.loading || persons.loading}
        error={state.errorText ?? persons.errorText}
        onRetry={() => void state.reload()}
        empty={<p className="p-4 text-sm text-muted-foreground">{tp('noPaymentsProject')}</p>}
      />
    </div>
  )
}
