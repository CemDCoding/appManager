import { describe, expect, it } from 'vitest'
import { appDictionary } from './context'
import { common } from './common'
import { nav } from './nav'
import {
  createTranslator,
  defineDictionary,
  interpolate,
  isLanguage,
  type Dictionary
} from './types'

function isDictionary(value: unknown): value is Dictionary<string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'de' in value &&
    'en' in value &&
    typeof value.de === 'object' &&
    typeof value.en === 'object'
  )
}

function expectSameKeys(name: string, dict: Dictionary<string>) {
  const de = Object.keys(dict.de).sort()
  const en = Object.keys(dict.en).sort()
  expect(en, `${name}: de/en keys differ`).toEqual(de)
  for (const key of de) {
    expect(dict.de[key].trim(), `${name}.de.${key} is empty`).not.toBe('')
    expect(dict.en[key].trim(), `${name}.en.${key} is empty`).not.toBe('')
  }
}

describe('dictionaries', () => {
  it('common, nav and the app dictionary have the same keys in de and en', () => {
    expectSameKeys('common', common)
    expectSameKeys('nav', nav)
    expectSameKeys('app', appDictionary)
    expect(appDictionary.de['nav.projects']).toBe('Projekte')
    expect(appDictionary.en['common.save']).toBe('Save')
  })

  it('every page and feature dictionary (i18n.ts) has the same keys in de and en', () => {
    const modules = import.meta.glob<Record<string, unknown>>(
      ['../pages/**/i18n.ts', '../features/**/i18n.ts', './**/*.ts', '!./**/*.test.ts'],
      { eager: true }
    )
    for (const [file, exports] of Object.entries(modules)) {
      for (const [name, value] of Object.entries(exports)) {
        if (isDictionary(value)) expectSameKeys(`${file}#${name}`, value)
      }
    }
  })
})

describe('translator', () => {
  const dict = defineDictionary(
    { greeting: 'Hallo {name}', count: '{n} Einträge' },
    { greeting: 'Hello {name}', count: '{n} entries' }
  )

  it('translates per language and fills parameters', () => {
    expect(createTranslator(dict, 'de')('greeting', { name: 'Test' })).toBe('Hallo Test')
    expect(createTranslator(dict, 'en')('count', { n: 3 })).toBe('3 entries')
  })

  it('keeps unknown placeholders', () => {
    expect(interpolate('{a} {b}', { a: 1 })).toBe('1 {b}')
    expect(interpolate('no params')).toBe('no params')
  })

  it('validates languages', () => {
    expect(isLanguage('de')).toBe(true)
    expect(isLanguage('en')).toBe(true)
    expect(isLanguage('fr')).toBe(false)
    expect(isLanguage(null)).toBe(false)
  })
})
