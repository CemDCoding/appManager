import { z } from 'zod'
import { PROJECT_PHASES } from '../lists'
import {
  BaseShape,
  DateStringSchema,
  DescriptionSchema,
  HttpUrlSchema,
  KeySchema,
  NameSchema,
  ShortTextSchema
} from './common'

/** Project / app (PE-34). */
export const ProjectSchema = z
  .object({
    ...BaseShape,
    name: NameSchema,
    description: DescriptionSchema,
    platforms: z.array(KeySchema).max(50),
    phase: z.enum(PROJECT_PHASES),
    startDate: DateStringSchema,
    endDate: DateStringSchema.optional(),
    links: z.array(z.object({ label: ShortTextSchema, url: HttpUrlSchema })).max(50),
    archived: z.boolean()
  })
  .superRefine((p, ctx) => {
    if (p.endDate !== undefined && p.endDate < p.startDate) {
      ctx.addIssue({ code: 'custom', message: 'endDate before startDate', path: ['endDate'] })
    }
  })
export type Project = z.infer<typeof ProjectSchema>
