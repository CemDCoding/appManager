import { describe, expect, it } from 'vitest'
import type { RateEntry } from '@core/currency/currency'
import { toDisplay } from './display'

const rates: RateEntry[] = [
  { currency: 'USD', rate: '0.80', enteredOn: '2026-01-01' },
  { currency: 'USD', rate: '0.90', enteredOn: '2026-06-01' },
  { currency: 'XYZ', rate: '1000', enteredOn: '2026-01-01' }
]

describe('toDisplay', () => {
  it('EUR stays unchanged', () => {
    expect(toDisplay(12_345, 'EUR', [])).toEqual({
      ok: true,
      value: { cents: 12_345, currency: 'EUR' }
    })
  })

  it('converts with the newest rate, half-up', () => {
    // 1000 / 0.9 = 1111.11 -> 1111 ; 1 / 0.9 = 1.11 -> 1 ; 5 / 0.9 = 5.56 -> 6
    expect(toDisplay(1000, 'USD', rates)).toEqual({
      ok: true,
      value: { cents: 1111, currency: 'USD' }
    })
    expect(toDisplay(5, 'USD', rates)).toEqual({ ok: true, value: { cents: 6, currency: 'USD' } })
  })

  it('negative balances are converted symmetrically', () => {
    expect(toDisplay(-5, 'USD', rates)).toEqual({ ok: true, value: { cents: -6, currency: 'USD' } })
    expect(toDisplay(-1, 'XYZ', rates)).toEqual({ ok: true, value: { cents: 0, currency: 'XYZ' } })
    expect(toDisplay(-7, 'EUR', [])).toEqual({ ok: true, value: { cents: -7, currency: 'EUR' } })
  })

  it('missing rate is a visible error, not a silent 1', () => {
    expect(toDisplay(100, 'GBP', rates)).toEqual({ ok: false, error: 'missingRate' })
    expect(toDisplay(-100, 'GBP', rates)).toEqual({ ok: false, error: 'missingRate' })
  })

  it('non-integer input is rejected', () => {
    expect(toDisplay(0.5, 'USD', rates)).toEqual({ ok: false, error: 'overflow' })
    expect(toDisplay(Number.MAX_SAFE_INTEGER + 1, 'USD', rates)).toEqual({
      ok: false,
      error: 'overflow'
    })
  })
})
