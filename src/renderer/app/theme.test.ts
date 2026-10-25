import { describe, expect, it } from 'vitest'
import { isLanguage } from '@/i18n/types'
import {
  readPreference,
  STORAGE_KEYS,
  writePreference,
  type PreferenceStorage
} from './preferences'
import { isThemePreference, resolveTheme } from './theme'

function memoryStorage(initial: Record<string, string> = {}): PreferenceStorage {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value)
  }
}

describe('theme', () => {
  it('resolves system preference', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('validates theme preferences', () => {
    expect(isThemePreference('dark')).toBe(true)
    expect(isThemePreference('blue')).toBe(false)
  })
})

describe('preferences', () => {
  it('persists and restores theme and language', () => {
    const storage = memoryStorage()
    writePreference(STORAGE_KEYS.theme, 'dark', storage)
    writePreference(STORAGE_KEYS.language, 'en', storage)
    expect(readPreference(STORAGE_KEYS.theme, isThemePreference, 'system', storage)).toBe('dark')
    expect(readPreference(STORAGE_KEYS.language, isLanguage, 'de', storage)).toBe('en')
  })

  it('falls back on missing, invalid or unavailable storage', () => {
    const storage = memoryStorage({ [STORAGE_KEYS.theme]: 'neon' })
    expect(readPreference(STORAGE_KEYS.theme, isThemePreference, 'system', storage)).toBe('system')
    expect(readPreference(STORAGE_KEYS.language, isLanguage, 'de', storage)).toBe('de')
    expect(readPreference(STORAGE_KEYS.language, isLanguage, 'de', null)).toBe('de')

    const broken: PreferenceStorage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      }
    }
    expect(readPreference(STORAGE_KEYS.theme, isThemePreference, 'light', broken)).toBe('light')
    expect(() => writePreference(STORAGE_KEYS.theme, 'dark', broken)).not.toThrow()
  })
})
