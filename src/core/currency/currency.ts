import Decimal from 'decimal.js'
import { BASE_CURRENCY, type Money, type Rate } from '@shared/money'
import type { Result } from '@core/money/money'

export type CurrencyError = 'missingRate' | 'invalidRate' | 'overflow'

/** Minimal rate-history entry ("1 currency = rate EUR"), compatible with ExchangeRate. */
export interface RateEntry {
  currency: string
  rate: Rate
  enteredOn: string
  createdAt?: string
}

// Own constructor so global Decimal config of other code cannot change our rounding.
const D = Decimal.clone({ precision: 60, rounding: Decimal.ROUND_HALF_UP })

function parseRate(rate: string): Decimal | null {
  if (!/^\d+(\.\d+)?$/.test(rate)) return null
  const d = new D(rate)
  return d.gt(0) ? d : null
}

function toCents(value: Decimal): Result<number, CurrencyError> {
  const cents = value.toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
  if (cents.gt(Number.MAX_SAFE_INTEGER)) return { ok: false, error: 'overflow' }
  return { ok: true, value: cents.toNumber() }
}

/**
 * Booking amount -> EUR cents: cents * rateToEur, rounded half-up once at the end.
 * EUR amounts are returned unchanged (rate ignored). Invalid rate -> 'invalidRate'.
 */
export function toEur(money: Money, rateToEur: Rate): Result<Money, CurrencyError> {
  if (money.currency === BASE_CURRENCY) return { ok: true, value: { ...money } }
  const rate = parseRate(rateToEur)
  if (!rate) return { ok: false, error: 'invalidRate' }
  const r = toCents(rate.mul(money.cents))
  return r.ok ? { ok: true, value: { cents: r.value, currency: BASE_CURRENCY } } : r
}

/**
 * EUR cents -> cents of another currency: eurCents / rate (rate = "1 X = rate EUR"),
 * rounded half-up once at the end. Invalid rate -> 'invalidRate'.
 */
export function fromEur(eurCents: number, rate: Rate): Result<number, CurrencyError> {
  const r = parseRate(rate)
  if (!r) return { ok: false, error: 'invalidRate' }
  return toCents(new D(eurCents).div(r))
}

/**
 * Newest rate entry for `currency`, optionally only entries entered on or before `at`
 * ("YYYY-MM-DD"). Order: enteredOn, then createdAt, then later list position wins.
 * Returns null when there is none (never a silent 1).
 */
export function latestRate(
  rates: readonly RateEntry[],
  currency: string,
  at?: string
): RateEntry | null {
  let best: RateEntry | null = null
  for (const entry of rates) {
    if (entry.currency !== currency) continue
    if (at !== undefined && entry.enteredOn > at) continue
    if (best === null) {
      best = entry
      continue
    }
    const key = `${entry.enteredOn}|${entry.createdAt ?? ''}`
    const bestKey = `${best.enteredOn}|${best.createdAt ?? ''}`
    if (key >= bestKey) best = entry
  }
  return best
}

/**
 * Display conversion (PE-13): booking -> EUR with the booking's snapshot rate, then
 * EUR -> displayCurrency with the newest rate of that currency. Each leg rounds half-up
 * to cents, so EUR is the canonical value. Same currency as display: unchanged amount.
 * No rate for displayCurrency -> 'missingRate'.
 */
export function convertForDisplay(
  money: Money,
  rateToEur: Rate,
  displayCurrency: string,
  rates: readonly RateEntry[]
): Result<Money, CurrencyError> {
  if (money.currency === displayCurrency) return { ok: true, value: { ...money } }
  const eur = toEur(money, rateToEur)
  if (!eur.ok) return eur
  if (displayCurrency === BASE_CURRENCY) return eur
  const entry = latestRate(rates, displayCurrency)
  if (!entry) return { ok: false, error: 'missingRate' }
  const out = fromEur(eur.value.cents, entry.rate)
  return out.ok ? { ok: true, value: { cents: out.value, currency: displayCurrency } } : out
}
