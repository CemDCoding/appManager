import { z } from 'zod'

/** Base currency of the whole app (PE-13). All rates are "1 X = k EUR". */
export const BASE_CURRENCY = 'EUR' as const

/** ISO 4217 alphabetic code: exactly 3 uppercase letters. */
export const CurrencyCodeSchema = z.string().regex(/^[A-Z]{3}$/, 'Invalid currency code')
export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>

/** Amount in minor units (cents). Always a non-negative safe integer. */
export const CentsSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER)

export const MoneySchema = z.object({
  cents: CentsSchema,
  currency: CurrencyCodeSchema
})
export type Money = z.infer<typeof MoneySchema>

/**
 * Exchange rate as decimal string ("1 X = rate EUR"), e.g. "0.92" or "1".
 * Never a JS number (PE-31). Strictly positive, up to 10 decimals.
 */
export const RateSchema = z
  .string()
  .regex(/^(0|[1-9]\d{0,8})(\.\d{1,10})?$/, 'Invalid rate')
  .refine((v) => /[1-9]/.test(v), 'Rate must be greater than 0')
export type Rate = z.infer<typeof RateSchema>

/** Rate snapshot of a booking in EUR must be exactly "1". */
export function isConsistentEurRate(currency: string, rateToEur: string): boolean {
  return currency !== BASE_CURRENCY || rateToEur === '1'
}
