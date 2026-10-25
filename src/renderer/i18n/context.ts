import { createContext, useContext, useMemo } from 'react'
import { common } from './common'
import { formatDate, formatMoney, formatNumber, formatPercent } from './format'
import { nav } from './nav'
import { createTranslator, type Dictionary, type Language, type TranslateFn } from './types'

export interface I18nContextValue {
  language: Language
  setLanguage: (language: Language) => void
}

export const I18nContext = createContext<I18nContextValue | null>(null)

/** Aktuelle Sprache und Umschalter. */
export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>')
  return value
}

/** Gemeinsames App-Wörterbuch: `common.*` und `nav.*`. */
type Prefixed<P extends string, K extends string> = `${P}.${K}`
export type AppKey =
  Prefixed<'common', keyof typeof common.de> | Prefixed<'nav', keyof typeof nav.de>

function prefix<P extends string, K extends string>(
  name: P,
  dict: Dictionary<K>
): Dictionary<Prefixed<P, K>> {
  const map = (messages: Readonly<Record<K, string>>) =>
    Object.fromEntries(
      Object.entries(messages).map(([key, text]) => [`${name}.${key}`, text])
    ) as Record<Prefixed<P, K>, string>
  return { de: map(dict.de), en: map(dict.en) }
}

export const appDictionary: Dictionary<AppKey> = {
  de: { ...prefix('common', common).de, ...prefix('nav', nav).de },
  en: { ...prefix('common', common).en, ...prefix('nav', nav).en }
}

/**
 * Übersetzungsfunktion. Ohne Argument für das App-Wörterbuch
 * (`t('nav.projects')`), mit Bereichs-Wörterbuch für dessen Schlüssel.
 *
 * @example
 * const t = useT()            // t('common.save')
 * const tp = useT(pageDict)   // tp('title')
 */
export function useT(): TranslateFn<AppKey>
export function useT<K extends string>(dict: Dictionary<K>): TranslateFn<K>
export function useT(dict?: Dictionary<string>): TranslateFn<string> {
  const { language } = useI18n()
  const source = dict ?? (appDictionary as Dictionary<string>)
  return useMemo(() => createTranslator(source, language), [source, language])
}

export interface Formatters {
  money: (cents: number, currency: string) => string
  date: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string
  number: (value: number, options?: Intl.NumberFormatOptions) => string
  percent: (ratio: number, maximumFractionDigits?: number) => string
}

/** Formatierer, gebunden an die aktuelle Sprache. */
export function useFormat(): Formatters {
  const { language } = useI18n()
  return useMemo(
    () => ({
      money: (cents, currency) => formatMoney(cents, currency, language),
      date: (value, options) => formatDate(value, language, options),
      number: (value, options) => formatNumber(value, language, options),
      percent: (ratio, digits) => formatPercent(ratio, language, digits)
    }),
    [language]
  )
}
