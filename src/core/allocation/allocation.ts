import type { Allocation } from '@shared/schemas/common'
import type { Result } from '@core/money/money'

export type SplitError = 'invalidTotal' | 'noWeights' | 'invalidWeight' | 'zeroWeightSum'

/** Weighted participant of a cost. `weight` is 1 for equal split, basis points for percent. */
export interface ResolvedShare {
  projectId: string
  weight: number
}

/**
 * Splits `totalCents` by integer weights (largest remainder method, PE-28).
 * Rule: floor(total * w / sum) per entry, remaining cents go to the entries with the
 * largest fractional remainder; ties go to the earlier list position. The parts always
 * sum to exactly `totalCents`. Uses BigInt, no float arithmetic.
 */
export function splitCents(
  totalCents: number,
  weights: readonly number[]
): Result<number[], SplitError> {
  if (!Number.isSafeInteger(totalCents) || totalCents < 0) return { ok: false, error: 'invalidTotal' }
  if (weights.length === 0) return { ok: false, error: 'noWeights' }
  if (weights.some((w) => !Number.isSafeInteger(w) || w < 0)) {
    return { ok: false, error: 'invalidWeight' }
  }
  const sum = weights.reduce((acc, w) => acc + BigInt(w), 0n)
  if (sum === 0n) return { ok: false, error: 'zeroWeightSum' }

  const total = BigInt(totalCents)
  const parts = weights.map((w) => (total * BigInt(w)) / sum)
  const remainders = weights.map((w) => (total * BigInt(w)) % sum)
  let left = Number(total - parts.reduce((acc, p) => acc + p, 0n))

  const order = remainders
    .map((rem, index) => ({ rem, index }))
    .sort((a, b) => (a.rem === b.rem ? a.index - b.index : a.rem > b.rem ? -1 : 1))
  for (const { index } of order) {
    if (left === 0) break
    parts[index] += 1n
    left -= 1
  }
  return { ok: true, value: parts.map(Number) }
}

/**
 * Determines the projects a cost applies to on `date` (PE-06).
 * mode "all": every project for which `isActive(project, date)` holds, in list order,
 * weight 1. mode "selected": the chosen projects that exist in `projects`, in share
 * order (explicit choice, not filtered by activity); weight 1 for split "equal",
 * the share's basis points for "percent".
 * No matching project -> { ok: false, error: 'unassignable' }.
 */
export function resolveProjects<P extends { id: string }>(
  allocation: Allocation,
  projects: readonly P[],
  date: string,
  isActive: (project: P, date: string) => boolean
): Result<ResolvedShare[], 'unassignable'> {
  let shares: ResolvedShare[]
  if (allocation.mode === 'all') {
    shares = projects.filter((p) => isActive(p, date)).map((p) => ({ projectId: p.id, weight: 1 }))
  } else {
    const known = new Set(projects.map((p) => p.id))
    shares = allocation.shares
      .filter((s) => known.has(s.projectId))
      .map((s) => ({
        projectId: s.projectId,
        weight: allocation.split === 'percent' ? s.percentBasisPoints : 1
      }))
  }
  if (shares.length === 0) return { ok: false, error: 'unassignable' }
  return { ok: true, value: shares }
}
