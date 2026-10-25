import { BASE_CURRENCY, type Money } from '@shared/money'
import type { Result } from '@core/money/money'
import { convertForDisplay, type CurrencyError, type RateEntry } from '@core/currency/currency'

/**
 * Converts one EUR-cent figure (sum, share, balance) into the display currency (PE-13,
 * PE-50): each displayed number is converted on its own with the newest rate of
 * `displayCurrency`, rounded half-up. Negative values (balances) are converted by
 * magnitude, so rounding is symmetric. Missing rate -> 'missingRate' (never a silent 1);
 * a non-safe-integer input -> 'overflow'.
 */
export function toDisplay(
  eurCents: number,
  displayCurrency: string,
  rates: readonly RateEntry[]
): Result<Money, CurrencyError> {
  if (!Number.isSafeInteger(eurCents)) return { ok: false, error: 'overflow' }
  const negative = eurCents < 0
  const r = convertForDisplay(
    { cents: Math.abs(eurCents), currency: BASE_CURRENCY },
    '1',
    displayCurrency,
    rates
  )
  if (!r.ok || !negative || r.value.cents === 0) return r
  return { ok: true, value: { cents: -r.value.cents, currency: r.value.currency } }
}
