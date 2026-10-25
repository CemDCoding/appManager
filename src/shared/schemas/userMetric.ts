import { z } from 'zod'
import { BaseShape, CountSchema, DateStringSchema, IdSchema, KeySchema } from './common'

/** Manual user count at a reference date (F-13, PE-38). */
export const UserMetricSchema = z
  .object({
    ...BaseShape,
    projectId: IdSchema,
    date: DateStringSchema,
    usersTotal: CountSchema,
    usersActive: CountSchema,
    usersPaying: CountSchema,
    perPlatform: z
      .array(z.object({ platform: KeySchema, users: CountSchema }))
      .max(50)
      .optional()
  })
  .superRefine((m, ctx) => {
    if (m.usersActive > m.usersTotal) {
      ctx.addIssue({ code: 'custom', message: 'active > total', path: ['usersActive'] })
    }
    if (m.usersPaying > m.usersTotal) {
      ctx.addIssue({ code: 'custom', message: 'paying > total', path: ['usersPaying'] })
    }
  })
export type UserMetric = z.infer<typeof UserMetricSchema>
