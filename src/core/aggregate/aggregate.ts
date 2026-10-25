import type { LedgerEntry, LedgerKind, LedgerSourceType } from '@core/ledger/ledger'

/**
 * Aggregation of ledger entries (PE-50): exact integer sums in EUR cents, no rounding.
 * Pure and deterministic.
 */

export type GroupBy = 'month' | 'quarter' | 'year' | 'project' | 'category' | 'person' | 'service'

/** All set criteria must match (AND); an omitted criterion matches everything. */
export interface LedgerFilter {
  /** Inclusive lower date bound "YYYY-MM-DD". */
  from?: string
  /** Inclusive upper date bound "YYYY-MM-DD". */
  to?: string
  kind?: LedgerKind
  /** `null` in the list selects unallocated entries. */
  projectIds?: readonly (string | null)[]
  categories?: readonly string[]
  sourceTypes?: readonly LedgerSourceType[]
  personIds?: readonly string[]
  serviceIds?: readonly string[]
}

export interface AggregateOptions {
  groupBy: GroupBy
  filter?: LedgerFilter
}

export interface Totals {
  incomeCents: number
  expenseCents: number
  /** incomeCents - expenseCents (may be negative). */
  balanceCents: number
}

export interface AggregateGroup extends Totals {
  /**
   * month "YYYY-MM", quarter "YYYY-Q1".."YYYY-Q4", year "YYYY", project id,
   * category "<kind>:<category>" (e.g. "expense:other", "income:other"), person id,
   * service id. `null` = no project (unallocated) / no person / no service.
   */
  key: string | null
}

export interface AggregateResult {
  /** Sorted by key ascending (string order), the `null` group last. */
  groups: AggregateGroup[]
  /** Sums over all filtered entries (= sum of all groups). */
  total: Totals
}

function safeAdd(a: number, b: number): number {
  const sum = a + b
  if (!Number.isSafeInteger(sum)) throw new RangeError('Aggregate sum exceeds safe integer range')
  return sum
}

function matches(e: LedgerEntry, f: LedgerFilter): boolean {
  if (f.from !== undefined && e.date < f.from) return false
  if (f.to !== undefined && e.date > f.to) return false
  if (f.kind !== undefined && e.kind !== f.kind) return false
  if (f.projectIds !== undefined && !f.projectIds.includes(e.projectId)) return false
  if (f.categories !== undefined && !f.categories.includes(e.category)) return false
  if (f.sourceTypes !== undefined && !f.sourceTypes.includes(e.sourceType)) return false
  if (
    f.personIds !== undefined &&
    (e.personId === undefined || !f.personIds.includes(e.personId))
  ) {
    return false
  }
  if (
    f.serviceIds !== undefined &&
    (e.serviceId === undefined || !f.serviceIds.includes(e.serviceId))
  ) {
    return false
  }
  return true
}

/** Group key of an entry, see {@link AggregateGroup.key}. */
export function groupKey(e: LedgerEntry, groupBy: GroupBy): string | null {
  switch (groupBy) {
    case 'month':
      return e.date.slice(0, 7)
    case 'quarter':
      return `${e.date.slice(0, 4)}-Q${String(Math.ceil(Number(e.date.slice(5, 7)) / 3))}`
    case 'year':
      return e.date.slice(0, 4)
    case 'project':
      return e.projectId
    case 'category':
      return `${e.kind}:${e.category}`
    case 'person':
      return e.personId ?? null
    case 'service':
      return e.serviceId ?? null
  }
}

function emptyTotals(): Totals {
  return { incomeCents: 0, expenseCents: 0, balanceCents: 0 }
}

function addEntry(t: Totals, e: LedgerEntry): void {
  if (e.kind === 'income') t.incomeCents = safeAdd(t.incomeCents, e.eurCents)
  else t.expenseCents = safeAdd(t.expenseCents, e.eurCents)
  t.balanceCents = t.incomeCents - t.expenseCents
}

/**
 * Sums income, expense and balance (EUR cents) per group. Only groups with at least one
 * matching entry appear. Unallocated entries count in the totals (portfolio) and form
 * the `null` group when grouping by project. Throws RangeError on safe-integer overflow.
 */
export function aggregate(
  entries: readonly LedgerEntry[],
  options: AggregateOptions
): AggregateResult {
  const filter = options.filter ?? {}
  const map = new Map<string | null, Totals>()
  const total = emptyTotals()
  for (const e of entries) {
    if (!matches(e, filter)) continue
    const key = groupKey(e, options.groupBy)
    let t = map.get(key)
    if (t === undefined) {
      t = emptyTotals()
      map.set(key, t)
    }
    addEntry(t, e)
    addEntry(total, e)
  }
  const groups = [...map.entries()]
    .map(([key, t]) => ({ key, ...t }))
    .sort((a, b) => {
      // Keys are unique (map keys), so equality never occurs.
      if (a.key === null) return 1
      if (b.key === null) return -1
      return a.key < b.key ? -1 : 1
    })
  return { groups, total }
}
