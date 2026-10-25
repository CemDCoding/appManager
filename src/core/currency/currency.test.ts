import { describe, expect, it } from 'vitest'
import { convertForDisplay, fromEur, latestRate, toEur, type RateEntry } from './currency'

const rate = (currency: string, r: string, enteredOn: string, createdAt?: string): RateEntry => ({
  currency,
  rate: r,
  enteredOn,
  ...(createdAt ? { createdAt } : {})
})

describe('toEur', () => {
  it('returns EUR unchanged', () => {
    expect(toEur({ cents: 123, currency: 'EUR' }, '1')).toEqual({
      ok: true,
      value: { cents: 123, currency: 'EUR' }
    })
  })
  it('converts reference cases exactly', () => {
    // 100.00 USD * 0.92 = 92.00 EUR
    expect(toEur({ cents: 10000, currency: 'USD' }, '0.92')).toEqual({
      ok: true,
      value: { cents: 9200, currency: 'EUR' }
    })
    // 1 cent * 0.5 = 0.5 -> half-up 1
    expect(toEur({ cents: 1, currency: 'USD' }, '0.5')).toMatchObject({ value: { cents: 1 } })
    // 1 cent * 0.499999 -> 0
    expect(toEur({ cents: 1, currency: 'USD' }, '0.499999')).toMatchObject({ value: { cents: 0 } })
    // 6 decimals: 12345 * 1.234567 = 15240.8...
    expect(toEur({ cents: 12345, currency: 'JPY' }, '1.234567')).toMatchObject({
      value: { cents: 15241 }
    })
  })
  it('rounds only at the end (no float error)', () => {
    // 0.1 + 0.2 style: 3 cents * 0.1 = 0.3 -> 0
    expect(toEur({ cents: 3, currency: 'USD' }, '0.1')).toMatchObject({ value: { cents: 0 } })
    expect(toEur({ cents: 5, currency: 'USD' }, '0.3')).toMatchObject({ value: { cents: 2 } })
  })
  it('handles very large amounts and overflow', () => {
    expect(toEur({ cents: 9_000_000_000_000_000, currency: 'USD' }, '1')).toMatchObject({
      value: { cents: 9_000_000_000_000_000 }
    })
    expect(toEur({ cents: 9_000_000_000_000_000, currency: 'USD' }, '2')).toEqual({
      ok: false,
      error: 'overflow'
    })
  })
  it('rejects invalid rates', () => {
    for (const bad of ['0', '0.0', '-1', 'abc', '', '1e3']) {
      expect(toEur({ cents: 1, currency: 'USD' }, bad)).toEqual({ ok: false, error: 'invalidRate' })
    }
  })
})

describe('fromEur', () => {
  it('divides by rate with half-up', () => {
    expect(fromEur(9200, '0.92')).toEqual({ ok: true, value: 10000 })
    expect(fromEur(100, '3')).toEqual({ ok: true, value: 33 })
    expect(fromEur(101, '2')).toEqual({ ok: true, value: 51 })
    expect(fromEur(0, '0.92')).toEqual({ ok: true, value: 0 })
  })
  it('handles 6 decimal rates', () => {
    expect(fromEur(100000, '0.006789')).toEqual({ ok: true, value: 14729710 })
  })
  it('reports invalid rate and overflow', () => {
    expect(fromEur(1, '0')).toEqual({ ok: false, error: 'invalidRate' })
    expect(fromEur(Number.MAX_SAFE_INTEGER, '0.5')).toEqual({ ok: false, error: 'overflow' })
  })
})

describe('latestRate', () => {
  const rates = [
    rate('USD', '0.90', '2026-01-01'),
    rate('USD', '0.95', '2026-03-01'),
    rate('GBP', '1.17', '2026-05-01'),
    rate('USD', '0.93', '2026-02-01')
  ]
  it('picks newest entry', () => {
    expect(latestRate(rates, 'USD')?.rate).toBe('0.95')
  })
  it('respects at', () => {
    expect(latestRate(rates, 'USD', '2026-02-15')?.rate).toBe('0.93')
    expect(latestRate(rates, 'USD', '2025-12-31')).toBeNull()
  })
  it('returns null for unknown currency', () => {
    expect(latestRate(rates, 'CHF')).toBeNull()
    expect(latestRate([], 'USD')).toBeNull()
  })
  it('breaks ties by createdAt, then list position', () => {
    const t = [
      rate('USD', '1', '2026-01-01', '2026-01-01T10:00:00Z'),
      rate('USD', '2', '2026-01-01', '2026-01-01T11:00:00Z'),
      rate('USD', '3', '2026-01-01', '2026-01-01T09:00:00Z')
    ]
    expect(latestRate(t, 'USD')?.rate).toBe('2')
    const u = [rate('USD', '1', '2026-01-01'), rate('USD', '2', '2026-01-01')]
    expect(latestRate(u, 'USD')?.rate).toBe('2')
  })
})

describe('convertForDisplay', () => {
  const rates = [rate('USD', '0.80', '2026-01-01'), rate('USD', '0.50', '2026-06-01')]
  it('same currency unchanged', () => {
    expect(
      convertForDisplay({ cents: 500, currency: 'USD' }, '0.9', 'USD', rates)
    ).toEqual({ ok: true, value: { cents: 500, currency: 'USD' } })
  })
  it('booking -> EUR display uses the snapshot', () => {
    expect(
      convertForDisplay({ cents: 1000, currency: 'GBP' }, '1.17', 'EUR', rates)
    ).toEqual({ ok: true, value: { cents: 1170, currency: 'EUR' } })
  })
  it('EUR -> display uses the newest rate', () => {
    expect(
      convertForDisplay({ cents: 1000, currency: 'EUR' }, '1', 'USD', rates)
    ).toEqual({ ok: true, value: { cents: 2000, currency: 'USD' } })
  })
  it('foreign -> foreign goes via EUR', () => {
    // 1000 GBP * 1.17 = 1170 EUR; / 0.5 = 2340 USD
    expect(
      convertForDisplay({ cents: 1000, currency: 'GBP' }, '1.17', 'USD', rates)
    ).toEqual({ ok: true, value: { cents: 2340, currency: 'USD' } })
  })
  it('missing rate is an error value, never 1', () => {
    expect(
      convertForDisplay({ cents: 1000, currency: 'EUR' }, '1', 'CHF', rates)
    ).toEqual({ ok: false, error: 'missingRate' })
  })
  it('propagates snapshot errors', () => {
    expect(
      convertForDisplay({ cents: 1000, currency: 'GBP' }, '0', 'USD', rates)
    ).toEqual({ ok: false, error: 'invalidRate' })
    expect(
      convertForDisplay({ cents: 1000, currency: 'USD' }, '1', 'USD', [rate('USD', '0', '2026-01-01')])
    ).toMatchObject({ ok: true })
    expect(
      convertForDisplay({ cents: 1000, currency: 'EUR' }, '1', 'USD', [rate('USD', '0', '2026-01-01')])
    ).toEqual({ ok: false, error: 'invalidRate' })
  })
})
