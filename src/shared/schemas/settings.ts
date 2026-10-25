import { z } from 'zod'
import { MAX_LIST_ENTRIES } from '../limits'
import { CurrencyCodeSchema } from '../money'
import { BaseShape, KeySchema, NameSchema } from './common'

/** Custom list entry (PE-54): added or hidden, never renamed or deleted. */
export const ListEntrySchema = z.object({
  key: KeySchema,
  label: NameSchema,
  hidden: z.boolean()
})
export type ListEntry = z.infer<typeof ListEntrySchema>

/** Custom entries plus the default keys the user hid. */
export const ListSettingSchema = z
  .object({
    custom: z.array(ListEntrySchema).max(MAX_LIST_ENTRIES),
    hiddenDefaults: z.array(KeySchema).max(MAX_LIST_ENTRIES)
  })
  .superRefine((l, ctx) => {
    if (new Set(l.custom.map((e) => e.key)).size !== l.custom.length) {
      ctx.addIssue({ code: 'custom', message: 'Duplicate key', path: ['custom'] })
    }
  })
export type ListSetting = z.infer<typeof ListSettingSchema>

/** Settings (single item). Data path is NOT stored here (kept in app config). */
export const SettingsSchema = z.object({
  ...BaseShape,
  displayCurrency: CurrencyCodeSchema,
  expenseCategories: ListSettingSchema,
  incomeCategories: ListSettingSchema,
  projectPlatforms: ListSettingSchema,
  campaignPlatforms: ListSettingSchema,
  campaignFormats: ListSettingSchema
})
export type Settings = z.infer<typeof SettingsSchema>
