import { describe, expect, it } from 'vitest'
import {
  applyCurrencyChange,
  centsToInputText,
  emptyMoneyDraft,
  moneyDraftFrom,
  parseAmountToCents,
  parseMoneyDraft,
  parseRateText,
  withRateSuggestion
} from './money-logic'

const ok = (value: number) => ({ ok: true, value })
const bad = { ok: false, error: 'invalidAmount' }

describe('parseAmountToCents', () => {
  it('parses German input', () => {
    expect(parseAmountToCents('100', 'de')).toEqual(ok(10000))
    expect(parseAmountToCents('1.234,56', 'de')).toEqual(ok(123456))
    expect(parseAmountToCents('0,5', 'de')).toEqual(ok(50))
    expect(parseAmountToCents(' 12,30 ', 'de')).toEqual(ok(1230))
    expect(parseAmountToCents('12.5', 'de')).toEqual(ok(1250))
    expect(parseAmountToCents('1.234', 'de')).toEqual(ok(123400))
    expect(parseAmountToCents('12,', 'de')).toEqual(ok(1200))
  })

  it('parses English input', () => {
    expect(parseAmountToCents('1,234.56', 'en')).toEqual(ok(123456))
    expect(parseAmountToCents('12,5', 'en')).toEqual(ok(1250))
    expect(parseAmountToCents('0.01', 'en')).toEqual(ok(1))
  })

  it('rejects invalid input', () => {
    for (const text of [
      '',
      ' ',
      '-5',
      'abc',
      '1,234',
      '12,345,6',
      '1,2,3',
      '0,001',
      ',5',
      '1e3',
      '12.34.56'
    ]) {
      expect(parseAmountToCents(text, 'de'), text).toEqual(bad)
    }
    expect(parseAmountToCents('99999999999999999', 'en')).toEqual(bad)
  })

  it('round-trips with centsToInputText', () => {
    for (const cents of [0, 1, 99, 100, 123456, 10000]) {
      expect(parseAmountToCents(centsToInputText(cents, 'de'), 'de')).toEqual(ok(cents))
      expect(parseAmountToCents(centsToInputText(cents, 'en'), 'en')).toEqual(ok(cents))
    }
    expect(centsToInputText(123456, 'de')).toBe('1234,56')
    expect(centsToInputText(-1, 'de')).toBe('')
  })
})

describe('rates in MoneyInput', () => {
  const usd = { rate: '0.92', enteredOn: '2026-10-01' }

  it('normalizes rate text', () => {
    expect(parseRateText('0,92')).toEqual({ ok: true, value: '0.92' })
    expect(parseRateText('0')).toEqual({ ok: false, error: 'invalidRate' })
    expect(parseRateText('abc')).toEqual({ ok: false, error: 'invalidRate' })
  })

  it('suggests the newest rate for a foreign currency (PE-05)', () => {
    const draft = applyCurrencyChange(emptyMoneyDraft(), 'USD', usd, 'de')
    expect(draft).toMatchObject({ currency: 'USD', rateText: '0,92', rateTouched: false })
    const back = applyCurrencyChange({ ...draft, rateTouched: true }, 'EUR', null, 'de')
    expect(back).toMatchObject({ currency: 'EUR', rateText: '1', rateTouched: false })
    expect(applyCurrencyChange(emptyMoneyDraft(), 'GBP', null, 'en').rateText).toBe('')
  })

  it('fills late-loaded suggestions but never overrides a manual rate', () => {
    const empty = { ...emptyMoneyDraft(), currency: 'USD', rateText: '' }
    expect(withRateSuggestion(empty, usd, 'en').rateText).toBe('0.92')
    const manual = { ...empty, rateText: '0.95', rateTouched: true }
    expect(withRateSuggestion(manual, usd, 'en')).toBe(manual)
    const eur = emptyMoneyDraft()
    expect(withRateSuggestion(eur, usd, 'en')).toBe(eur)
  })

  it('keeps the stored snapshot when editing', () => {
    const draft = moneyDraftFrom({ cents: 1000, currency: 'USD' }, '0.9', 'de')
    expect(draft).toEqual({
      amountText: '10,00',
      currency: 'USD',
      rateText: '0,9',
      rateTouched: true
    })
    expect(withRateSuggestion(draft, usd, 'de')).toBe(draft)
  })
})

describe('parseMoneyDraft', () => {
  it('returns amount and rate snapshot', () => {
    expect(
      parseMoneyDraft(
        { amountText: '10,50', currency: 'USD', rateText: '0,92', rateTouched: false },
        'de'
      )
    ).toEqual({ ok: true, value: { amount: { cents: 1050, currency: 'USD' }, rateToEur: '0.92' } })
  })

  it('forces rate "1" for EUR', () => {
    expect(
      parseMoneyDraft({ amountText: '5', currency: 'EUR', rateText: 'x', rateTouched: true }, 'en')
    ).toEqual({ ok: true, value: { amount: { cents: 500, currency: 'EUR' }, rateToEur: '1' } })
  })

  it('reports the first problem', () => {
    const base = { amountText: '5', currency: 'USD', rateText: '0.9', rateTouched: false }
    expect(parseMoneyDraft({ ...base, currency: 'usd' }, 'en')).toEqual({
      ok: false,
      error: 'invalidCurrency'
    })
    expect(parseMoneyDraft({ ...base, amountText: '' }, 'en')).toEqual({
      ok: false,
      error: 'invalidAmount'
    })
    expect(parseMoneyDraft({ ...base, rateText: '' }, 'en')).toEqual({
      ok: false,
      error: 'invalidRate'
    })
  })
})
