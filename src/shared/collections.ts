import { z } from 'zod'
import {
  CampaignSchema,
  ExchangeRateSchema,
  ExpenseSchema,
  GoalSchema,
  IncomeSchema,
  PersonSchema,
  ProjectSchema,
  ServiceSchema,
  SettingsSchema,
  UserMetricSchema,
  type Campaign,
  type ExchangeRate,
  type Expense,
  type Goal,
  type Income,
  type Person,
  type Project,
  type Service,
  type Settings,
  type UserMetric
} from './schemas'

export const SCHEMA_VERSION = 1

/** Entity name -> schema + file name. One file per entity type (PE-17). */
export const COLLECTIONS = {
  projects: { file: 'projects.json', schema: ProjectSchema },
  services: { file: 'services.json', schema: ServiceSchema },
  persons: { file: 'persons.json', schema: PersonSchema },
  expenses: { file: 'expenses.json', schema: ExpenseSchema },
  incomes: { file: 'incomes.json', schema: IncomeSchema },
  campaigns: { file: 'campaigns.json', schema: CampaignSchema },
  exchangeRates: { file: 'exchangeRates.json', schema: ExchangeRateSchema },
  goals: { file: 'goals.json', schema: GoalSchema },
  userMetrics: { file: 'userMetrics.json', schema: UserMetricSchema },
  settings: { file: 'settings.json', schema: SettingsSchema }
} as const

export type CollectionName = keyof typeof COLLECTIONS
export const COLLECTION_NAMES = Object.keys(COLLECTIONS) as CollectionName[]
/** Collections reachable through the generic entity:* channels (settings has its own). */
export const ENTITY_COLLECTION_NAMES = COLLECTION_NAMES.filter(
  (n): n is Exclude<CollectionName, 'settings'> => n !== 'settings'
)
export type EntityCollectionName = Exclude<CollectionName, 'settings'>
export const CollectionNameSchema = z.enum(
  Object.keys(COLLECTIONS) as [CollectionName, ...CollectionName[]]
)
export const EntityCollectionNameSchema = z.enum(
  ENTITY_COLLECTION_NAMES as [EntityCollectionName, ...EntityCollectionName[]]
)

export interface EntityMap {
  projects: Project
  services: Service
  persons: Person
  expenses: Expense
  incomes: Income
  campaigns: Campaign
  exchangeRates: ExchangeRate
  goals: Goal
  userMetrics: UserMetric
  settings: Settings
}

/** Names of all files accepted in a data folder / ZIP (zip-slip whitelist). */
export const COLLECTION_FILES: readonly string[] = COLLECTION_NAMES.map((n) => COLLECTIONS[n].file)

export interface CollectionFile<T> {
  schemaVersion: number
  items: T[]
}

export function emptyCollectionFile<T = never>(): CollectionFile<T> {
  return { schemaVersion: SCHEMA_VERSION, items: [] }
}

export type ParseCollectionResult<C extends CollectionName> =
  | { ok: true; file: CollectionFile<EntityMap[C]> }
  | {
      ok: false
      reason: 'notAnObject' | 'unsupportedVersion' | 'invalid'
      message: string
    }

/**
 * Validates already JSON-parsed file content. Pure validation, no I/O.
 * Fails (never repairs) so main can refuse to overwrite broken files.
 */
export function parseCollectionFile<C extends CollectionName>(
  name: C,
  raw: unknown
): ParseCollectionResult<C> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, reason: 'notAnObject', message: 'File content must be an object' }
  }
  const version = (raw as { schemaVersion?: unknown }).schemaVersion
  if (version !== SCHEMA_VERSION) {
    return {
      ok: false,
      reason: 'unsupportedVersion',
      message: `Unsupported schemaVersion ${String(version)}, expected ${SCHEMA_VERSION}`
    }
  }
  const envelope = z.object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    items: z.array(COLLECTIONS[name].schema as z.ZodType)
  })
  const res = envelope.safeParse(raw)
  if (!res.success) {
    const first = res.error.issues[0]
    const where = first ? first.path.join('.') : ''
    return {
      ok: false,
      reason: 'invalid',
      message: `${COLLECTIONS[name].file}: ${first?.message ?? 'invalid'} (${where})`
    }
  }
  return { ok: true, file: res.data as CollectionFile<EntityMap[C]> }
}
