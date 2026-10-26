import { toDisplay } from '@core/aggregate/display'
import type { RateEntry } from '@core/currency/currency'
import { BASE_CURRENCY } from '@shared/money'
import { formatMoney, type Language } from '@/i18n'

export interface DisplayAmount {
  /** Formatierter Betrag oder `fallback`, wenn nicht umrechenbar. */
  text: string
  ok: boolean
  /** true, wenn aus EUR in eine andere Währung umgerechnet wurde (Hinweis „umgerechnet“, PE-50). */
  converted: boolean
  /** Betrag in Anzeigewährung (Cent), falls umrechenbar. */
  cents: number | null
}

/**
 * EUR-Cent → formatierter Betrag in der Anzeigewährung. Rechnet nur über `toDisplay`
 * aus dem Kern (neuester Kurs, PE-13) und formatiert nur über `formatMoney` (AP-04).
 * Fehlt der Kurs, kommt `fallback` statt einer Zahl (nie stillschweigend 1).
 */
export function displayAmount(
  eurCents: number,
  displayCurrency: string,
  rates: readonly RateEntry[],
  language: Language,
  fallback: string
): DisplayAmount {
  const converted = displayCurrency !== BASE_CURRENCY
  const r = toDisplay(eurCents, displayCurrency, rates)
  if (!r.ok) return { text: fallback, ok: false, converted, cents: null }
  return {
    text: formatMoney(r.value.cents, r.value.currency, language),
    ok: true,
    converted,
    cents: r.value.cents
  }
}
