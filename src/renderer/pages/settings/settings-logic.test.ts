import { describe, expect, it } from 'vitest'
import {
  addCustomEntry,
  dataErrorAfterLoad,
  newCustomKey,
  parseCurrencyCode,
  parseRateInput,
  setEntryHidden,
  showDirSwitchAborted,
  todayIso,
  validateRateEntry
} from './settings-logic'

const empty = { custom: [], hiddenDefaults: [] }

describe('showDirSwitchAborted (AP-37, PE-75 d)', () => {
  const io = { code: 'IO', message: 'x' } as const
  const internal = { code: 'INTERNAL', message: '' } as const
  it('shows the note only for an IO error from the switch', () => {
    expect(showDirSwitchAborted({ error: io, fromSwitch: true })).toBe(true)
  })
  it('hides the note for INTERNAL, load errors and no error', () => {
    expect(showDirSwitchAborted({ error: internal, fromSwitch: true })).toBe(false)
    expect(showDirSwitchAborted({ error: io, fromSwitch: false })).toBe(false)
    expect(showDirSwitchAborted({ error: null, fromSwitch: true })).toBe(false)
  })
})

describe('dataErrorAfterLoad (AP-37)', () => {
  const dirErr = { code: 'IO', message: 'dir' } as const
  const backupErr = { code: 'IO', message: 'backups' } as const
  it('clears an old message after a successful reload', () => {
    expect(dataErrorAfterLoad(null, null)).toEqual({ error: null, fromSwitch: false })
  })
  it('keeps load errors, backups error wins, never marked as switch error', () => {
    expect(dataErrorAfterLoad(dirErr, null)).toEqual({ error: dirErr, fromSwitch: false })
    expect(dataErrorAfterLoad(null, backupErr)).toEqual({ error: backupErr, fromSwitch: false })
    expect(dataErrorAfterLoad(dirErr, backupErr)).toEqual({ error: backupErr, fromSwitch: false })
    expect(showDirSwitchAborted(dataErrorAfterLoad(dirErr, null))).toBe(false)
  })
})

describe('parseCurrencyCode', () => {
  it('normalizes case and whitespace', () => {
    expect(parseCurrencyCode(' usd ')).toEqual({ ok: true, value: 'USD' })
  })
  it('rejects bad codes and EUR', () => {
    expect(parseCurrencyCode('US')).toEqual({ ok: false, error: 'invalidCurrency' })
    expect(parseCurrencyCode('US1')).toEqual({ ok: false, error: 'invalidCurrency' })
    expect(parseCurrencyCode('')).toEqual({ ok: false, error: 'invalidCurrency' })
    expect(parseCurrencyCode('eur')).toEqual({ ok: false, error: 'eurNoRate' })
  })
})

describe('parseRateInput', () => {
  it('accepts comma and dot', () => {
    expect(parseRateInput('0,92')).toEqual({ ok: true, value: '0.92' })
    expect(parseRateInput('1.5')).toEqual({ ok: true, value: '1.5' })
  })
  it('rejects zero, negative, text, too many decimals', () => {
    for (const bad of ['0', '0,0', '-1', 'abc', '', '1.12345678901', '1e3']) {
      expect(parseRateInput(bad)).toEqual({ ok: false, error: 'invalidRate' })
    }
  })
})

describe('validateRateEntry', () => {
  it('returns normalized entry', () => {
    expect(validateRateEntry({ currency: 'usd', rate: '0,9', enteredOn: '2026-10-01' })).toEqual({
      ok: true,
      value: { currency: 'USD', rate: '0.9', enteredOn: '2026-10-01' }
    })
  })
  it('reports the first error', () => {
    expect(validateRateEntry({ currency: 'x', rate: '1', enteredOn: '2026-10-01' }).ok).toBe(false)
    expect(validateRateEntry({ currency: 'USD', rate: '0', enteredOn: '2026-10-01' })).toEqual({
      ok: false,
      error: 'invalidRate'
    })
    expect(validateRateEntry({ currency: 'USD', rate: '1', enteredOn: '2026-02-30' })).toEqual({
      ok: false,
      error: 'invalidDate'
    })
  })
})

describe('todayIso', () => {
  it('formats local date', () => {
    expect(todayIso(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('lists', () => {
  it('creates unique custom keys, never default keys', () => {
    expect(newCustomKey('Hosting', ['hosting'])).toBe('custom-hosting')
    expect(newCustomKey('Hosting', ['custom-hosting'])).toBe('custom-hosting-2')
    expect(newCustomKey('Ünï ✓', [])).toBe('custom-uni')
    expect(newCustomKey('***', [])).toBe('custom-entry')
  })
  it('adds a trimmed custom entry', () => {
    const r = addCustomEntry('expenseCategories', empty, '  Büro ', ['Hosting/Server'])
    expect(r).toEqual({
      ok: true,
      value: { custom: [{ key: 'custom-buro', label: 'Büro', hidden: false }], hiddenDefaults: [] }
    })
  })
  it('rejects empty, duplicate labels', () => {
    expect(addCustomEntry('expenseCategories', empty, '  ', [])).toEqual({
      ok: false,
      error: 'invalidLabel'
    })
    expect(
      addCustomEntry('expenseCategories', empty, 'hosting/server', ['Hosting/Server'])
    ).toEqual({ ok: false, error: 'duplicate' })
  })
  it('hides and shows defaults and custom entries', () => {
    const hidden = setEntryHidden('expenseCategories', empty, 'hosting', true)
    expect(hidden.hiddenDefaults).toEqual(['hosting'])
    expect(setEntryHidden('expenseCategories', hidden, 'hosting', false).hiddenDefaults).toEqual([])
    const withCustom = {
      custom: [{ key: 'custom-a', label: 'A', hidden: false }],
      hiddenDefaults: []
    }
    expect(
      setEntryHidden('expenseCategories', withCustom, 'custom-a', true).custom[0]?.hidden
    ).toBe(true)
  })
})
