import type { Money } from '@shared/money'
import type { Allocation } from '@shared/schemas/common'
import type { Project } from '@shared/schemas/project'
import type { Expense } from '@shared/schemas/expense'
import type { Income } from '@shared/schemas/income'
import type { Campaign } from '@shared/schemas/campaign'
import { ADVERTISING_CATEGORY } from '@shared/lists'
import { isValidDateString } from '@shared/schemas/common'
import { toEur, type CurrencyError } from '@core/currency/currency'
import { resolveProjects, splitCents, type ResolvedShare } from '@core/allocation/allocation'
import { occurrencesWithAmount } from '@core/recurrence/recurrence'
import { isActive } from '@core/projects/activePeriod'

/**
 * Booking engine (PE-49, PE-50). Pure: no clock, no I/O; same input -> same output.
 * Order per booking: amount (original currency) -> EUR cents with the booking's snapshot
 * rate -> split onto the projects active on the booking day (largest remainder) ->
 * one entry per project.
 */

export type LedgerKind = 'expense' | 'income'
export type LedgerSourceType = 'expense' | 'income' | 'campaign'

/** Project fields the engine needs. */
export type LedgerProject = Pick<Project, 'id' | 'startDate' | 'endDate'>

export interface LedgerEntry {
  /** Booking day "YYYY-MM-DD" (due date for recurring items, start date for campaigns). */
  date: string
  kind: LedgerKind
  /** Expense/income category key; campaigns always `advertising`. */
  category: string
  /** Receiving project, or null when no active project exists (see `unallocated`). */
  projectId: string | null
  /** This entry's share in EUR cents (exact, sums to the booking's EUR amount). */
  eurCents: number
  /** Full amount of the booking (not the share) in its original currency. */
  original: Money
  sourceType: LedgerSourceType
  sourceId: string
  personId?: string
  serviceId?: string
  /** Set when no active project could receive the booking; counts in the portfolio only. */
  unallocated?: true
}

export type LedgerErrorCode = CurrencyError

/** A booking that could not be converted; it is NOT contained in `entries`. */
export interface LedgerError {
  date: string
  sourceType: LedgerSourceType
  sourceId: string
  original: Money
  error: LedgerErrorCode
}

export interface Ledger {
  entries: LedgerEntry[]
  errors: LedgerError[]
}

export interface LedgerInput {
  projects: readonly LedgerProject[]
  expenses: readonly Expense[]
  incomes: readonly Income[]
  campaigns: readonly Campaign[]
}

/** Inclusive date range "YYYY-MM-DD". */
export interface DateRange {
  from: string
  to: string
}

/** Throws RangeError for an invalid or reversed range (programming error). */
export function assertRange(range: DateRange): void {
  if (!isValidDateString(range.from) || !isValidDateString(range.to) || range.from > range.to) {
    throw new RangeError(`Invalid range: ${range.from}..${range.to}`)
  }
}

/**
 * Projects that receive a cost on `date` with their weights (PE-06, PE-50).
 * `resolveProjects` filters only mode "all" by activity; here every share is additionally
 * filtered by `isActive` on `date` (also for mode "selected"), and zero weights are dropped.
 * Percent weights of the remaining projects keep their ratio. Empty list = unallocated.
 */
export function activeShares(
  allocation: Allocation,
  projects: readonly LedgerProject[],
  date: string
): ResolvedShare[] {
  const resolved = resolveProjects(allocation, projects, date, isActive)
  if (!resolved.ok) return []
  const byId = new Map(projects.map((p) => [p.id, p]))
  return resolved.value.filter((s) => {
    const project = byId.get(s.projectId)
    return s.weight > 0 && project !== undefined && isActive(project, date)
  })
}

/**
 * Splits `eurCents` onto the active shares. Returns one part per share in share order;
 * an empty share list yields a single unallocated part.
 */
export function splitOnto(
  eurCents: number,
  shares: readonly ResolvedShare[]
): { projectId: string | null; cents: number }[] {
  if (shares.length === 0) return [{ projectId: null, cents: eurCents }]
  const parts = splitCents(
    eurCents,
    shares.map((s) => s.weight)
  )
  if (!parts.ok) throw new Error(`Unexpected split error: ${parts.error}`)
  return shares.map((s, i) => ({ projectId: s.projectId, cents: parts.value[i] }))
}

