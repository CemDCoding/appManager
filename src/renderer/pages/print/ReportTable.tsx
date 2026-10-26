import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface ReportColumn<T> {
  header: string
  cell: (row: T) => ReactNode
  align?: 'left' | 'right'
}

export interface ReportTableProps<T> {
  caption: string
  columns: readonly ReportColumn<T>[]
  rows: readonly T[]
  rowKey: (row: T, index: number) => string
  /** Summenzeile (eine Zelle je Spalte). */
  footer?: readonly ReactNode[]
  empty: string
}

/** Schlichte Drucktabelle (ohne Sortierung, ohne Bedienelemente). */
export function ReportTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  footer,
  empty
}: ReportTableProps<T>) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>
  }
  const alignClass = (align: ReportColumn<T>['align']) =>
    align === 'right' ? 'text-right tabular-nums' : 'text-left'
  return (
    <table className="w-full border-collapse text-xs">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-foreground/40">
          {columns.map((c) => (
            <th
              key={c.header}
              scope="col"
              className={cn('px-1.5 py-1 font-semibold', alignClass(c.align))}
            >
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={rowKey(row, i)} className="break-inside-avoid border-b border-border">
            {columns.map((c) => (
              <td key={c.header} className={cn('px-1.5 py-1 align-top', alignClass(c.align))}>
                {c.cell(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      {footer && (
        <tfoot>
          <tr className="border-t border-foreground/40 font-semibold">
            {footer.map((cell, i) => (
              <td key={i} className={cn('px-1.5 py-1', alignClass(columns[i]?.align ?? 'left'))}>
                {cell}
              </td>
            ))}
          </tr>
        </tfoot>
      )}
    </table>
  )
}
