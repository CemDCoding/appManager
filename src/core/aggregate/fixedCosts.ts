import type { Expense } from '@shared/schemas/expense'
import type { Recurrence } from '@shared/schemas/common'
import { isValidDateString } from '@shared/schemas/common'
import { toEur } from '@core/currency/currency'
import { amountAt } from '@core/recurrence/recurrence'
import {
  activeShares,
  splitOnto,
  type LedgerErrorCode,
  type LedgerProject
} from '@core/ledger/ledger'

/**
 * Key figure "fixed costs per month" (PE-51). Only a figure: bookings stay "as paid"
 * (PE-29). Pure and deterministic; `date` is passed in.
 */

export interface FixedCostsError {
  expenseId: string
  error: LedgerErrorCode
}

export interface MonthlyFixedCosts {
  /** Sum of all monthly equivalents in EUR cents (includes `unallocatedCents`). */
  totalCents: number
  /** One entry per given project, in input order (0 if nothing applies). */
  byProject: { projectId: string; cents: number }[]
  /** Part without an active project on `date`. */
  unallocatedCents: number
  /** Expenses whose amount could not be converted; not contained in the sums. */
  errors: FixedCostsError[]
}

/** Monthly factor as fraction numerator/denominator (PE-51). */
const FACTOR: Record<Recurrence['interval'], readonly [bigint, bigint]> = {
  daily: [365n, 12n],
  weekly: [52n, 12n],
  monthly: [1n, 1n],
  yearly: [1n, 12n]
}

/** round_half_up(cents * num / den) for non-negative cents, integer arithmetic only. */
export function monthlyEquivalent(cents: number, interval: Recurrence['interval']): number {
  const [num, den] = FACTOR[interval]
  return Number((2n * BigInt(cents) * num + den) / (2n * den))
}

/**
 * Monthly equivalent of all recurring expenses active on `date`
 * (startDate <= date <= endDate, end optional). Per expense (PE-50 order): price valid on
 * `date` -> EUR with the snapshot rate (cents, half-up) -> monthly equivalent (daily
 * x 365/12, weekly x 52/12, monthly x 1, yearly / 12, half-up to cents) -> split onto the
 * projects active on `date` (largest remainder). Throws RangeError for an invalid date.
 */
export function monthlyFixedCosts(
  expenses: readonly Expense[],
  projects: readonly LedgerProject[],
  date: string
): MonthlyFixedCosts {
  if (!isValidDateString(date)) throw new RangeError(`Invalid date: ${date}`)
  const perProject = new Map<string, number>(projects.map((p) => [p.id, 0]))
  let totalCents = 0
  let unallocatedCents = 0
  const errors: FixedCostsError[] = []

  for (const e of expenses) {
    if (e.kind !== 'recurring') continue
    const r = e.recurrence
    if (r.startDate > date || (r.endDate !== undefined && r.endDate < date)) continue
    const original = { cents: amountAt(r, e.amount.cents, date), currency: e.amount.currency }
    const eur = toEur(original, e.rateToEur)
    if (!eur.ok) {
      errors.push({ expenseId: e.id, error: eur.error })
      continue
    }
    const monthly = monthlyEquivalent(eur.value.cents, r.interval)
    totalCents = safe(totalCents + monthly)
    for (const part of splitOnto(monthly, activeShares(e.allocation, projects, date))) {
      if (part.projectId === null) unallocatedCents = safe(unallocatedCents + part.cents)
      else perProject.set(part.projectId, safe((perProject.get(part.projectId) ?? 0) + part.cents))
    }
  }

  return {
    totalCents,
    byProject: projects.map((p) => ({ projectId: p.id, cents: perProject.get(p.id) ?? 0 })),
    unallocatedCents,
    errors
  }
}

function safe(n: number): number {
  if (!Number.isSafeInteger(n)) throw new RangeError('Fixed cost sum exceeds safe integer range')
  return n
}
