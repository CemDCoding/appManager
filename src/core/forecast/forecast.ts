import { isValidDateString } from '@shared/schemas/common'
import { buildLedger, type Ledger, type LedgerError, type LedgerInput } from '@core/ledger/ledger'

/**
 * Forecast and break-even (F-09, PE-16, PE-29, PE-30). Pure: "today" is a parameter,
 * no clock; money in integer EUR cents, sums checked against the safe integer range.
 */

/** Data the forecast needs (campaigns are one-time bookings and never forecast). */
export type ForecastInput = Pick<LedgerInput, 'projects' | 'expenses' | 'incomes'>

export interface ForecastTotals {
  incomeCents: number
  expenseCents: number
  /** income - expense (may be negative). */
  balanceCents: number
}

export interface ForecastProjectMonth extends ForecastTotals {
  /** Receiving project; null = unallocated (no active project on the due date). */
  projectId: string | null
}

export interface ForecastMonth extends ForecastTotals {
  /** "YYYY-MM". */
  month: string
  /** Projects with bookings this month in project list order, null (unallocated) last. */
  byProject: ForecastProjectMonth[]
}

export interface Forecast {
  /** The "today" the forecast was made for; due dates on `today` are NOT included. */
  today: string
  /** First forecast day (today + 1). */
  from: string
  /** Last forecast day (last day of the month `months` after today's month). */
  to: string
  /** Every month from `from` to `to`, ascending, also months without bookings. */
  months: ForecastMonth[]
  /** Due dates that could not be converted (not contained in the sums). */
  errors: LedgerError[]
}

export const DEFAULT_FORECAST_MONTHS = 12
export const MAX_FORECAST_MONTHS = 120

const MS_PER_DAY = 86_400_000

function pad(n: number, len: number): string {
  return String(n).padStart(len, '0')
}

