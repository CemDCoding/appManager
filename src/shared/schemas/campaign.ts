import { z } from 'zod'
import { MoneySchema, RateSchema, isConsistentEurRate } from '../money'
import {
  AllocationSchema,
  BaseShape,
  CountSchema,
  DateStringSchema,
  KeySchema,
  NameSchema,
  NoteSchema,
  addEurRateIssue
} from './common'

/** Advertising campaign (F-07, PE-11, PE-49). Metrics are raw values only. */
export const CampaignSchema = z
  .object({
    ...BaseShape,
    name: NameSchema,
    platform: KeySchema,
    format: KeySchema,
    startDate: DateStringSchema,
    endDate: DateStringSchema,
    cost: MoneySchema,
    rateToEur: RateSchema,
    allocation: AllocationSchema,
    impressions: CountSchema,
    clicks: CountSchema,
    usersGained: CountSchema,
    rating: z.number().int().min(0).max(5),
    note: NoteSchema
  })
  .superRefine((c, ctx) => {
    if (c.endDate < c.startDate) {
      ctx.addIssue({ code: 'custom', message: 'endDate before startDate', path: ['endDate'] })
    }
    if (!isConsistentEurRate(c.cost.currency, c.rateToEur)) addEurRateIssue(ctx, ['rateToEur'])
  })
export type Campaign = z.infer<typeof CampaignSchema>
