import { z } from 'zod'
import {
  AllocationSchema,
  BaseShape,
  DescriptionSchema,
  HttpUrlSchema,
  NameSchema,
  NoteSchema,
  ShortTextSchema
} from './common'

/** Deploy / infrastructure service (F-02, PE-12). */
export const ServiceSchema = z.object({
  ...BaseShape,
  provider: NameSchema,
  purpose: DescriptionSchema,
  plan: ShortTextSchema,
  url: HttpUrlSchema.optional(),
  note: NoteSchema,
  allocation: AllocationSchema
})
export type Service = z.infer<typeof ServiceSchema>