function fromUtc(ms: number): string {
  const d = new Date(ms)
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1, 2)}-${pad(d.getUTCDate(), 2)}`
}

function parts(date: string): { y: number; m: number; d: number } {
  return { y: Number(date.slice(0, 4)), m: Number(date.slice(5, 7)), d: Number(date.slice(8, 10)) }
}

/** `date` + 1 day. */
export function nextDay(date: string): string {
  const { y, m, d } = parts(date)
  return fromUtc(Date.UTC(y, m - 1, d) + MS_PER_DAY)
}

/** Last day of the month `offset` months after the month of `date`. */
export function endOfMonthAfter(date: string, offset: number): string {
  const { y, m } = parts(date)
  // Day 0 of the following month is the last day of the target month.
  return fromUtc(Date.UTC(y, m + offset, 0))
}

/** Months since year 0 (y * 12 + m - 1). */
function monthIndex(date: string): number {
  const { y, m } = parts(date)
  return y * 12 + m - 1
}

/** Month keys "YYYY-MM" from the month of `from` to the month of `to`, ascending. */
function monthKeys(from: string, to: string): string[] {
  const keys: string[] = []
  for (let i = monthIndex(from); i <= monthIndex(to); i++) {
    keys.push(`${pad(Math.floor(i / 12), 4)}-${pad((i % 12) + 1, 2)}`)
  }
  return keys
}

function safeAdd(a: number, b: number): number {
  const sum = a + b
  if (!Number.isSafeInteger(sum)) throw new RangeError('Sum exceeds the safe integer range')
  return sum
}

function emptyTotals(): ForecastTotals {
  return { incomeCents: 0, expenseCents: 0, balanceCents: 0 }
}

function book(t: ForecastTotals, kind: 'income' | 'expense', cents: number): void {
  if (kind === 'income') t.incomeCents = safeAdd(t.incomeCents, cents)
  else t.expenseCents = safeAdd(t.expenseCents, cents)
  t.balanceCents = t.incomeCents - t.expenseCents
}

/**
 * Forecast of all recurring expenses and incomes (PE-30) from tomorrow up to the end of the
 * month `months` after today's month (today = 2026-10-26, months = 12 -> 2026-10-27 ..
 * 2027-10-31, i.e. the rest of the current month plus 12 full months; today = last day of a
 * month -> exactly 12 full months). Booking "as paid" (PE-29): full amount on each due date
 * with the price valid that day, converted with the snapshot rate, split onto the projects
 * active on the due date (PE-50) - identical to `buildLedger`. Incomes keep their project
 * without activity check (PE-58). Throws RangeError for an invalid `today`, `months` outside
 * 1..120 or sums beyond the safe integer range.
 */
export function forecast(
  data: ForecastInput,
  today: string,
  months: number = DEFAULT_FORECAST_MONTHS
): Forecast {
  if (!isValidDateString(today)) throw new RangeError(`Invalid date: ${today}`)
  if (!Number.isInteger(months) || months < 1 || months > MAX_FORECAST_MONTHS) {
    throw new RangeError(`Invalid number of months: ${String(months)}`)
  }
  const from = nextDay(today)
  const to = endOfMonthAfter(today, months)
  const ledger = buildLedger(
    {
      projects: data.projects,
      expenses: data.expenses.filter((e) => e.kind === 'recurring'),
      incomes: data.incomes.filter((i) => i.kind === 'recurring'),
      campaigns: []
    },
    { from, to }
  )

  // Ledger entries only carry known project ids or null (unknown ids become unallocated).
  const ids: (string | null)[] = [...new Set(data.projects.map((p) => p.id)), null]
  // One bucket per month; every ledger entry lies in [from, to], so its offset is in range.
  const buckets = monthKeys(from, to).map((month) => ({
    month,
    totals: emptyTotals(),
    projects: new Map<string | null, ForecastTotals>()
  }))
  const first = monthIndex(from)
  for (const e of ledger.entries) {
    const bucket = buckets[monthIndex(e.date) - first]
    book(bucket.totals, e.kind, e.eurCents)
    let project = bucket.projects.get(e.projectId)
    if (project === undefined) {
      project = emptyTotals()
      bucket.projects.set(e.projectId, project)
    }
    book(project, e.kind, e.eurCents)
  }

  return {
    today,
    from,
    to,
    months: buckets.map((b) => ({
      month: b.month,
      ...b.totals,
      byProject: ids.flatMap((projectId) => {
        const t = b.projects.get(projectId)
        return t === undefined ? [] : [{ projectId, ...t }]
      })
    })),
    errors: ledger.errors
  }
}

// ---------------------------------------------------------------- break-even (PE-30)

/** Month "YYYY-MM" of break-even: already reached (history) or expected (forecast). */
export type BreakEven = { reachedAt: string } | { expectedAt: string } | 'notInSight'

interface MonthSums {
  income: bigint
  expense: bigint
}

function addTo(map: Map<string, MonthSums>, month: string, income: number, expense: number): void {
  const sums = map.get(month) ?? { income: 0n, expense: 0n }
  sums.income += BigInt(income)
  sums.expense += BigInt(expense)
  map.set(month, sums)
}

/**
 * First month in which the cumulative incomes of a project are >= its cumulative expenses
 * (PE-30), counted from the first month with a booking of the project (expenses are never
 * booked before the project start, PE-50). `ledgerHistory` is the journal up to today
 * (entries after `forecast.today` are ignored, so an overlapping range is never counted
 * twice); `forecast` continues it from tomorrow. `projectId` null = whole portfolio
 * (all entries including unallocated ones).
 * Result: `{ reachedAt }` if the history alone (up to today) reaches it, `{ expectedAt }` if
 * only the forecast does (within the forecast horizon), otherwise `'notInSight'` (also
 * without any booking). Exact integer comparison, no rounding.
 */
export function breakEven(
  ledgerHistory: Ledger,
  forecastResult: Forecast,
  projectId: string | null
): BreakEven {
  const matches = (id: string | null): boolean => projectId === null || id === projectId
  const history = new Map<string, MonthSums>()
  for (const e of ledgerHistory.entries) {
    if (e.date > forecastResult.today || !matches(e.projectId)) continue
    addTo(
      history,
      e.date.slice(0, 7),
      e.kind === 'income' ? e.eurCents : 0,
      e.kind === 'expense' ? e.eurCents : 0
    )
  }
  const future = new Map<string, MonthSums>()
  for (const m of forecastResult.months) {
    for (const p of m.byProject) {
      if (matches(p.projectId)) addTo(future, m.month, p.incomeCents, p.expenseCents)
    }
  }

  const months = [...new Set([...history.keys(), ...future.keys()])].sort()
  let income = 0n
  let expense = 0n
  for (const month of months) {
    const h = history.get(month)
    if (h !== undefined) {
      income += h.income
      expense += h.expense
      if (income >= expense) return { reachedAt: month }
    }
    const f = future.get(month)
    if (f !== undefined) {
      income += f.income
      expense += f.expense
      if (income >= expense) return { expectedAt: month }
    }
  }
  return 'notInSight'
}
