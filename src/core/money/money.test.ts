import { describe, expect, it } from 'vitest'
import {
  CurrencyMismatchError,
  MoneyRangeError,
  addMoney,
  compareMoney,
  subtractMoney,
  sumMoney
} from './money'

const eur = (cents: number) => ({ cents, currency: 'EUR' })
const usd = (cents: number) => ({ cents, currency: 'USD' })

describe('money', () => {
  it('adds and subtracts same currency', () => {
    expect(addMoney(eur(10), eur(5))).toEqual(eur(15))
    expect(subtractMoney(eur(10), eur(10))).toEqual(eur(0))
    expect(subtractMoney(eur(10), eur(4))).toEqual(eur(6))
  })

  it('rejects mixed currencies', () => {
    expect(() => addMoney(eur(1), usd(1))).toThrow(CurrencyMismatchError)
    expect(() => subtractMoney(eur(1), usd(1))).toThrow(CurrencyMismatchError)
    expect(() => compareMoney(eur(1), usd(1))).toThrow(CurrencyMismatchError)
    expect(() => sumMoney([usd(1)], 'EUR')).toThrow('Currency mismatch: EUR vs USD')
  })

  it('rejects negative and unsafe results', () => {
    expect(() => subtractMoney(eur(1), eur(2))).toThrow(MoneyRangeError)
    expect(() => addMoney(eur(Number.MAX_SAFE_INTEGER), eur(1))).toThrow(MoneyRangeError)
  })

  it('sums lists, empty list is zero', () => {
    expect(sumMoney([], 'USD')).toEqual(usd(0))
    expect(sumMoney([eur(1), eur(2), eur(3)], 'EUR')).toEqual(eur(6))
  })

  it('compares', () => {
    expect(compareMoney(eur(1), eur(2))).toBe(-1)
    expect(compareMoney(eur(2), eur(1))).toBe(1)
    expect(compareMoney(eur(2), eur(2))).toBe(0)
  })

  it('handles very large amounts exactly', () => {
    const big = Number.MAX_SAFE_INTEGER - 1
    expect(addMoney(eur(big), eur(1))).toEqual(eur(Number.MAX_SAFE_INTEGER))
  })
})
