import { DEFAULT_LISTS, type DefaultListName } from '@shared/lists'
import { MAX_KEY_LENGTH, MAX_LIST_ENTRIES, MAX_NAME_LENGTH } from '@shared/limits'
import { BASE_CURRENCY, CurrencyCodeSchema, RateSchema, type Rate } from '@shared/money'
import { isValidDateString } from '@shared/schemas/common'
import type { ListSetting } from '@shared/schemas/settings'
import type { Result } from '@core/money/money'

export type RateEntryError = 'invalidCurrency' | 'eurNoRate' | 'invalidRate' | 'invalidDate'

export interface RateEntry {
  currency: string
  rate: Rate
  enteredOn: string
}

/** Währungscode aus Eingabe: Leerraum weg, Großbuchstaben, 3 Buchstaben, nicht EUR. */
export function parseCurrencyCode(text: string): Result<string, 'invalidCurrency' | 'eurNoRate'> {
  const code = text.trim().toUpperCase()
  const parsed = CurrencyCodeSchema.safeParse(code)
  if (!parsed.success) return { ok: false, error: 'invalidCurrency' }
  if (parsed.data === BASE_CURRENCY) return { ok: false, error: 'eurNoRate' }
  return { ok: true, value: parsed.data }
}

/** Kurs „1 X = k EUR“; Komma oder Punkt, strikt größer 0 (PE-31, kein Float). */
export function parseRateInput(text: string): Result<Rate, 'invalidRate'> {
  const parsed = RateSchema.safeParse(text.trim().replace(',', '.'))
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false, error: 'invalidRate' }
}

/** Prüft einen neuen Kurseintrag (Währung, Kurs, Datum). */
export function validateRateEntry(input: {
  currency: string
  rate: string
  enteredOn: string
}): Result<RateEntry, RateEntryError> {
  const currency = parseCurrencyCode(input.currency)
  if (!currency.ok) return currency
  const rate = parseRateInput(input.rate)
  if (!rate.ok) return rate
  if (!isValidDateString(input.enteredOn)) return { ok: false, error: 'invalidDate' }
  return {
    ok: true,
    value: { currency: currency.value, rate: rate.value, enteredOn: input.enteredOn }
  }
}

/** Heutiges Datum lokal als "YYYY-MM-DD". */
export function todayIso(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}

export type ListAddError = 'invalidLabel' | 'duplicate' | 'limit'

function slug(label: string): string {
  const s = label
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return s === '' ? 'entry' : s
}

/** Stabiler, eindeutiger Schlüssel für einen eigenen Eintrag (nie ein Standardschlüssel). */
export function newCustomKey(label: string, taken: Iterable<string>): string {
  const used = new Set(taken)
  const base = `custom-${slug(label)}`.slice(0, MAX_KEY_LENGTH - 5)
  if (!used.has(base)) return base
  for (let i = 2; ; i += 1) {
    const candidate = `${base}-${i}`
    if (!used.has(candidate)) return candidate
  }
}

/** Fügt einen eigenen Eintrag hinzu (PE-54: kein Umbenennen, kein Löschen). */
export function addCustomEntry(
  list: DefaultListName,
  setting: ListSetting,
  label: string,
  defaultLabels: readonly string[]
): Result<ListSetting, ListAddError> {
  const trimmed = label.trim()
  if (trimmed === '' || trimmed.length > MAX_NAME_LENGTH) {
    return { ok: false, error: 'invalidLabel' }
  }
  if (setting.custom.length >= MAX_LIST_ENTRIES) return { ok: false, error: 'limit' }
  const norm = (s: string) => s.trim().toLowerCase()
  const known = new Set([...defaultLabels, ...setting.custom.map((e) => e.label)].map(norm))
  if (known.has(norm(trimmed))) return { ok: false, error: 'duplicate' }
  const key = newCustomKey(trimmed, [...DEFAULT_LISTS[list], ...setting.custom.map((e) => e.key)])
  return {
    ok: true,
    value: { ...setting, custom: [...setting.custom, { key, label: trimmed, hidden: false }] }
  }
}

/** Blendet einen Eintrag (Standard oder eigen) aus oder ein. */
export function setEntryHidden(
  list: DefaultListName,
  setting: ListSetting,
  key: string,
  hidden: boolean
): ListSetting {
  if ((DEFAULT_LISTS[list] as readonly string[]).includes(key)) {
    const rest = setting.hiddenDefaults.filter((k) => k !== key)
    return { ...setting, hiddenDefaults: hidden ? [...rest, key] : rest }
  }
  return {
    ...setting,
    custom: setting.custom.map((e) => (e.key === key ? { ...e, hidden } : e))
  }
}
