/** Unterstützte UI-Sprachen (PE-47). */
export const LANGUAGES = ['de', 'en'] as const
export type Language = (typeof LANGUAGES)[number]

export const DEFAULT_LANGUAGE: Language = 'de'

/** Parameter für Platzhalter wie `{count}` in Texten. */
export type TranslateParams = Record<string, string | number>

/**
 * Wörterbuch eines Bereichs: flache Schlüssel, ein Text je Sprache.
 * Beide Sprachen haben exakt dieselben Schlüssel, sonst Typfehler.
 */
export interface Dictionary<K extends string> {
  readonly de: Readonly<Record<K, string>>
  readonly en: Readonly<Record<K, string>>
}

/** Übersetzungsfunktion für die Schlüssel eines Wörterbuchs. */
export type TranslateFn<K extends string> = (key: K, params?: TranslateParams) => string

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value)
}

/**
 * Legt ein Wörterbuch an. Deutsch ist die Quelle der Schlüssel; fehlt im
 * Englischen ein Schlüssel oder kommt einer hinzu, meldet TypeScript einen Fehler.
 *
 * @example
 * export const dict = defineDictionary(
 *   { title: 'Projekte' },
 *   { title: 'Projects' }
 * )
 */
export function defineDictionary<K extends string>(
  de: Record<K, string>,
  en: NoInfer<Record<K, string>>
): Dictionary<K> {
  return { de, en }
}

/** Ersetzt `{name}`-Platzhalter; unbekannte Platzhalter bleiben stehen. */
export function interpolate(text: string, params?: TranslateParams): string {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
  )
}

/** Erzeugt eine `t()`-Funktion für ein Wörterbuch und eine Sprache. */
export function createTranslator<K extends string>(
  dict: Dictionary<K>,
  language: Language
): TranslateFn<K> {
  const messages = dict[language]
  return (key, params) => interpolate(messages[key] ?? key, params)
}
