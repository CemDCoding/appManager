import { isValidDateString } from '@shared/schemas/common'

export type PeriodKind = 'month' | 'quarter' | 'year' | 'custom'

export const PERIOD_KINDS: readonly PeriodKind[] = ['month', 'quarter', 'year', 'custom']

/** Zeitraum mit inklusiven Grenzen "YYYY-MM-DD" (passt zu `buildLedger(…, { from, to })`). */
export interface Period {
  kind: PeriodKind
  from: string
  to: string
}

const pad = (n: number, len = 2): string => String(n).padStart(len, '0')

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function parts(date: string): { year: number; month: number } {
  return { year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) }
}

function monthRange(
  year: number,
  firstMonth: number,
  months: number
): { from: string; to: string } {
  const lastMonth = firstMonth + months - 1
  return {
    from: `${pad(year, 4)}-${pad(firstMonth)}-01`,
    to: `${pad(year, 4)}-${pad(lastMonth)}-${pad(lastDayOfMonth(year, lastMonth))}`
  }
}

/**
 * Zeitraum der Art `kind`, der `anchor` enthält. `custom` ergibt den Tag selbst
 * (Grenzen frei änderbar). Ungültiger Anker → RangeError.
 *
 * @example
 * periodFor('quarter', '2026-05-10') // { kind: 'quarter', from: '2026-04-01', to: '2026-06-30' }
 */
export function periodFor(kind: PeriodKind, anchor: string): Period {
  if (!isValidDateString(anchor)) throw new RangeError(`Invalid date: ${anchor}`)
  const { year, month } = parts(anchor)
  switch (kind) {
    case 'month':
      return { kind, ...monthRange(year, month, 1) }
    case 'quarter':
      return { kind, ...monthRange(year, Math.floor((month - 1) / 3) * 3 + 1, 3) }
    case 'year':
      return { kind, ...monthRange(year, 1, 12) }
    case 'custom':
      return { kind, from: anchor, to: anchor }
  }
}

/**
 * Verschiebt Monat/Quartal/Jahr um `steps` (±). `custom` bleibt unverändert.
 * Grenzen außerhalb 0001–9999 ergeben den unveränderten Zeitraum.
 */
export function shiftPeriod(period: Period, steps: number): Period {
  if (period.kind === 'custom' || steps === 0) return period
  const { year, month } = parts(period.from)
  const monthsPerStep = period.kind === 'month' ? 1 : period.kind === 'quarter' ? 3 : 12
  const index = year * 12 + (month - 1) + steps * monthsPerStep
  const newYear = Math.floor(index / 12)
  if (newYear < 1 || newYear > 9999) return period
  return periodFor(period.kind, `${pad(newYear, 4)}-${pad((index % 12) + 1)}-01`)
}

/** Wechselt die Art und behält den Start des bisherigen Zeitraums als Anker. */
export function changePeriodKind(period: Period, kind: PeriodKind): Period {
  if (kind === 'custom') return { kind, from: period.from, to: period.to }
  return periodFor(kind, period.from)
}

/** Freier Zeitraum gültig? (beide Daten gültig, `from <= to`) */
export function isValidPeriod(period: Pick<Period, 'from' | 'to'>): boolean {
  return isValidDateString(period.from) && isValidDateString(period.to) && period.from <= period.to
}

/** Quartalsnummer 1–4 des Zeitraum-Starts. */
export function quarterOf(date: string): number {
  return Math.floor((parts(date).month - 1) / 3) + 1
}
