import { describe, expect, it } from 'vitest'
import type { Allocation } from '@shared/schemas/common'
import { resolveProjects, splitCents } from './allocation'

/** Seeded PRNG (mulberry32), deterministic. */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const val = (r: ReturnType<typeof splitCents>): number[] => {
  if (!r.ok) throw new Error(r.error)
  return r.value
}

describe('splitCents', () => {
  it('100,00 / 3 = 33,34 + 33,33 + 33,33', () => {
    expect(val(splitCents(10000, [1, 1, 1]))).toEqual([3334, 3333, 3333])
  })
  it('0 cents and 1 cent on 3', () => {
    expect(val(splitCents(0, [1, 1, 1]))).toEqual([0, 0, 0])
    expect(val(splitCents(1, [1, 1, 1]))).toEqual([1, 0, 0])
    expect(val(splitCents(2, [1, 1, 1]))).toEqual([1, 1, 0])
  })
  it('percent 33.33/33.33/33.34', () => {
    expect(val(splitCents(10000, [3333, 3333, 3334]))).toEqual([3333, 3333, 3334])
    expect(val(splitCents(1, [3333, 3333, 3334]))).toEqual([0, 0, 1])
  })
  it('largest remainder wins, ties by position', () => {
    // 10 on weights 1,2: 3.33 -> 3 r.33 ; 6.67 -> 6 r.67 ; extra to second
    expect(val(splitCents(10, [1, 2]))).toEqual([3, 7])
    expect(val(splitCents(5, [1, 1]))).toEqual([3, 2])
  })
  it('zero weights get nothing', () => {
    expect(val(splitCents(7, [0, 1, 0]))).toEqual([0, 7, 0])
  })
  it('handles very large totals exactly', () => {
    const parts = val(splitCents(Number.MAX_SAFE_INTEGER, [3333, 3333, 3334]))
    expect(parts.reduce((a, b) => a + b, 0)).toBe(Number.MAX_SAFE_INTEGER)
  })
  it('returns error values', () => {
    expect(splitCents(-1, [1])).toEqual({ ok: false, error: 'invalidTotal' })
    expect(splitCents(1.5, [1])).toEqual({ ok: false, error: 'invalidTotal' })
    expect(splitCents(1, [])).toEqual({ ok: false, error: 'noWeights' })
    expect(splitCents(1, [-1])).toEqual({ ok: false, error: 'invalidWeight' })
    expect(splitCents(1, [0.5])).toEqual({ ok: false, error: 'invalidWeight' })
    expect(splitCents(1, [0, 0])).toEqual({ ok: false, error: 'zeroWeightSum' })
  })
  it('property: parts always sum to total, deterministic, within 1 of the quota', () => {
    const next = rng(20261025)
    for (let i = 0; i < 3000; i++) {
      const total = Math.floor(next() * (i % 10 === 0 ? Number.MAX_SAFE_INTEGER : 1_000_000))
      const n = 1 + Math.floor(next() * 12)
      const weights = Array.from({ length: n }, () => Math.floor(next() * 10_001))
      if (weights.reduce((x, y) => x + y, 0) === 0) weights[0] = 1
      const a = val(splitCents(total, weights))
      expect(a).toEqual(val(splitCents(total, weights)))
      expect(a.reduce((x, y) => x + y, 0)).toBe(total)
      const sum = weights.reduce((x, y) => x + y, 0)
      a.forEach((p, k) => {
        const w = weights[k] ?? 0
        const exact = (BigInt(total) * BigInt(w)) / BigInt(sum)
        expect(BigInt(p) - exact === 0n || BigInt(p) - exact === 1n).toBe(true)
      })
    }
  })
})

describe('resolveProjects', () => {
  const projects = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  const isActive = (p: { id: string }, date: string): boolean => p.id !== 'b' || date >= '2026-02-01'
  const all: Allocation = { mode: 'all', split: 'equal', shares: [] }

  it('mode all uses active projects at the date, in list order', () => {
    expect(resolveProjects(all, projects, '2026-01-01', isActive)).toEqual({
      ok: true,
      value: [
        { projectId: 'a', weight: 1 },
        { projectId: 'c', weight: 1 }
      ]
    })
    const later = resolveProjects(all, projects, '2026-03-01', isActive)
    expect(later.ok && later.value.length).toBe(3)
  })
  it('mode selected equal', () => {
    const al: Allocation = {
      mode: 'selected',
      split: 'equal',
      shares: [
        { projectId: 'c', percentBasisPoints: 0 },
        { projectId: 'a', percentBasisPoints: 0 }
      ]
    }
    expect(resolveProjects(al, projects, '2026-01-01', isActive)).toEqual({
      ok: true,
      value: [
        { projectId: 'c', weight: 1 },
        { projectId: 'a', weight: 1 }
      ]
    })
  })
  it('mode selected percent, unknown projects dropped', () => {
    const al: Allocation = {
      mode: 'selected',
      split: 'percent',
      shares: [
        { projectId: 'a', percentBasisPoints: 6000 },
        { projectId: 'zzz', percentBasisPoints: 1000 },
        { projectId: 'b', percentBasisPoints: 3000 }
      ]
    }
    expect(resolveProjects(al, projects, '2026-01-01', isActive)).toEqual({
      ok: true,
      value: [
        { projectId: 'a', weight: 6000 },
        { projectId: 'b', weight: 3000 }
      ]
    })
  })
  it('empty set is unassignable', () => {
    expect(resolveProjects(all, [], '2026-01-01', isActive)).toEqual({
      ok: false,
      error: 'unassignable'
    })
    expect(resolveProjects(all, projects, '2026-01-01', () => false)).toEqual({
      ok: false,
      error: 'unassignable'
    })
    const al: Allocation = {
      mode: 'selected',
      split: 'equal',
      shares: [{ projectId: 'zzz', percentBasisPoints: 0 }]
    }
    expect(resolveProjects(al, projects, '2026-01-01', isActive).ok).toBe(false)
  })
})
