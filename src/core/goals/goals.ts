import type { Goal } from '@shared/schemas/goal'
import type { UserMetric } from '@shared/schemas/userMetric'
import { isValidDateString } from '@shared/schemas/common'
import type { Ledger, LedgerEntry } from '@core/ledger/ledger'
import { breakEven, type Forecast } from '@core/forecast/forecast'

/**
 * Goal progress (F-12, PE-37, PE-53). Pure: "today" is a parameter; money in integer EUR
 * cents, ratios in basis points (integer, rounded down so 10 000 means "target met").
 */

export type GoalStatus = 'achieved' | 'open' | 'missed'

export interface GoalProgress {
  /** Current value: EUR cents (revenue, costLimit, breakEven = cumulative income),
   *  user count (users) or 1/0 (free = done). */
  value: number
  /** Target: `goal.targetValue`; breakEven = cumulative expenses; free = 1. */
  target: number
  /** Progress in basis points 0..10 000 (costLimit: share of the limit used). */
  ratio: number
  status: GoalStatus
}

/** Inputs of `goalProgress`. */
export interface GoalData {
  /** Booking journal covering at least the goal period up to today (entries after today are ignored). */
  ledger: Ledger
  /** Forecast made for the same `today` (break-even goals). */
  forecast: Forecast
  userMetrics: readonly UserMetric[]
}

export const FULL_RATIO = 10_000

/** floor(value * 10 000 / target), capped at 10 000; target 0 -> `whenZero`. */
function ratioOf(value: number, target: number, whenZero: number): number {
  if (target === 0) return whenZero
  const r = Number((BigInt(value) * BigInt(FULL_RATIO)) / BigInt(target))
  return Math.min(FULL_RATIO, r)
}

function sumEntries(entries: readonly LedgerEntry[], keep: (e: LedgerEntry) => boolean): number {
  let sum = 0
  for (const e of entries) if (keep(e)) sum += e.eurCents
  if (!Number.isSafeInteger(sum)) throw new RangeError('Sum exceeds the safe integer range')
  return sum
}

/** Latest `usersTotal` per project at or before `date`, summed (no snapshot = 0). */
function latestUsers(
  snapshots: readonly UserMetric[],
  projectId: string | null,
  date: string
): number {
  const latest = new Map<string, UserMetric>()
  for (const s of snapshots) {
    if (s.date > date || (projectId !== null && s.projectId !== projectId)) continue
    const prev = latest.get(s.projectId)
    if (prev === undefined || s.date > prev.date) latest.set(s.projectId, s)
  }
  let total = 0
  for (const s of latest.values()) total += s.usersTotal
  return total
}

/**
 * Progress of one goal on `today` (PE-53). The goal's project (`projectId`, null =
 * portfolio incl. unallocated entries) selects the ledger entries and user snapshots. The
 * reference day is `ref = min(today, dueDate)`, so a goal is frozen once its due date passed.
 * - revenue: incomes from `fromDate` (inclusive, open if absent) to `ref`; achieved when
 *   value >= target.
 * - breakEven: value = cumulative incomes, target = cumulative expenses up to `ref`; achieved
 *   when the break-even month (PE-30, already reached) is <= the month of `dueDate`.
 * - users: latest `usersTotal` at or before `ref` (portfolio: sum over projects); achieved
 *   when value >= target.
 * - costLimit: expenses in the month of `ref` from its 1st to `ref`; within the limit =
 *   achieved, above = missed (cannot be undone this month). Ratio = share of the limit used.
 * - free: achieved when `done`.
 * Status otherwise: `missed` when today > dueDate, else `open` (no due date: never missed).
 * A goal without data has value 0. Throws RangeError for an invalid `today` or a forecast
 * made for another day.
 */
export function goalProgress(goal: Goal, data: GoalData, today: string): GoalProgress {
  if (!isValidDateString(today)) throw new RangeError(`Invalid date: ${today}`)
  if (data.forecast.today !== today) {
    throw new RangeError(`Forecast is for ${data.forecast.today}, not ${today}`)
  }
  const due = goal.dueDate
  const ref = due !== undefined && due < today ? due : today
  const pending: GoalStatus = due !== undefined && today > due ? 'missed' : 'open'
  const ofGoal = (e: LedgerEntry): boolean =>
    e.date <= ref && (goal.projectId === null || e.projectId === goal.projectId)
  const target = goal.targetValue ?? 0

  switch (goal.kind) {
    case 'revenue':
    case 'users': {
      const value =
        goal.kind === 'users'
          ? latestUsers(data.userMetrics, goal.projectId, ref)
          : sumEntries(
              data.ledger.entries,
              (e) =>
                ofGoal(e) &&
                e.kind === 'income' &&
                (goal.fromDate === undefined || e.date >= goal.fromDate)
            )
      const status = value >= target ? 'achieved' : pending
      return { value, target, ratio: ratioOf(value, target, FULL_RATIO), status }
    }
    case 'costLimit': {
      const month = ref.slice(0, 7)
      const value = sumEntries(
        data.ledger.entries,
        (e) => ofGoal(e) && e.kind === 'expense' && e.date.startsWith(month)
      )
      const status = value <= target ? 'achieved' : 'missed'
      return { value, target, ratio: ratioOf(value, target, value > 0 ? FULL_RATIO : 0), status }
    }
    case 'breakEven': {
      const value = sumEntries(data.ledger.entries, (e) => ofGoal(e) && e.kind === 'income')
      const cost = sumEntries(data.ledger.entries, (e) => ofGoal(e) && e.kind === 'expense')
      const result = breakEven(data.ledger, data.forecast, goal.projectId)
      const achieved =
        typeof result === 'object' &&
        'reachedAt' in result &&
        (due === undefined || result.reachedAt <= due.slice(0, 7))
      return {
        value,
        target: cost,
        ratio: achieved ? FULL_RATIO : ratioOf(value, cost, 0),
        status: achieved ? 'achieved' : pending
      }
    }
    case 'free':
      return {
        value: goal.done ? 1 : 0,
        target: 1,
        ratio: goal.done ? FULL_RATIO : 0,
        status: goal.done ? 'achieved' : pending
      }
  }
}
