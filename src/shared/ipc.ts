import { z } from 'zod'
import {
  EntityCollectionNameSchema,
  type EntityCollectionName,
  type EntityMap
} from './collections'
import { CurrencyCodeSchema } from './money'
import { BASE_KEYS, DateStringSchema, HttpUrlSchema, IdSchema } from './schemas/common'
import { SettingsSchema, type Settings } from './schemas/settings'

/** IPC channel names. The renderer never sends file paths (section 5). */
export const IPC_CHANNELS = {
  entityList: 'entity:list',
  entityGet: 'entity:get',
  entityCreate: 'entity:create',
  entityUpdate: 'entity:update',
  entityDelete: 'entity:delete',
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  dataDirGet: 'dataDir:get',
  dataDirChoose: 'dataDir:choose',
  backupList: 'backup:list',
  backupRestore: 'backup:restore',
  shellOpenExternal: 'shell:openExternal',
  exportZip: 'export:zip',
  importZip: 'import:zip',
  pdfExport: 'pdf:export',
  pdfReady: 'pdf:ready'
} as const
export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

// ---------- Result / error ----------

export const IPC_ERROR_CODES = [
  'VALIDATION',
  'NOT_FOUND',
  'CONFLICT',
  'IN_USE',
  'IO',
  'INVALID_DATA',
  'CANCELLED',
  'FORBIDDEN',
  'INTERNAL'
] as const
export type IpcErrorCode = (typeof IPC_ERROR_CODES)[number]

export interface IpcError {
  code: IpcErrorCode
  message: string
}
export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: IpcError }

// ---------- Payload schemas (validated in main) ----------

export const EntityListInputSchema = z.object({ collection: EntityCollectionNameSchema })
export const EntityGetInputSchema = z.object({
  collection: EntityCollectionNameSchema,
  id: IdSchema
})
/**
 * `data` is validated in main against the collection schema after main adds
 * id, ownerId, createdAt, updatedAt. The renderer cannot set those.
 */
export const EntityCreateInputSchema = z.object({
  collection: EntityCollectionNameSchema,
  data: z.record(z.string(), z.unknown())
})
export const EntityUpdateInputSchema = z.object({
  collection: EntityCollectionNameSchema,
  id: IdSchema,
  data: z.record(z.string(), z.unknown())
})
export const EntityDeleteInputSchema = z.object({
  collection: EntityCollectionNameSchema,
  id: IdSchema,
  /** Delete linked costs too (service delete, PE-35). */
  cascade: z.boolean().optional()
})

export const SettingsSetInputSchema = z.object({
  displayCurrency: SettingsSchema.shape.displayCurrency,
  expenseCategories: SettingsSchema.shape.expenseCategories,
  incomeCategories: SettingsSchema.shape.incomeCategories,
  projectPlatforms: SettingsSchema.shape.projectPlatforms,
  campaignPlatforms: SettingsSchema.shape.campaignPlatforms,
  campaignFormats: SettingsSchema.shape.campaignFormats
})
export type SettingsInput = z.infer<typeof SettingsSetInputSchema>

/** Backup folder name only, never a path. */
export const BackupNameSchema = z
  .string()
  .regex(/^[A-Za-z0-9._-]{1,100}$/)
  .refine((v) => !v.includes('..'))
export const BackupRestoreInputSchema = z.object({ name: BackupNameSchema })
export const OpenExternalInputSchema = z.object({ url: HttpUrlSchema })

export const PdfExportInputSchema = z
  .object({
    scope: z.enum(['portfolio', 'project']),
    projectId: IdSchema.optional(),
    period: z.object({ from: DateStringSchema, to: DateStringSchema }),
    language: z.enum(['de', 'en']),
    displayCurrency: CurrencyCodeSchema
  })
  .superRefine((v, ctx) => {
    if (v.scope === 'project' && v.projectId === undefined) {
      ctx.addIssue({ code: 'custom', message: 'projectId required', path: ['projectId'] })
    }
    if (v.scope === 'portfolio' && v.projectId !== undefined) {
      ctx.addIssue({ code: 'custom', message: 'projectId not allowed', path: ['projectId'] })
    }
    if (v.period.to < v.period.from) {
      ctx.addIssue({ code: 'custom', message: 'period.to before from', path: ['period', 'to'] })
    }
  })
export type PdfExportInput = z.infer<typeof PdfExportInputSchema>

/** Report page tells main "fully rendered" (main then calls printToPDF). */
export const PdfReadyInputSchema = z.object({ ready: z.literal(true) })

// ---------- Typed payloads ----------

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never
export type EntityInput<C extends EntityCollectionName> = DistributiveOmit<
  EntityMap[C],
  (typeof BASE_KEYS)[number]
>

export interface BackupInfo {
  /** Folder/file name of the backup, usable in backup:restore. */
  name: string
  /** ISO timestamp. */
  createdAt: string
}

export interface DataDirInfo {
  path: string
}

export type Empty = Record<string, never>

/** `window.api` (preload exposes exactly this). */
export interface AppApi {
  entity: {
    list<C extends EntityCollectionName>(collection: C): Promise<IpcResult<EntityMap[C][]>>
    get<C extends EntityCollectionName>(collection: C, id: string): Promise<IpcResult<EntityMap[C]>>
    create<C extends EntityCollectionName>(
      collection: C,
      data: EntityInput<C>
    ): Promise<IpcResult<EntityMap[C]>>
    update<C extends EntityCollectionName>(
      collection: C,
      id: string,
      data: EntityInput<C>
    ): Promise<IpcResult<EntityMap[C]>>
    delete(
      collection: EntityCollectionName,
      id: string,
      options?: { cascade?: boolean }
    ): Promise<IpcResult<Empty>>
  }
  settings: {
    get(): Promise<IpcResult<Settings>>
    set(input: SettingsInput): Promise<IpcResult<Settings>>
  }
  dataDir: {
    get(): Promise<IpcResult<DataDirInfo>>
    /** Opens a folder dialog in main. `path: null` = cancelled. */
    choose(): Promise<IpcResult<{ path: string | null }>>
  }
  backup: {
    list(): Promise<IpcResult<BackupInfo[]>>
    restore(name: string): Promise<IpcResult<Empty>>
  }
  shell: {
    openExternal(url: string): Promise<IpcResult<Empty>>
  }
  export: {
    /** Save dialog in main. `saved: false` = cancelled. */
    zip(): Promise<IpcResult<{ saved: boolean }>>
  }
  import: {
    /** Open dialog in main; validates before overwriting. */
    zip(): Promise<IpcResult<{ imported: boolean }>>
  }
  pdf: {
    export(input: PdfExportInput): Promise<IpcResult<{ saved: boolean }>>
    ready(): Promise<IpcResult<Empty>>
  }
}

export function ok<T>(data: T): IpcResult<T> {
  return { ok: true, data }
}
export function fail(code: IpcErrorCode, message: string): IpcResult<never> {
  return { ok: false, error: { code, message } }
}
