import { DEFAULT_LISTS, type DefaultListName } from '@shared/lists'
import type { ListSetting } from '@shared/schemas/settings'
import { createTranslator, type Language } from '@/i18n'
import { LIST_DICTIONARIES } from '@/i18n/shared-keys'

export interface ListOption {
  key: string
  label: string
  /** Ausgeblendet (PE-54): nicht neu wählbar, alte Buchungen bleiben gültig. */
  hidden: boolean
  /** Eigener Eintrag des Nutzers (sonst Standardliste). */
  custom: boolean
}

/**
 * Alle Einträge einer Liste: Standardschlüssel (übersetzt) und eigene Einträge
 * (mit ihrem `label`), jeweils mit Ausblende-Status aus den Einstellungen.
 *
 * @example
 * listOptions('expenseCategories', settings?.expenseCategories, 'de')
 */
export function listOptions(
  list: DefaultListName,
  setting: ListSetting | undefined,
  language: Language
): ListOption[] {
  const t = createTranslator(LIST_DICTIONARIES[list], language)
  const hiddenDefaults = new Set(setting?.hiddenDefaults ?? [])
  const defaults = DEFAULT_LISTS[list].map((key) => ({
    key,
    label: t(key),
    hidden: hiddenDefaults.has(key),
    custom: false
  }))
  const defaultKeys = new Set<string>(DEFAULT_LISTS[list])
  const custom = (setting?.custom ?? [])
    .filter((e) => !defaultKeys.has(e.key))
    .map((e) => ({ key: e.key, label: e.label, hidden: e.hidden, custom: true }))
  return [...defaults, ...custom]
}

/**
 * Wählbare Einträge: nicht ausgeblendete, dazu die aktuell gespeicherten Werte
 * (auch wenn ausgeblendet), damit bestehende Buchungen korrekt angezeigt werden.
 * Unbekannte gespeicherte Schlüssel erscheinen mit dem Schlüssel als Text.
 */
export function selectableOptions(
  options: readonly ListOption[],
  current: readonly string[]
): ListOption[] {
  const keep = new Set(current)
  const result = options.filter((o) => !o.hidden || keep.has(o.key))
  const known = new Set(options.map((o) => o.key))
  for (const key of current) {
    if (key && !known.has(key)) result.push({ key, label: key, hidden: true, custom: true })
  }
  return result
}

/** Anzeigetext eines gespeicherten Schlüssels (für Tabellen und Details). */
export function listLabel(
  list: DefaultListName,
  key: string,
  setting: ListSetting | undefined,
  language: Language
): string {
  return listOptions(list, setting, language).find((o) => o.key === key)?.label ?? key
}
