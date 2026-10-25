import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent,
  INVALID_VALUE,
  parseIsoDate
} from './format'

/** Intl nutzt geschützte Leerzeichen; für den Vergleich normalisieren. */
const plain = (value: string) => value.replace(/[  ]/g, ' ')

describe('formatMoney', () => {
  it('formats cents in German and English', () => {
    expect(plain(formatMoney(123456, 'EUR', 'de'))).toBe('1.234,56 €')
    expect(plain(formatMoney(123456, 'EUR', 'en'))).toBe('€1,234.56')
  })

  it('handles other currencies, negatives and zero', () => {
    expect(plain(formatMoney(999, 'USD', 'en'))).toBe('$9.99')
    expect(plain(formatMoney(-5000, 'EUR', 'de'))).toBe('-50,00 €')
    expect(plain(formatMoney(0, 'EUR', 'de'))).toBe('0,00 €')
  })

  it('returns a placeholder for invalid input', () => {
    expect(formatMoney(Number.NaN, 'EUR', 'de')).toBe(INVALID_VALUE)
    expect(formatMoney(100, 'euro', 'de')).toBe(INVALID_VALUE)
  })
})

describe('formatDate', () => {
  it('formats ISO dates without timezone shift', () => {
    expect(formatDate('2026-10-25', 'de')).toBe('25.10.2026')
    expect(formatDate('2026-10-25', 'en')).toBe('10/25/2026')
    expect(formatDate('2026-01-01', 'de')).toBe('01.01.2026')
  })

  it('accepts Date objects and custom options', () => {
    expect(formatDate(new Date(2026, 2, 5), 'de')).toBe('05.03.2026')
    expect(formatDate('2026-03-05', 'en', { month: 'long', year: 'numeric' })).toBe('March 2026')
    expect(formatDate('2026-03-05', 'de', { month: 'long', year: 'numeric' })).toBe('März 2026')
  })

  it('rejects invalid dates', () => {
    expect(formatDate('2026-02-30', 'de')).toBe(INVALID_VALUE)
    expect(formatDate('25.10.2026', 'de')).toBe(INVALID_VALUE)
    expect(formatDate(new Date(Number.NaN), 'en')).toBe(INVALID_VALUE)
    expect(parseIsoDate('2024-02-29')).not.toBeNull()
    expect(parseIsoDate('2025-02-29')).toBeNull()
  })
})

describe('formatNumber and formatPercent', () => {
  it('uses locale separators', () => {
    expect(formatNumber(1234.5, 'de')).toBe('1.234,5')
    expect(formatNumber(1234.5, 'en')).toBe('1,234.5')
    expect(formatNumber(Number.POSITIVE_INFINITY, 'en')).toBe(INVALID_VALUE)
  })

  it('formats ratios as percent', () => {
    expect(plain(formatPercent(0.125, 'de'))).toBe('12,5 %')
    expect(formatPercent(0.125, 'en')).toBe('12.5%')
    expect(formatPercent(1, 'en')).toBe('100%')
    expect(formatPercent(Number.NaN, 'de')).toBe(INVALID_VALUE)
  })
})
