import { z } from 'zod'
import { CentsSchema } from '../money'
import { BaseShape, CountSchema, DateStringSchema, IdSchema, NameSchema } from './common'

export const GOAL_KINDS = ['revenue', 'breakEven', 'users', 'costLimit', 'free'] as const

/**
 * Goal (F-12, PE-37, PE-53). `projectId` null = portfolio.
 * `targetValue`: EUR cents for `revenue`/`costLimit`, user count for `users`,
 * absent for `breakEven`/`free`. `done` is only meaningful for `free`.
 */
export const GoalSchema = z
  .object({
    ...BaseShape,
    projectId: IdSchema.nullable(),
    kind: z.enum(GOAL_KINDS),
    title: NameSchema,
    targetValue: z.union([CentsSchema, CountSchema]).optional(),
    fromDate: DateStringSchema.optional(),
    dueDate: DateStringSchema.optional(),
    done: z.boolean()
  })
  .superRefine((g, ctx) => {
    const needsTarget = g.kind === 'revenue' || g.kind === 'users' || g.kind === 'costLimit'
    if (needsTarget && g.targetValue === undefined) {
      ctx.addIssue({ code: 'custom', message: 'targetValue required', path: ['targetValue'] })
    }
    if (!needsTarget && g.targetValue !== undefined) {
      ctx.addIssue({ code: 'custom', message: 'targetValue not allowed', path: ['targetValue'] })
    }
    if (g.kind !== 'free' && g.done) {
      ctx.addIssue({ code: 'custom', message: 'done only for free goals', path: ['done'] })
    }
    if (g.fromDate !== undefined && g.dueDate !== undefined && g.dueDate < g.fromDate) {
      ctx.addIssue({ code: 'custom', message: 'dueDate before fromDate', path: ['dueDate'] })
    }
  })
export type Goal = z.infer<typeof GoalSchema>
