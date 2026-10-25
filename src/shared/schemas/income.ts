import { z } from 'zod'
import { MoneySchema, RateSchema, isConsistentEurRate } from '../money'
import {
  BaseShape,
  DateStringSchema,
  DescriptionSchema,
  IdSchema,
  KeySchema,
  RecurrenceSchema,
  addEurRateIssue
} from './common'

const incomeCommon = {
  ...BaseShape,
  category: KeySchema,
  /** Net amount (PE-08). */
  amount: MoneySchema,
  rateToEur: RateSchema,
  /** Exactly one project. */
  projectId: IdSchema,
  description: DescriptionSchema
}

const OneTimeIncomeSchema = z
  .object({ ...incomeCommon, kind: z.literal('oneTime'), date: DateStringSchema })
  .superRefine((e, ctx) => {
    if (!isConsistentEurRate(e.amount.currency, e.rateToEur)) addEurRateIssue(ctx, ['rateToEur'])
  })

const RecurringIncomeSchema = z
  .object({ ...incomeCommon, kind: z.literal('recurring'), recurrence: RecurrenceSchema })
  .superRefine((e, ctx) => {
    if (!isConsistentEurRate(e.amount.currency, e.rateToEur)) addEurRateIssue(ctx, ['rateToEur'])
  })

export const IncomeSchema = z.discriminatedUnion('kind', [
  OneTimeIncomeSchema,
  RecurringIncomeSchema
])
export type Income = z.infer<typeof IncomeSchema>
