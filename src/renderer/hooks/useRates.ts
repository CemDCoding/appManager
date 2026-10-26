import { useMemo } from 'react'
import type { IpcError } from '@shared/ipc'
import type { ExchangeRate } from '@shared/schemas/exchangeRate'
import { latestRatesByCurrency } from './rates'
import { useCollection } from './useCollection'

export interface RatesState {
  /** Alle Kurseinträge (Historie). */
  rates: ExchangeRate[]
  /** Neuester Kurs je Währung. */
  latest: ReadonlyMap<string, ExchangeRate>
  /** Neuester Kurs einer Währung oder `null` (nie stillschweigend 1). */
  latestFor: (currency: string) => ExchangeRate | null
  /** Währungen mit mindestens einem Kurs, alphabetisch. */
  currencies: string[]
  loading: boolean
  error: IpcError | null
  errorText: string | null
}

/**
 * Kurstabelle mit dem neuesten Kurs je Währung (PE-05, PE-13).
 *
 * @example
 * const { latestFor } = useRates()
 * const usd = latestFor('USD') // { rate: '0.92', enteredOn: '2026-10-01', … } | null
 */
export function useRates(): RatesState {
  const { items, loading, error, errorText } = useCollection('exchangeRates')
  return useMemo(() => {
    const latest = latestRatesByCurrency(items)
    return {
      rates: items,
      latest,
      latestFor: (currency: string) => latest.get(currency) ?? null,
      currencies: [...latest.keys()].sort(),
      loading,
      error,
      errorText
    }
  }, [items, loading, error, errorText])
}
