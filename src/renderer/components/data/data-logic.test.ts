import { describe, expect, it } from 'vitest'
import { changePeriodKind, isValidPeriod, periodFor, quarterOf, shiftPeriod } from './period-logic'
import { nextSort, sortRows } from './table-logic'

describe('periodFor', () => {
  it('builds month, quarter, year and custom ranges', () => {
    expect(periodFor('month', '2026-02-10')).toEqual({
      kind: 'month',
      from: '2026-02-01',
      to: '2026-02-28'
    })
    expect(periodFor('month', '2028-02-10').to).toBe('2028-02-29')
    expect(periodFor('quarter', '2026-05-10')).toEqual({
      kind: 'quarter',
      from: '2026-04-01',
      to: '2026-06-30'
    })
    expect(periodFor('quarter', '2026-12-31')).toEqual({
      kind: 'quarter',
      from: '2026-10-01',
      to: '2026-12-31'
    })
    expect(periodFor('year', '2026-07-01')).toEqual({
      kind: 'year',
      from: '2026-01-01',
      to: '2026-12-31'
    })
    expect(periodFor('custom', '2026-07-01')).toEqual({
      kind: 'custom',
      from: '2026-07-01',
      to: '2026-07-01'
    })
    expect(() => periodFor('month', '2026-13-01')).toThrow(RangeError)
  })

  it('shifts across year boundaries', () => {
    expect(shiftPeriod(periodFor('month', '2026-01-15'), -1)).toEqual(
      periodFor('month', '2025-12-01')
    )
    expect(shiftPeriod(periodFor('quarter', '2026-11-01'), 1)).toEqual(
      periodFor('quarter', '2027-01-01')
    )
    expect(shiftPeriod(periodFor('year', '2026-01-01'), -2)).toEqual(
      periodFor('year', '2024-01-01')
    )
    const custom = { kind: 'custom' as const, from: '2026-01-01', to: '2026-02-01' }
    expect(shiftPeriod(custom, 1)).toBe(custom)
    const last = periodFor('year', '9999-01-01')
    expect(shiftPeriod(last, 1)).toBe(last)
  })

  it('changes kind keeping the start', () => {
    expect(changePeriodKind(periodFor('month', '2026-08-01'), 'quarter')).toEqual(
      periodFor('quarter', '2026-07-01')
    )
    expect(changePeriodKind(periodFor('year', '2026-08-01'), 'custom')).toEqual({
      kind: 'custom',
      from: '2026-01-01',
      to: '2026-12-31'
    })
  })

  it('validates custom periods and quarters', () => {
    expect(isValidPeriod({ from: '2026-01-01', to: '2026-01-01' })).toBe(true)
    expect(isValidPeriod({ from: '2026-02-01', to: '2026-01-01' })).toBe(false)
    expect(isValidPeriod({ from: '', to: '2026-01-01' })).toBe(false)
    expect(quarterOf('2026-03-31')).toBe(1)
    expect(quarterOf('2026-10-01')).toBe(4)
  })
})

describe('sortRows', () => {
  const rows = [
    { name: 'beta', cents: 300 },
    { name: 'Alpha', cents: -5 },
    { name: '', cents: null },
    { name: 'Äpfel', cents: 20 },
    { name: 'item 10', cents: 300 },
    { name: 'item 2', cents: 1 }
  ]

  it('sorts text with the locale collator, empty values last', () => {
    expect(sortRows(rows, (r) => r.name, 'asc', 'de-DE').map((r) => r.name)).toEqual([
      'Alpha',
      'Äpfel',
      'beta',
      'item 2',
      'item 10',
      ''
    ])
    expect(sortRows(rows, (r) => r.name, 'desc', 'de-DE').at(-1)?.name).toBe('')
  })

  it('sorts numbers stably', () => {
    expect(sortRows(rows, (r) => r.cents, 'desc', 'en-US').map((r) => r.name)).toEqual([
      'beta',
      'item 10',
      'Äpfel',
      'item 2',
      'Alpha',
      ''
    ])
  })

  it('cycles sort direction', () => {
    expect(nextSort(null, 'a')).toEqual({ columnId: 'a', direction: 'asc' })
    expect(nextSort({ columnId: 'a', direction: 'asc' }, 'a')).toEqual({
      columnId: 'a',
      direction: 'desc'
    })
    expect(nextSort({ columnId: 'a', direction: 'desc' }, 'b')).toEqual({
      columnId: 'b',
      direction: 'asc'
    })
  })
})
