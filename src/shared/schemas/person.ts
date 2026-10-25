import { z } from 'zod'
import { BaseShape, NameSchema, NoteSchema, ShortTextSchema } from './common'

/**
 * Person (PE-09, PE-36). Data minimisation: ONLY name, role, status, note.
 * No contact data, no bank data, no hourly rate. Do not add fields.
 */
export const PersonSchema = z.object({
  ...BaseShape,
  name: NameSchema,
  role: ShortTextSchema,
  status: z.enum(['active', 'inactive']),
  note: NoteSchema
})
export type Person = z.infer<typeof PersonSchema>
