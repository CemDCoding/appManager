export type SortDirection = 'asc' | 'desc'
export type SortValue = string | number | null | undefined

export interface SortState {
  columnId: string
  direction: SortDirection
}

/**
 * Sortiert stabil nach `getValue`. Texte nach `Intl.Collator` der Sprache
 * (Groß/Klein egal, Zahlen in Texten natürlich), Zahlen numerisch. Leere Werte
 * (`null`, `undefined`, '') stehen immer am Ende, auch absteigend.
 *
 * @example
 * sortRows(projects, (p) => p.name, 'asc', 'de-DE')
 */
export function sortRows<T>(
  rows: readonly T[],
  getValue: (row: T) => SortValue,
  direction: SortDirection,
  locale: string
): T[] {
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true })
  const factor = direction === 'asc' ? 1 : -1
  const isEmpty = (v: SortValue): v is null | undefined | '' =>
    v === null || v === undefined || v === ''
  return rows
    .map((row, index) => ({ row, index, value: getValue(row) }))
    .sort((a, b) => {
      const aEmpty = isEmpty(a.value)
      const bEmpty = isEmpty(b.value)
      if (aEmpty || bEmpty) return aEmpty === bEmpty ? a.index - b.index : aEmpty ? 1 : -1
      let cmp: number
      if (typeof a.value === 'number' && typeof b.value === 'number') {
        cmp = a.value < b.value ? -1 : a.value > b.value ? 1 : 0
      } else {
        cmp = collator.compare(String(a.value), String(b.value))
      }
      return cmp === 0 ? a.index - b.index : cmp * factor
    })
    .map((x) => x.row)
}

/** Nächster Sortierzustand beim Klick auf eine Spalte: neu → aufsteigend, sonst umdrehen. */
export function nextSort(current: SortState | null, columnId: string): SortState {
  if (current?.columnId !== columnId) return { columnId, direction: 'asc' }
  return { columnId, direction: current.direction === 'asc' ? 'desc' : 'asc' }
}
