import { describe, expect, it } from 'vitest'
import {
  allocationPreview,
  draftFromAllocation,
  emptyAllocationDraft,
  equalPercentTexts,
  parsePercentToBasisPoints,
  setAllocationMode,
  setAllocationPercent,
  setAllocationProjects,
  setAllocationSplit,
  validateAllocationDraft,
  type AllocationDraft
} from './allocation-logic'

const A = '00000000-0000-4000-8000-00000000000a'
const B = '00000000-0000-4000-8000-00000000000b'
const C = '00000000-0000-4000-8000-00000000000c'
const projects = [
  { id: A, startDate: '2026-01-01' },
  { id: B, startDate: '2026-01-01', endDate: '2026-03-31' },
  { id: C, startDate: '2026-01-01' }
]

function selected(ids: string[], split: 'equal' | 'percent' = 'equal'): AllocationDraft {
  const d = setAllocationProjects(setAllocationMode(emptyAllocationDraft(), 'selected'), ids, 'de')
  return setAllocationSplit(d, split, 'de')
}

describe('allocation preview (acceptance)', () => {
  it('splits 100 € on 3 projects into 33,34 / 33,33 / 33,33', () => {
    const { allocation } = validateAllocationDraft(selected([A, B, C]), 'de')
    expect(allocationPreview(allocation, projects, 10_000, '2026-02-01')).toEqual({
      ok: true,
      value: [
        { projectId: A, cents: 3334 },
        { projectId: B, cents: 3333 },
        { projectId: C, cents: 3333 }
      ]
    })
  })

  it('"all" uses the projects active on the date', () => {
    const { allocation } = validateAllocationDraft(emptyAllocationDraft(), 'de')
    expect(allocation).toEqual({ mode: 'all', split: 'equal', shares: [] })
    const r = allocationPreview(allocation, projects, 1001, '2026-04-01')
    expect(r).toEqual({
      ok: true,
      value: [
        { projectId: A, cents: 501 },
        { projectId: C, cents: 500 }
      ]
    })
    expect(allocationPreview(allocation, projects, 1000, '2025-01-01')).toEqual({
      ok: false,
      error: 'unassignable'
    })
  })

  it('percent split follows basis points', () => {
    let d = selected([A, B], 'percent')
    d = setAllocationPercent(setAllocationPercent(d, A, '60'), B, '40')
    const { allocation } = validateAllocationDraft(d, 'de')
    expect(allocationPreview(allocation, projects, 5000, '2026-02-01')).toEqual({
      ok: true,
      value: [
        { projectId: A, cents: 3000 },
        { projectId: B, cents: 2000 }
      ]
    })
  })

  it('reports missing amount, invalid allocation and invalid date', () => {
    const { allocation } = validateAllocationDraft(selected([A]), 'de')
    expect(allocationPreview(allocation, projects, null, '2026-02-01')).toEqual({
      ok: false,
      error: 'invalidAmount'
    })
    expect(allocationPreview(null, projects, 100, '2026-02-01')).toEqual({
      ok: false,
      error: 'invalidAllocation'
    })
    const all = validateAllocationDraft(emptyAllocationDraft(), 'de').allocation
    expect(allocationPreview(all, projects, 100, 'kein Datum')).toEqual({
      ok: false,
      error: 'invalidDate'
    })
  })
})

describe('validateAllocationDraft', () => {
  it('blocks saving when percentages do not sum to 100 %', () => {
    let d = selected([A, B], 'percent')
    d = setAllocationPercent(setAllocationPercent(d, A, '60'), B, '30')
    const v = validateAllocationDraft(d, 'de')
    expect(v.allocation).toBeNull()
    expect(v.issues).toEqual(['percentSumInvalid'])
    expect(v.percentSumBasisPoints).toBe(9000)
  })

  it('accepts exactly 100 % with decimals', () => {
    const d = selected([A, B, C], 'percent')
    expect(d.percentTexts).toEqual({ [A]: '33,34', [B]: '33,33', [C]: '33,33' })
    const v = validateAllocationDraft(d, 'de')
    expect(v.issues).toEqual([])
    expect(v.allocation?.shares.map((s) => s.percentBasisPoints)).toEqual([3334, 3333, 3333])
  })

  it('reports invalid percent text and empty selection', () => {
    const d = setAllocationPercent(selected([A, B], 'percent'), A, 'abc')
    expect(validateAllocationDraft(d, 'de').issues).toEqual(['invalidPercent'])
    expect(validateAllocationDraft(selected([]), 'de')).toEqual({
      allocation: null,
      issues: ['noProjectSelected'],
      percentSumBasisPoints: null
    })
  })

  it('"all" always means equal split', () => {
    const d = setAllocationMode(selected([A], 'percent'), 'all')
    expect(d.split).toBe('equal')
  })

  it('round-trips a stored allocation', () => {
    const stored = {
      mode: 'selected' as const,
      split: 'percent' as const,
      shares: [
        { projectId: A, percentBasisPoints: 2500 },
        { projectId: B, percentBasisPoints: 7500 }
      ]
    }
    const d = draftFromAllocation(stored, 'en')
    expect(d.percentTexts).toEqual({ [A]: '25.00', [B]: '75.00' })
    expect(validateAllocationDraft(d, 'en').allocation).toEqual(stored)
  })
})

describe('percent helpers', () => {
  it('parses percent to basis points', () => {
    expect(parsePercentToBasisPoints('33,33', 'de')).toEqual({ ok: true, value: 3333 })
    expect(parsePercentToBasisPoints('100', 'en')).toEqual({ ok: true, value: 10_000 })
    expect(parsePercentToBasisPoints('100,01', 'de')).toEqual({
      ok: false,
      error: 'invalidPercent'
    })
    expect(parsePercentToBasisPoints('', 'de')).toEqual({ ok: false, error: 'invalidPercent' })
  })

  it('equal percents always sum to 100 %', () => {
    expect(equalPercentTexts([], 'de')).toEqual({})
    expect(equalPercentTexts([A, B], 'en')).toEqual({ [A]: '50.00', [B]: '50.00' })
  })
})
