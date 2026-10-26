import { describe, expect, it } from 'vitest'
import { createTranslator } from '@/i18n'
import { ipcErrorDict } from '@/i18n/shared-keys'
import { displayAmount } from '@/state/displayMoney'
import { ipcErrorText } from './errors'
import { currencyOptions, latestRatesByCurrency } from './rates'
import { toSettingsInput } from './useSettings'

const base = {
  ownerId: 'local' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
}
const rate = (id: string, currency: string, value: string, enteredOn: string) => ({
  ...base,
  id,
  currency,
  rate: value,
  enteredOn
})

describe('ipcErrorText', () => {
  const t = createTranslator(ipcErrorDict, 'de')
  it('translates codes and never shows the technical message', () => {
    const text = ipcErrorText({ code: 'IN_USE', message: 'project is referenced in expenses' }, t)
    expect(text).toBe('Der Eintrag wird noch verwendet und kann nicht gelöscht werden.')
    expect(ipcErrorText(null, t)).toBeNull()
  })
  it('supports overrides and unknown codes', () => {
    expect(
      ipcErrorText({ code: 'IN_USE', message: '' }, t, { IN_USE: 'Projekt hat Buchungen' })
    ).toBe('Projekt hat Buchungen')
    const unknown = { code: 'WHAT', message: '' } as unknown as Parameters<typeof ipcErrorText>[0]
    expect(ipcErrorText(unknown, t)).toBe(t('INTERNAL'))
  })
})

describe('rates helpers', () => {
  const rates = [
    rate('1', 'USD', '0.90', '2026-01-01'),
    rate('2', 'USD', '0.92', '2026-10-01'),
    rate('3', 'GBP', '1.15', '2026-05-01'),
    rate('4', 'USD', '0.91', '2026-06-01')
  ]
  it('picks the newest rate per currency via the core', () => {
    const latest = latestRatesByCurrency(rates)
    expect(latest.get('USD')?.rate).toBe('0.92')
    expect(latest.get('GBP')?.rate).toBe('1.15')
    expect(latest.has('CHF')).toBe(false)
  })
  it('lists EUR first, then sorted currencies without duplicates', () => {
    expect(currencyOptions(['USD', 'GBP'], ['USD', 'CHF', 'EUR', undefined, 'bad'])).toEqual([
      'EUR',
      'CHF',
      'GBP',
      'USD'
    ])
    expect(currencyOptions([])).toEqual(['EUR'])
  })
})

describe('displayAmount', () => {
  const rates = [rate('1', 'USD', '0.5', '2026-01-01')]
  it('keeps EUR unconverted', () => {
    expect(displayAmount(123456, 'EUR', rates, 'de', '–')).toMatchObject({
      ok: true,
      converted: false,
      cents: 123456
    })
  })
  it('converts with the newest rate and marks it', () => {
    const r = displayAmount(1000, 'USD', rates, 'en', 'n/a')
    expect(r).toMatchObject({ ok: true, converted: true, cents: 2000 })
    expect(r.text).toContain('20.00')
    expect(displayAmount(-1000, 'USD', rates, 'en', 'n/a').cents).toBe(-2000)
  })
  it('shows the fallback when the rate is missing', () => {
    expect(displayAmount(1000, 'GBP', rates, 'en', 'n/a')).toEqual({
      text: 'n/a',
      ok: false,
      converted: true,
      cents: null
    })
  })
})

describe('toSettingsInput', () => {
  it('drops base fields', () => {
    const list = { custom: [], hiddenDefaults: [] }
    const settings = {
      ...base,
      id: '00000000-0000-4000-8000-000000000001',
      displayCurrency: 'USD',
      expenseCategories: list,
      incomeCategories: list,
      projectPlatforms: list,
      campaignPlatforms: list,
      campaignFormats: list
    }
    const input = toSettingsInput(settings)
    expect(Object.keys(input).sort()).toEqual([
      'campaignFormats',
      'campaignPlatforms',
      'displayCurrency',
      'expenseCategories',
      'incomeCategories',
      'projectPlatforms'
    ])
  })
})
