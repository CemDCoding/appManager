import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { readPreference, STORAGE_KEYS, writePreference } from '@/app/preferences'
import { I18nContext, type I18nContextValue } from './context'
import { DEFAULT_LANGUAGE, isLanguage, type Language } from './types'

/** Stellt Sprache (`de`/`en`, gespeichert in `localStorage`) bereit. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() =>
    readPreference(STORAGE_KEYS.language, isLanguage, DEFAULT_LANGUAGE)
  )

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next)
    writePreference(STORAGE_KEYS.language, next)
  }, [])

  const value = useMemo<I18nContextValue>(
    () => ({ language, setLanguage }),
    [language, setLanguage]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
