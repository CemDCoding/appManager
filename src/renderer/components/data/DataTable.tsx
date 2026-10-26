import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { LOCALES, useI18n, useT } from '@/i18n'
import { uiDict } from '@/i18n/shared-keys'
import { cn } from '@/lib/utils'
import { nextSort, sortRows, type SortState, type SortValue } from './table-logic'

export interface DataColumn<T> {
  id: string
  /** Bereits übersetzter Spaltentitel. */
  header: string
  cell: (row: T) => ReactNode
  /** Wert zum Sortieren; ohne ihn ist die Spalte nicht sortierbar. Geld: Cent-Zahl. */
  sortValue?: (row: T) => SortValue
  align?: 'left' | 'right'
  className?: string
}

export interface DataTableProps<T> {
  columns: readonly DataColumn<T>[]
  rows: readonly T[]
  getRowId: (row: T) => string
  /** Filterleiste über der Tabelle (Filter selbst filtern `rows` beim Aufrufer). */
  filters?: ReactNode
  /** Gibt es Filter, die gerade Einträge ausblenden? (anderer Leer-Text) */
  filtered?: boolean
  initialSort?: SortState
  loading?: boolean
  /** Fehlertext (z. B. `errorText` aus `useCollection`) mit optionalem Neu-laden. */
  error?: string | null
  onRetry?: () => void
  /** Eigener Leer-Zustand (z. B. Text + „Anlegen“-Knopf). */
  empty?: ReactNode
  /** Fußzeile, z. B. Summen. */
  footer?: ReactNode
  onRowClick?: (row: T) => void
  caption?: string
  className?: string
}

/**
 * Tabelle mit Sortierung (Klick auf Spaltentitel), Filter-Slot und Zuständen für
 * Laden, Fehler und leer.
 *
 * @example
 * <DataTable
 *   rows={projects}
 *   getRowId={(p) => p.id}
 *   columns={[
 *     { id: 'name', header: tp('name'), cell: (p) => p.name, sortValue: (p) => p.name },
 *     { id: 'start', header: tp('start'), cell: (p) => fmt.date(p.startDate), sortValue: (p) => p.startDate }
 *   ]}
 *   filters={<Input value={q} onChange={…} />}
 *   filtered={q !== ''}
 *   loading={loading} error={errorText} onRetry={reload}
 * />
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  filters,
  filtered = false,
  initialSort,
  loading = false,
  error,
  onRetry,
  empty,
  footer,
  onRowClick,
  caption,
  className
}: DataTableProps<T>) {
  const t = useT(uiDict)
  const { language } = useI18n()
  const [sort, setSort] = useState<SortState | null>(initialSort ?? null)

  const sorted = useMemo(() => {
    const column = sort ? columns.find((c) => c.id === sort.columnId) : undefined
    if (!sort || !column?.sortValue) return rows
    return sortRows(rows, column.sortValue, sort.direction, LOCALES[language])
  }, [rows, columns, sort, language])

  const colSpan = columns.length
  let state: ReactNode = null
  // Bei leerer Liste steht der Zustand in der Tabelle, sonst ein Fehler darunter.
  if (loading && rows.length === 0) state = t('loading')
  else if (error)
    state = (
      <span className="inline-flex items-center gap-3 text-destructive" role="alert">
        {error}
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            {t('retry')}
          </Button>
        )}
      </span>
    )
  else if (rows.length === 0) state = filtered ? t('emptyFiltered') : (empty ?? t('empty'))

  return (
    <div className={cn('grid gap-3', className)}>
      {filters && <div className="flex flex-wrap items-end gap-3">{filters}</div>}
      <Table aria-busy={loading || undefined}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <TableHeader>
          <TableRow>
            {columns.map((c) => {
              const active = sort?.columnId === c.id
              const ariaSort = active
                ? sort.direction === 'asc'
                  ? 'ascending'
                  : 'descending'
                : undefined
              const Icon = !active ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown
              return (
                <TableHead
                  key={c.id}
                  aria-sort={c.sortValue ? (ariaSort ?? 'none') : undefined}
                  className={cn(c.align === 'right' && 'text-right', c.className)}
                >
                  {c.sortValue ? (
                    <button
                      type="button"
                      onClick={() => setSort((s) => nextSort(s, c.id))}
                      title={t('sortBy', { column: c.header })}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
                        c.align === 'right' && 'flex-row-reverse'
                      )}
                    >
                      {c.header}
                      <Icon
                        aria-hidden="true"
                        className={cn('size-3.5', !active && 'opacity-40')}
                      />
                      {active && (
                        <span className="sr-only">
                          {sort.direction === 'asc' ? t('sortAscending') : t('sortDescending')}
                        </span>
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={colSpan}
                className="py-8 text-center text-muted-foreground whitespace-normal"
              >
                {state}
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((row) => (
              <TableRow
                key={getRowId(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(onRowClick && 'cursor-pointer')}
              >
                {columns.map((c) => (
                  <TableCell
                    key={c.id}
                    className={cn(c.align === 'right' && 'text-right tabular-nums', c.className)}
                  >
                    {c.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
        {footer && rows.length > 0 && <TableFooter>{footer}</TableFooter>}
      </Table>
      {error && rows.length > 0 && <div className="text-sm">{state}</div>}
    </div>
  )
}
