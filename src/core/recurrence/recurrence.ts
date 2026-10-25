import type { Recurrence } from '@shared/schemas/common'
import { isValidDateString } from '@shared/schemas/common'

/**
 * Recurrence core (PE-07, PE-29). Pure calendar arithmetic on "YYYY-MM-DD"
 * strings; no timezone, no `new Date()` without explicit components.
 */

const MS_PER_DAY = 86_400_000

interface Ymd {
  y: number
  m: number
  d: number
}

function assertDate(value: string): void {
  if (!isValidDateString(value)) throw new RangeError(`Invalid date: ${value}`)
}

function parse(value: string): Ymd {
  return {
    y: Number(value.slice(0, 4)),
    m: Number(value.slice(5, 7)),
    d: Number(value.slice(8, 10))
  }
}

function pad(n: number, len: number): string {
  return String(n).padStart(len, '0')
}

function format(y: number, m: number, d: number): string {
  return `${pad(y, 4)}-${pad(m, 2)}-${pad(d, 2)}`
}

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}

function daysInMonth(y: number, m: number): number {
  if (m === 2) return isLeapYear(y) ? 29 : 28
  return m === 4 || m === 6 || m === 9 || m === 11 ? 30 : 31
}

function dayNumber(value: string): number {
  const { y, m, d } = parse(value)
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY)
}

function fromDayNumber(n: number): string {
  const dt = new Date(n * MS_PER_DAY)
  return format(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
}

/**
 * The n-th due date (n = 0 is `startDate`) of a recurrence, ignoring end date.
 * Rules: daily +n days, weekly +7n days; monthly/yearly keep the ORIGINAL day of
 * month of `startDate` and clamp to the month's last day (31.01 -> 28./29.02 ->
 * 31.03; 29.02 yearly -> 28.02 in non-leap years). Never drifts.
 */
function nthDueDate(r: Recurrence, n: number): string {
  const s = parse(r.startDate)
  if (r.interval === 'daily') return fromDayNumber(dayNumber(r.startDate) + n)
  if (r.interval === 'weekly') return fromDayNumber(dayNumber(r.startDate) + 7 * n)
  const monthsTotal = s.y * 12 + (s.m - 1) + (r.interval === 'monthly' ? n : 12 * n)
  const y = Math.floor(monthsTotal / 12)
  const m = (monthsTotal % 12) + 1
  return format(y, m, Math.min(s.d, daysInMonth(y, m)))
}

/** First index n whose due date could be >= from (never too large). */
function firstIndex(r: Recurrence, from: string): number {
  if (from <= r.startDate) return 0
  if (r.interval === 'daily') return dayNumber(from) - dayNumber(r.startDate)
  if (r.interval === 'weekly') return Math.floor((dayNumber(from) - dayNumber(r.startDate)) / 7)
  const a = parse(r.startDate)
  const b = parse(from)
  const months = (b.y - a.y) * 12 + (b.m - a.m)
  return Math.max(0, r.interval === 'monthly' ? months - 1 : Math.floor(months / 12) - 1)
}

/**
 * All due dates of `recurrence` within [from, to], both bounds inclusive,
 * ascending, as "YYYY-MM-DD". Starts at `startDate` (inclusive); `endDate`
 * (if set) is inclusive: a due date equal to `endDate` is returned.
 * Month-end rule: see {@link nthDueDate} (PE-29). Throws RangeError on
 * invalid dates.
 */
export function occurrences(recurrence: Recurrence, from: string, to: string): string[] {
  assertDate(from)
  assertDate(to)
  assertDate(recurrence.startDate)
  if (recurrence.endDate !== undefined) assertDate(recurrence.endDate)
  const last = recurrence.endDate !== undefined && recurrence.endDate < to ? recurrence.endDate : to
  const result: string[] = []
  for (let n = firstIndex(recurrence, from); ; n++) {
    const due = nthDueDate(recurrence, n)
    // Past year 9999 the formatted date gets 5 digits and sorts lexicographically
    // below `last`; stop there (calendar maximum).
    if (due.length > 10 || due > last) break
    if (due >= from) result.push(due)
  }
  return result
}

/**
 * Amount in cents on `date`: the last price change with `fromDate <= date`
 * (a change exactly on the due date applies), otherwise `baseCents`
 * (the amount stored on the expense/income). Price changes need not be sorted.
 */
export function amountAt(
  recurrence: Pick<Recurrence, 'priceChanges'>,
  baseCents: number,
  date: string
): number {
  assertDate(date)
  let best: { fromDate: string; cents: number } | undefined
  for (const p of recurrence.priceChanges) {
    if (p.fromDate <= date && (best === undefined || p.fromDate >= best.fromDate)) best = p
  }
  return best === undefined ? baseCents : best.cents
}

/** Due dates in [from, to] with their amount (see {@link amountAt}). */
export function occurrencesWithAmount(
  recurrence: Recurrence,
  baseCents: number,
  from: string,
  to: string
): { date: string; cents: number }[] {
  return occurrences(recurrence, from, to).map((date) => ({
    date,
    cents: amountAt(recurrence, baseCents, date)
  }))
}
