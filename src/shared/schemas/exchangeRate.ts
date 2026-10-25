import { z } from 'zod'
import { BASE_CURRENCY, CurrencyCodeSchema, RateSchema } from '../money'
import { BaseShape, DateStringSchema } from './common'

/** Rate history entry "1 currency = rate EUR" (PE-13). Never deleted, only appended (PE-35). */
export const ExchangeRateSchema = z.object({
  ...BaseShape,
  currency: CurrencyCodeSchema.refine((c) => c !== BASE_CURRENCY, 'EUR needs no rate'),
  rate: RateSchema,
  enteredOn: DateStringSchema
})
export type ExchangeRate = z.infer<typeof ExchangeRateSchema>
