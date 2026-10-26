import { useMemo, type ReactNode } from 'react'
import { Pencil, Repeat, Trash2, TriangleAlert } from 'lucide-react'
import type { LedgerErrorCode } from '@core/ledger/ledger'
import type { DefaultListName } from '@shared/lists'
import type { Project } from '@shared/schemas/project'
import { listOptions } from '@/components/forms/list-options'
import { PeriodPicker } from '@/components/data/PeriodPicker'
import { DataTable, type DataColumn } from '@/components/data/DataTable'
import type { Period } from '@/components/data/period-logic'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { TableCell, TableRow } from '@/components/ui/table'
import { useSettings } from '@/hooks/useSettings'
import { useFormat, useI18n, useT } from '@/i18n'
import { uiDict } from '@/i18n/shared-keys'
import { useDisplayCurrency } from '@/state/DisplayCurrencyProvider'
import { bookingsDict, type BookingsKey } from './i18n'
import { totalEurCents, type BookingFilter, type BookingRow } from './list-logic'

const ERROR_KEYS: Record<LedgerErrorCode, BookingsKey> = {
  missingRate: 'errorMissingRate',
  invalidRate: 'errorInvalidRate',
  invalidAmount: 'errorInvalidAmount',
  overflow: 'errorOverflow'
}

/** Filterleiste: Zeitraum, Projekt, Kategorie. */
export function BookingFilters({
  period,
  onPeriodChange,
  filter,
  onFilterChange,
  projects,
  list
}: {
  period: Period
  onPeriodChange: (p: Period) => void
  filter: BookingFilter
  onFilterChange: (f: BookingFilter) => void
  projects: readonly Project[]
  list: Extract<DefaultListName, 'expenseCategories' | 'incomeCategories'>
}) {
  const tb = useT(bookingsDict)
  const { language } = useI18n()
  const { settings } = useSettings()
  const categories = useMemo(
    () => listOptions(list, settings?.[list], language),
    [list, settings, language]
  )
  return (
    <>
      <PeriodPicker value={period} onChange={onPeriodChange} />
      <Select
        aria-label={tb('filterProject')}
        value={filter.projectId}
        onValueChange={(projectId) => onFilterChange({ ...filter, projectId })}
        className="w-48"
      >
        <option value="">{tb('allProjects')}</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>
      <Select
        aria-label={tb('filterCategory')}
        value={filter.category}
        onValueChange={(category) => onFilterChange({ ...filter, category })}
        className="w-48"
      >
        <option value="">{tb('allCategories')}</option>
        {categories.map((c) => (
          <option key={c.key} value={c.key}>
            {c.label}
          </option>
        ))}
      </Select>
    </>
  )
}

/** Warnsymbol mit Text für Screenreader und Tooltip (`title`). */
function Warning({ text }: { text: string }) {
  return (
    <span className="inline-flex text-destructive" title={text}>
      <TriangleAlert aria-hidden="true" className="size-4" />
      <span className="sr-only">{text}</span>
    </span>
  )
}

export interface BookingTableProps {
  rows: readonly BookingRow[]
  projects: readonly Project[]
  /** Spaltentitel der Projektspalte (Ausgaben: „Projekte“, Einnahmen: „Projekt“). */
  projectHeader: string
  categoryLabel: (key: string) => string
  descriptionOf: (sourceId: string) => string
  isRecurring: (sourceId: string) => boolean
  onEdit: (sourceId: string) => void
  onDelete: (sourceId: string) => void
  filters: ReactNode
  filtered: boolean
  loading: boolean
  error: string | null
  onRetry: () => void
  caption: string
}

/**
 * Buchungsliste mit Originalbetrag (Originalwährung) und Anzeigebetrag
 * (aus EUR in die Anzeigewährung, PE-50) und Warnsymbol bei nicht zuordenbaren oder
 * nicht umrechenbaren Einträgen.
 */
export function BookingTable({
  rows,
  projects,
  projectHeader,
  categoryLabel,
  descriptionOf,
  isRecurring,
  onEdit,
  onDelete,
  filters,
  filtered,
  loading,
  error,
  onRetry,
  caption
}: BookingTableProps) {
  const tb = useT(bookingsDict)
  const tu = useT(uiDict)
  const fmt = useFormat()
  const display = useDisplayCurrency()
  const names = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects])

  const columns: DataColumn<BookingRow>[] = [
    {
      id: 'date',
      header: tb('columnDate'),
      sortValue: (r) => r.date,
      cell: (r) => (
        <span className="inline-flex items-center gap-1">
          {fmt.date(r.date)}
          {isRecurring(r.sourceId) && (
            <span title={tb('recurringBadge')} className="text-muted-foreground">
              <Repeat aria-hidden="true" className="size-3.5" />
              <span className="sr-only">{tb('recurringBadge')}</span>
            </span>
          )}
        </span>
      )
    },
    {
      id: 'category',
      header: tb('columnCategory'),
      sortValue: (r) => categoryLabel(r.category),
      cell: (r) => categoryLabel(r.category)
    },
    {
      id: 'description',
      header: tb('columnDescription'),
      sortValue: (r) => descriptionOf(r.sourceId),
      cell: (r) => (
        <span className="line-clamp-2 whitespace-normal">{descriptionOf(r.sourceId)}</span>
      )
    },
    {
      id: 'projects',
      header: projectHeader,
      cell: (r) => (
        <span className="inline-flex flex-wrap items-center gap-1 whitespace-normal">
          {(r.unallocated || r.error !== null) && (
            <Warning text={r.error !== null ? tb(ERROR_KEYS[r.error]) : tb('unallocatedWarning')} />
          )}
          {r.projectIds.map((id) => names.get(id) ?? tb('unknownProject')).join(', ')}
        </span>
      )
    },
    {
      id: 'original',
      header: tb('columnOriginal'),
      align: 'right',
      sortValue: (r) => r.original.cents,
      cell: (r) => fmt.money(r.original.cents, r.original.currency)
    },
    {
      id: 'display',
      header: tb('columnDisplay', { currency: display.currency }),
      align: 'right',
      sortValue: (r) => r.eurCents,
      cell: (r) => (r.eurCents === null ? '–' : display.format(r.eurCents).text)
    },
    {
      id: 'actions',
      header: tb('columnActions'),
      align: 'right',
      cell: (r) => (
        <span className="inline-flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={tb('editEntry')}
            title={tb('editEntry')}
            onClick={(e) => {
              e.stopPropagation()
              onEdit(r.sourceId)
            }}
          >
            <Pencil aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={tb('deleteEntry')}
            title={tb('deleteEntry')}
            onClick={(e) => {
              e.stopPropagation()
              onDelete(r.sourceId)
            }}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </span>
      )
    }
  ]

  const total = totalEurCents(rows)
  return (
    <div className="grid gap-2">
      <DataTable
        caption={caption}
        columns={columns}
        rows={rows}
        getRowId={(r) => r.key}
        filters={filters}
        filtered={filtered}
        loading={loading}
        error={error}
        onRetry={onRetry}
        onRowClick={(r) => onEdit(r.sourceId)}
        footer={
          <TableRow>
            <TableCell colSpan={5} className="font-medium">
              {tb('total')}
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {display.format(total).text}
            </TableCell>
            <TableCell />
          </TableRow>
        }
      />
      {display.converted && (
        <p className="text-xs text-muted-foreground">
          {display.missingRate
            ? tu('displayMissingRate', { currency: display.currency })
            : tu('convertedHint', { currency: display.currency })}
        </p>
      )}
    </div>
  )
}
