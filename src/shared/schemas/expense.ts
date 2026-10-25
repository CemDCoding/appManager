import { z } from 'zod'
import { MoneySchema, RateSchema, isConsistentEurRate } from '../money'
import {
  AllocationSchema,
  BaseShape,
  DateStringSchema,
  DescriptionSchema,
  IdSchema,
  KeySchema,
  RecurrenceSchema,
  addEurRateIssue
} from './common'

const expenseCommon = {
  ...BaseShape,
  category: KeySchema,
  amount: MoneySchema,
  /** Snapshot "1 <currency> = rateToEur EUR" (PE-05, PE-13). "1" for EUR. */
  rateToEur: RateSchema,
  allocation: AllocationSchema,
  description: DescriptionSchema,
  serviceId: IdSchema.optional(),
  personId: IdSchema.optional()
}

const OneTimeExpenseSchema = z
  .object({ ...expenseCommon, kind: z.literal('oneTime'), date: DateStringSchema })
  .superRefine((e, ctx) => {
    if (!isConsistentEurRate(e.amount.currency, e.rateToEur)) addEurRateIssue(ctx, ['rateToEur'])
  })

const RecurringExpenseSchema = z
  .object({ ...expenseCommon, kind: z.literal('recurring'), recurrence: RecurrenceSchema })
  .superRefine((e, ctx) => {
    if (!isConsistentEurRate(e.amount.currency, e.rateToEur)) addEurRateIssue(ctx, ['rateToEur'])
  })

/** Expense, one-time (`date`) or recurring (`recurrence`), never both (PE-07). */
export const ExpenseSchema = z.discriminatedUnion('kind', [
  OneTimeExpenseSchema,
  RecurringExpenseSchema
])
export type Expense = z.infer<typeof ExpenseSchema>
