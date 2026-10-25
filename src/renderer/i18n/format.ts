import type { Language } from './types'

/** Intl-Locale je UI-Sprache (PE-47). */
export const LOCALES: Record<Language, string> = { de: 'de-DE', en: 'en-US' }

/** Ersatzanzeige für ungültige Werte. */
export const INVALID_VALUE = '–'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Formatiert einen Geldbetrag in Cent (Ganzzahl) in der Währung `currency`
 * (ISO-4217-Code), z. B. 123456 EUR → "1.234,56 €" (de) bzw. "€1,234.56" (en).
 */
export function formatMoney(cents: number, currency: string, language: Language): string {
  if (!Number.isFinite(cents) || !/^[A-Z]{3}$/.test(currency)) return INVALID_VALUE
  return new Intl.NumberFormat(LOCALES[language], {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(cents / 100)
}

/** Formatiert eine Zahl, z. B. 1234.5 → "1.234,5" (de) bzw. "1,234.5" (en). */
export function formatNumber(
  value: number,
  language: Language,
  options?: Intl.NumberFormatOptions
): string {
  if (!Number.isFinite(value)) return INVALID_VALUE
  return new Intl.NumberFormat(LOCALES[language], options).format(value)
}

/**
 * Formatiert einen Anteil als Prozent: 0.125 → "12,5 %" (de) bzw. "12.5%" (en).
 * Standard: höchstens eine Nachkommastelle.
 */
export function formatPercent(
  ratio: number,
  language: Language,
  maximumFractionDigits = 1
): string {
  if (!Number.isFinite(ratio)) return INVALID_VALUE
  return new Intl.NumberFormat(LOCALES[language], {
    style: 'percent',
    maximumFractionDigits
  }).format(ratio)
}

/**
 * Wandelt ein ISO-Datum `YYYY-MM-DD` in ein lokales Datum (ohne Zeitzonen-
 * Verschiebung) um. Gibt `null` bei ungültigen Angaben zurück.
 */
export function parseIsoDate(value: string): Date | null {
  const match = ISO_DATE.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return date
}

/**
 * Formatiert ein Datum (`YYYY-MM-DD` oder `Date`):
 * "2026-10-25" → "25.10.2026" (de) bzw. "10/25/2026" (en).
 */
export function formatDate(
  value: string | Date,
  language: Language,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
): string {
  const date = typeof value === 'string' ? parseIsoDate(value) : value
  if (!date || Number.isNaN(date.getTime())) return INVALID_VALUE
  return new Intl.DateTimeFormat(LOCALES[language], options).format(date)
}
