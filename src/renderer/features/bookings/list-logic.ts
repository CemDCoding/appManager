import type { Ledger, LedgerErrorCode, LedgerKind } from '@core/ledger/ledger'
import type { Money } from '@shared/money'

/**
 * Eine Zeile der Ausgaben-/Einnahmenliste: eine Buchung an einem Tag (bei wiederkehrenden
 * Posten je Fälligkeit). Fasst die Ledger-Einträge je Projekt zusammen; gerechnet wird
 * nur im Ledger (AP-09), hier wird nur gruppiert und summiert.
 */
export interface BookingRow {
  /** Eindeutig je Zeile: `${sourceId}|${date}`. */
  key: string
  sourceId: string
  date: string
  category: string
  /** Betrag der Buchung in Originalwährung (ganzer Betrag, nicht der Anteil). */
  original: Money
  /**
   * Summe in EUR-Cent der angezeigten Anteile (bei Projektfilter nur der Anteil dieses
   * Projekts), `null` bei Umrechnungsfehler.
   */
  eurCents: number | null
  /** Projekte mit Anteil (Reihenfolge wie im Ledger). */
  projectIds: string[]
  /** Kein aktives Projekt am Buchungstag (Warnsymbol). */
  unallocated: boolean
  /** Umrechnungsfehler aus `ledger.errors` (Warnsymbol). */
  error: LedgerErrorCode | null
}

export interface BookingFilter {
  /** '' = alle Projekte. */
  projectId: string
  /** '' = alle Kategorien. */
  category: string
}

/**
 * Zeilen für Ausgaben (`expense`) oder Einnahmen (`income`) aus dem Ledger des Zeitraums.
 * Nur Quellen vom Typ `kind` (Kampagnen erscheinen hier nicht, sie haben eine eigene
 * Seite). Projektfilter: nur Zeilen mit Anteil an diesem Projekt, Betrag = Anteil.
 * Nicht umrechenbare Buchungen erscheinen immer (gefiltert nur nach Kategorie), damit
 * Fehler sichtbar bleiben. Sortiert nach Datum absteigend.
 */
export function bookingRows(
  ledger: Ledger,
  kind: LedgerKind,
  filter: BookingFilter,
  /** Kategorie der Quelle (Ledger-Fehler enthalten keine Kategorie). */
  categoryOf: (sourceId: string) => string | undefined
): BookingRow[] {
  const rows = new Map<string, BookingRow>()
  for (const e of ledger.entries) {
    if (e.sourceType !== kind || e.kind !== kind) continue
    if (filter.category !== '' && e.category !== filter.category) continue
    const key = `${e.sourceId}|${e.date}`
    let row = rows.get(key)
    if (!row) {
      row = {
        key,
        sourceId: e.sourceId,
        date: e.date,
        category: e.category,
        original: { ...e.original },
        eurCents: 0,
        projectIds: [],
        unallocated: false,
        error: null
      }
      rows.set(key, row)
    }
    if (e.projectId !== null) row.projectIds.push(e.projectId)
    if (e.unallocated) row.unallocated = true
    if (filter.projectId === '' || e.projectId === filter.projectId) {
      row.eurCents = (row.eurCents ?? 0) + e.eurCents
    }
  }
  const result = [...rows.values()].filter(
    (r) => filter.projectId === '' || r.projectIds.includes(filter.projectId)
  )
  for (const err of ledger.errors) {
    if (err.sourceType !== kind) continue
    const category = categoryOf(err.sourceId) ?? ''
    if (filter.category !== '' && category !== filter.category) continue
    result.push({
      key: `${err.sourceId}|${err.date}`,
      sourceId: err.sourceId,
      date: err.date,
      category,
      original: { ...err.original },
      eurCents: null,
      projectIds: [],
      unallocated: false,
      error: err.error
    })
  }
  return result.sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : a.key < b.key ? -1 : 1
  )
}

/** Summe der umrechenbaren Zeilen in EUR-Cent (exakt, PE-50). */
export function totalEurCents(rows: readonly BookingRow[]): number {
  return rows.reduce((sum, r) => sum + (r.eurCents ?? 0), 0)
}

/** Zeilen mit Warnsymbol (nicht zuordenbar oder nicht umrechenbar). */
export function hasWarning(row: BookingRow): boolean {
  return row.unallocated || row.error !== null
}
