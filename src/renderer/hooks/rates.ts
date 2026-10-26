import { latestRate } from '@core/currency/currency'
import { BASE_CURRENCY } from '@shared/money'
import type { ExchangeRate } from '@shared/schemas/exchangeRate'

/**
 * Neuester Kurs je Währung (Reihenfolge wie `latestRate` aus dem Kern:
 * `enteredOn`, dann `createdAt`). Keine eigene Vergleichslogik.
 */
export function latestRatesByCurrency(
  rates: readonly ExchangeRate[]
): ReadonlyMap<string, ExchangeRate> {
  const result = new Map<string, ExchangeRate>()
  for (const currency of new Set(rates.map((r) => r.currency))) {
    const entry = latestRate(rates, currency)
    // latestRate liefert einen Eintrag aus `rates`, also eine ExchangeRate.
    if (entry) result.set(currency, entry as ExchangeRate)
  }
  return result
}

/**
 * Währungen für Auswahlfelder: EUR zuerst, dann alle mit Kurs und `extra`
 * (z. B. die aktuell gespeicherte), alphabetisch, ohne Doppelte.
 */
export function currencyOptions(
  rateCurrencies: Iterable<string>,
  extra: readonly (string | undefined)[] = []
): string[] {
  const set = new Set<string>()
  for (const c of rateCurrencies) set.add(c)
  for (const c of extra) if (c && /^[A-Z]{3}$/.test(c)) set.add(c)
  set.delete(BASE_CURRENCY)
  return [BASE_CURRENCY, ...[...set].sort()]
}