interface Booking {
  date: string
  original: Money
  rateToEur: string
  kind: LedgerKind
  category: string
  sourceType: LedgerSourceType
  sourceId: string
  personId?: string
  serviceId?: string
  /** Fixed target (incomes) or allocation (expenses, campaigns). */
  target: { projectId: string } | { allocation: Allocation }
}

function datesOf(item: Expense | Income, range: DateRange): { date: string; cents: number }[] {
  if (item.kind === 'oneTime') {
    return item.date >= range.from && item.date <= range.to
      ? [{ date: item.date, cents: item.amount.cents }]
      : []
  }
  return occurrencesWithAmount(item.recurrence, item.amount.cents, range.from, range.to)
}

function collectBookings(input: LedgerInput, range: DateRange): Booking[] {
  const bookings: Booking[] = []
  for (const e of input.expenses) {
    for (const o of datesOf(e, range)) {
      bookings.push({
        date: o.date,
        original: { cents: o.cents, currency: e.amount.currency },
        rateToEur: e.rateToEur,
        kind: 'expense',
        category: e.category,
        sourceType: 'expense',
        sourceId: e.id,
        ...(e.personId !== undefined ? { personId: e.personId } : {}),
        ...(e.serviceId !== undefined ? { serviceId: e.serviceId } : {}),
        target: { allocation: e.allocation }
      })
    }
  }
  for (const inc of input.incomes) {
    for (const o of datesOf(inc, range)) {
      bookings.push({
        date: o.date,
        original: { cents: o.cents, currency: inc.amount.currency },
        rateToEur: inc.rateToEur,
        kind: 'income',
        category: inc.category,
        sourceType: 'income',
        sourceId: inc.id,
        target: { projectId: inc.projectId }
      })
    }
  }
  for (const c of input.campaigns) {
    if (c.startDate < range.from || c.startDate > range.to) continue
    bookings.push({
      date: c.startDate,
      original: { ...c.cost },
      rateToEur: c.rateToEur,
      kind: 'expense',
      category: ADVERTISING_CATEGORY,
      sourceType: 'campaign',
      sourceId: c.id,
      target: { allocation: c.allocation }
    })
  }
  return bookings
}

/**
 * Builds the booking journal for `range` (both bounds inclusive).
 * - One-time items count on their date, recurring items on every due date with the price
 *   valid that day (PE-29), campaigns once on their start date as `advertising` (PE-49).
 * - Conversion with the booking's snapshot rate, rounded half-up to cents once (PE-31);
 *   failures go to `errors` (never silently 0 or rate 1) and produce no entries.
 * - Expenses/campaigns are split onto projects active on the booking day (PE-28, PE-50);
 *   without an active project one entry with `projectId: null, unallocated: true` is made.
 * - Incomes go to their single project; an unknown project id yields an unallocated entry.
 * Entries are ordered by date, then expenses, incomes, campaigns in input order, then
 * share order. Throws RangeError for an invalid range.
 */
export function buildLedger(input: LedgerInput, range: DateRange): Ledger {
  assertRange(range)
  const known = new Set(input.projects.map((p) => p.id))
  const entries: LedgerEntry[] = []
  const errors: LedgerError[] = []

  for (const b of collectBookings(input, range)) {
    const eur = toEur(b.original, b.rateToEur)
    if (!eur.ok) {
      errors.push({
        date: b.date,
        sourceType: b.sourceType,
        sourceId: b.sourceId,
        original: b.original,
        error: eur.error
      })
      continue
    }
    const parts =
      'projectId' in b.target
        ? [
            {
              projectId: known.has(b.target.projectId) ? b.target.projectId : null,
              cents: eur.value.cents
            }
          ]
        : splitOnto(eur.value.cents, activeShares(b.target.allocation, input.projects, b.date))
    for (const part of parts) {
      entries.push({
        date: b.date,
        kind: b.kind,
        category: b.category,
        projectId: part.projectId,
        eurCents: part.cents,
        original: { ...b.original },
        sourceType: b.sourceType,
        sourceId: b.sourceId,
        ...(b.personId !== undefined ? { personId: b.personId } : {}),
        ...(b.serviceId !== undefined ? { serviceId: b.serviceId } : {}),
        ...(part.projectId === null ? { unallocated: true as const } : {})
      })
    }
  }

  const byDate = (a: { date: string }, b: { date: string }): number =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  entries.sort(byDate)
  errors.sort(byDate)
  return { entries, errors }
}
