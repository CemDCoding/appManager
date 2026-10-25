import { z } from 'zod'
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_KEY_LENGTH,
  MAX_NAME_LENGTH,
  MAX_NOTE_LENGTH,
  MAX_PRICE_CHANGES,
  MAX_SHARES,
  MAX_URL_LENGTH
} from '../limits'
import { CentsSchema } from '../money'

/** Owner for the later online mode (PE-01). Always "local" now. */
export const LOCAL_OWNER = 'local' as const

export function isValidDateString(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(Date.UTC(y, mo - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d
}

/** Calendar date "YYYY-MM-DD" (no time, no timezone). */
export const DateStringSchema = z
  .string()
  .refine(isValidDateString, 'Invalid date, expected YYYY-MM-DD')
export type DateString = z.infer<typeof DateStringSchema>

export const IdSchema = z.uuid()
export const TimestampSchema = z.iso.datetime()

/** Fields every entity has. */
export const BaseShape = {
  id: IdSchema,
  ownerId: z.literal(LOCAL_OWNER),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema
}
export const BASE_KEYS = ['id', 'ownerId', 'createdAt', 'updatedAt'] as const

export const NameSchema = z.string().trim().min(1).max(MAX_NAME_LENGTH)
export const ShortTextSchema = z.string().max(MAX_NAME_LENGTH)
export const DescriptionSchema = z.string().max(MAX_DESCRIPTION_LENGTH)
export const NoteSchema = z.string().max(MAX_NOTE_LENGTH)

/** Stable list key (e.g. "hosting" or a custom key). */
export const KeySchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]+$/, 'Invalid key')
  .max(MAX_KEY_LENGTH)

/** Only http(s) URLs are accepted (section 5). */
export const HttpUrlSchema = z
  .string()
  .max(MAX_URL_LENGTH)
  .refine((v) => {
    try {
      const u = new URL(v)
      return u.protocol === 'https:' || u.protocol === 'http:'
    } catch {
      return false
    }
  }, 'Only http(s) URLs are allowed')

export const BasisPointsSchema = z.number().int().min(0).max(10_000)
export const CountSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER)

/** Allocation of a cost onto projects (PE-06, PE-28). */
export const AllocationSchema = z
  .object({
    mode: z.enum(['all', 'selected']),
    split: z.enum(['equal', 'percent']),
    shares: z
      .array(z.object({ projectId: IdSchema, percentBasisPoints: BasisPointsSchema }))
      .max(MAX_SHARES)
  })
  .superRefine((a, ctx) => {
    const fail = (message: string): void => {
      ctx.addIssue({ code: 'custom', message, path: ['shares'] })
    }
    if (a.mode === 'all') {
      if (a.split !== 'equal') fail('mode "all" requires split "equal"')
      if (a.shares.length > 0) fail('mode "all" requires empty shares')
      return
    }
    if (a.shares.length === 0) fail('mode "selected" requires at least one share')
    if (new Set(a.shares.map((s) => s.projectId)).size !== a.shares.length) {
      fail('Duplicate projectId in shares')
    }
    if (a.split === 'percent') {
      const sum = a.shares.reduce((acc, s) => acc + s.percentBasisPoints, 0)
      if (sum !== 10_000) fail('Percent shares must sum to 10000 basis points')
    } else if (a.shares.some((s) => s.percentBasisPoints !== 0)) {
      fail('split "equal" requires percentBasisPoints 0')
    }
  })
export type Allocation = z.infer<typeof AllocationSchema>

/** Recurrence (PE-07, PE-29). */
export const RecurrenceSchema = z
  .object({
    interval: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    startDate: DateStringSchema,
    endDate: DateStringSchema.optional(),
    priceChanges: z
      .array(z.object({ fromDate: DateStringSchema, cents: CentsSchema }))
      .max(MAX_PRICE_CHANGES)
  })
  .superRefine((r, ctx) => {
    if (r.endDate !== undefined && r.endDate < r.startDate) {
      ctx.addIssue({ code: 'custom', message: 'endDate before startDate', path: ['endDate'] })
    }
    r.priceChanges.forEach((p, i) => {
      if (p.fromDate < r.startDate) {
        ctx.addIssue({
          code: 'custom',
          message: 'price change before startDate',
          path: ['priceChanges', i, 'fromDate']
        })
      }
    })
  })
export type Recurrence = z.infer<typeof RecurrenceSchema>

/** Helper for rate/currency consistency checks. */
export function addEurRateIssue(ctx: z.RefinementCtx, path: (string | number)[]): void {
  ctx.addIssue({ code: 'custom', message: 'EUR bookings must have rateToEur "1"', path })
}
