import { describe, expect, it } from 'vitest'
import {
  CHART_COLORS,
  buildDonutSlices,
  buildLineRows,
  buildMonthlyRows,
  buildSparklinePoints,
  monthToDate,
  seriesColor
} from './chart-logic'

describe('seriesColor', () => {
  it('cycles and only uses CSS variables', () => {
    expect(seriesColor(0)).toBe(CHART_COLORS[0])
    expect(seriesColor(CHART_COLORS.length)).toBe(CHART_COLORS[0])
    expect(seriesColor(-1)).toBe(CHART_COLORS[CHART_COLORS.length - 1])
    for (const c of CHART_COLORS) expect(c).toContain('var(--')
    for (const c of CHART_COLORS) expect(c).not.toMatch(/#[0-9a-f]{3}|rgb\(|hsl\(/i)
  })
})

describe('buildMonthlyRows', () => {
  it('sorts, merges duplicates, computes balance and drops invalid input', () => {
    const rows = buildMonthlyRows([
      { month: '2026-03', incomeCents: 100, expenseCents: 300 },
      { month: '2026-01', incomeCents: 500, expenseCents: 200 },
      { month: '2026-03', incomeCents: 50, expenseCents: 0 },
      { month: '2026-13', incomeCents: 1, expenseCents: 1 },
      { month: '2026-02', incomeCents: Number.NaN, expenseCents: 1 }
    ])
    expect(rows.map((r) => r.month)).toEqual(['2026-01', '2026-03'])
    expect(rows[0].balanceCents).toBe(300)
    expect(rows[1]).toMatchObject({ incomeCents: 150, expenseCents: 300, balanceCents: -150 })
  })
  it('handles empty input', () => {
    expect(buildMonthlyRows([])).toEqual([])
  })
})

describe('monthToDate', () => {
  it('appends the first day', () => expect(monthToDate('2026-05')).toBe('2026-05-01'))
})

describe('buildDonutSlices', () => {
  const item = (key: string, cents: number) => ({ key, label: key, cents })
  it('sorts descending, drops non-positive values and computes shares', () => {
    const s = buildDonutSlices(
      [item('a', 100), item('b', 300), item('c', 0), item('d', -5)],
      'Other'
    )
    expect(s.map((x) => x.key)).toEqual(['b', 'a'])
    expect(s[0].share).toBeCloseTo(0.75)
    expect(s[0].color).not.toBe(s[1].color)
    expect(s.every((x) => !x.isOther)).toBe(true)
  })
  it('groups the tail into one other slice', () => {
    const s = buildDonutSlices(
      [item('a', 50), item('b', 40), item('c', 30), item('d', 20), item('e', 10)],
      'Other',
      3
    )
    expect(s.map((x) => x.key)).toEqual(['a', 'b', '__other'])
    expect(s[2]).toMatchObject({ label: 'Other', cents: 60, isOther: true })
    expect(s.reduce((sum, x) => sum + x.share, 0)).toBeCloseTo(1)
  })
  it('returns nothing without positive data', () => {
    expect(buildDonutSlices([item('a', 0)], 'Other')).toEqual([])
  })
})

describe('buildLineRows', () => {
  it('merges series by x and skips non-finite values', () => {
    const rows = buildLineRows([
      {
        id: 'u',
        label: 'U',
        points: [
          { x: '1', value: 1 },
          { x: '2', value: Number.NaN }
        ]
      },
      {
        id: 'c',
        label: 'C',
        points: [
          { x: '2', value: 7 },
          { x: '3', value: 9 }
        ]
      }
    ])
    expect(rows).toEqual([
      { x: '1', u: 1 },
      { x: '2', c: 7 },
      { x: '3', c: 9 }
    ])
  })
})

describe('buildSparklinePoints', () => {
  it('indexes finite values', () => {
    expect(buildSparklinePoints([1, Number.NaN, 3])).toEqual([
      { i: 0, v: 1 },
      { i: 1, v: 3 }
    ])
  })
})
