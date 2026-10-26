/**
 * Reine Datenaufbereitung für die Diagramm-Bausteine (ohne React, testbar).
 * Geldwerte bleiben ganzzahlige Cent; formatiert wird nur über die Formatierer.
 */

/**
 * Farben ausschließlich aus den Theme-Variablen (PE-21); Abstufungen über
 * `color-mix`, damit Hell/Dunkel automatisch folgt.
 */
export const CHART_COLORS: readonly string[] = [
  'var(--primary)',
  'var(--destructive)',
  'color-mix(in oklch, var(--primary) 55%, var(--foreground))',
  'color-mix(in oklch, var(--destructive) 55%, var(--foreground))',
  'color-mix(in oklch, var(--primary) 60%, var(--background))',
  'color-mix(in oklch, var(--destructive) 60%, var(--background))',
  'var(--muted-foreground)',
  'color-mix(in oklch, var(--foreground) 70%, var(--background))'
]

/** Farbe der i-ten Reihe/Scheibe (zyklisch). */
export function seriesColor(index: number): string {
  const n = CHART_COLORS.length
  return CHART_COLORS[((Math.trunc(index) % n) + n) % n]
}

export const INCOME_COLOR = 'var(--primary)'
export const EXPENSE_COLOR = 'var(--destructive)'
export const BALANCE_COLOR = 'var(--foreground)'
export const AXIS_COLOR = 'var(--muted-foreground)'
export const GRID_COLOR = 'var(--border)'

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

export interface MonthlyPoint {
  /** Monat `YYYY-MM`. */
  month: string
  incomeCents: number
  expenseCents: number
}

export interface MonthlyRow extends MonthlyPoint {
  balanceCents: number
}

/**
 * Sortiert nach Monat, fasst doppelte Monate zusammen, verwirft ungültige
 * Monate/Beträge und ergänzt den Saldo (Einnahmen − Ausgaben, ganze Cent).
 */
export function buildMonthlyRows(points: readonly MonthlyPoint[]): MonthlyRow[] {
  const byMonth = new Map<string, MonthlyPoint>()
  for (const p of points) {
    if (!MONTH.test(p.month) || !Number.isFinite(p.incomeCents) || !Number.isFinite(p.expenseCents))
      continue
    const prev = byMonth.get(p.month)
    byMonth.set(p.month, {
      month: p.month,
      incomeCents: (prev?.incomeCents ?? 0) + p.incomeCents,
      expenseCents: (prev?.expenseCents ?? 0) + p.expenseCents
    })
  }
  return [...byMonth.values()]
    .sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0))
    .map((p) => ({ ...p, balanceCents: p.incomeCents - p.expenseCents }))
}

/** `YYYY-MM` → `YYYY-MM-01` (für `formatDate`). */
export function monthToDate(month: string): string {
  return `${month}-01`
}

export interface DonutItem {
  /** Stabiler Schlüssel (z. B. Kategorie-Key). */
  key: string
  label: string
  /** Betrag in Cent (nur Werte > 0 werden gezeigt). */
  cents: number
}

export interface DonutSlice extends DonutItem {
  share: number
  color: string
  /** Sammelscheibe „Sonstige“. */
  isOther: boolean
}

/**
 * Sortiert absteigend, verwirft Werte ≤ 0, fasst alles ab `maxSlices` zu einer
 * Sammelscheibe `otherLabel` zusammen und berechnet die Anteile (0..1).
 */
export function buildDonutSlices(
  items: readonly DonutItem[],
  otherLabel: string,
  maxSlices = 8
): DonutSlice[] {
  const valid = items
    .filter((i) => Number.isFinite(i.cents) && i.cents > 0)
    .sort((a, b) => b.cents - a.cents)
  const limit = Math.max(1, Math.trunc(maxSlices))
  let kept: DonutItem[] = valid
  let isOtherLast = false
  if (valid.length > limit) {
    const head = valid.slice(0, limit - 1)
    const rest = valid.slice(limit - 1)
    kept = [
      ...head,
      { key: '__other', label: otherLabel, cents: rest.reduce((s, i) => s + i.cents, 0) }
    ]
    isOtherLast = true
  }
  const total = kept.reduce((s, i) => s + i.cents, 0)
  return kept.map((item, index) => ({
    ...item,
    share: total > 0 ? item.cents / total : 0,
    color: seriesColor(index),
    isOther: isOtherLast && index === kept.length - 1
  }))
}

export interface LineSeriesInput {
  id: string
  label: string
  points: readonly { x: string; value: number }[]
}

export type LineRow = { x: string } & Record<string, number | string | undefined>

/**
 * Führt mehrere Reihen zu Zeilen je X-Wert zusammen (Reihenfolge der ersten
 * Nennung bleibt erhalten). Nicht endliche Werte werden ausgelassen.
 */
export function buildLineRows(series: readonly LineSeriesInput[]): LineRow[] {
  const rows = new Map<string, LineRow>()
  for (const s of series) {
    for (const p of s.points) {
      if (!Number.isFinite(p.value)) continue
      const row = rows.get(p.x) ?? { x: p.x }
      row[s.id] = p.value
      rows.set(p.x, row)
    }
  }
  return [...rows.values()]
}

/** Werte → Punkte `{ i, v }` für die Sparkline; nicht endliche Werte entfallen. */
export function buildSparklinePoints(values: readonly number[]): { i: number; v: number }[] {
  return values.filter((v) => Number.isFinite(v)).map((v, i) => ({ i, v }))
}
