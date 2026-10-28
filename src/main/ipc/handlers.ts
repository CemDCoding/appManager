import { z } from 'zod'
import {
  BackupRestoreInputSchema,
  EntityCreateInputSchema,
  EntityDeleteInputSchema,
  EntityGetInputSchema,
  EntityListInputSchema,
  EntityUpdateInputSchema,
  IPC_CHANNELS,
  OpenExternalInputSchema,
  SettingsSetInputSchema,
  fail,
  ok,
  type BackupInfo,
  type IpcChannel,
  type IpcResult
} from '@shared/ipc'
import { isSafeExternalUrl } from '../security'
import { StorageError, silentLogger, type SafeLogger } from '../storage/errors'
import type { DataStore } from '../storage/store'

/** Minimal part of Electron's IpcMainInvokeEvent we use. */
export interface InvokeEventLike {
  senderFrame?: { url: string } | null
}

/** Minimal part of Electron's `ipcMain` (injected, mockable in tests). */
export interface IpcMainLike {
  handle(
    channel: string,
    listener: (event: InvokeEventLike, ...args: unknown[]) => Promise<unknown>
  ): void
}

export interface IpcDeps {
  /** Active data store (changes when the data folder is switched). */
  store: () => DataStore
  dataDir: () => string
  /** Native dialog, switch and persist. Null = cancelled. */
  chooseDataDir: () => Promise<string | null>
  listBackups: () => Promise<BackupInfo[]>
  restoreBackup: (name: string) => Promise<void>
  /** `shell.openExternal`; only called with URLs that passed `isSafeExternalUrl`. */
  openExternal: (url: string) => Promise<void>
  /** Rejects IPC from frames that are not the app's own UI. */
  isTrustedSender: (event: InvokeEventLike) => boolean
  log?: SafeLogger
}

/**
 * Channels registered here. export/import (`src/main/transfer`, AP-25) and pdf
 * (`src/main/pdf`, AP-24) register their own handlers.
 */
export const HANDLED_CHANNELS: readonly IpcChannel[] = [
  IPC_CHANNELS.entityList,
  IPC_CHANNELS.entityGet,
  IPC_CHANNELS.entityCreate,
  IPC_CHANNELS.entityUpdate,
  IPC_CHANNELS.entityDelete,
  IPC_CHANNELS.settingsGet,
  IPC_CHANNELS.settingsSet,
  IPC_CHANNELS.dataDirGet,
  IPC_CHANNELS.dataDirChoose,
  IPC_CHANNELS.backupList,
  IPC_CHANNELS.backupRestore,
  IPC_CHANNELS.shellOpenExternal
]

const NoInputSchema = z.undefined()

/**
 * Trusted senders: the dev server origin in dev, otherwise only the packaged
 * UI loaded from `file:`.
 */
export function isTrustedSenderUrl(url: string | undefined, devServerUrl?: string): boolean {
  if (!url) return false
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (devServerUrl) {
    try {
      return parsed.origin === new URL(devServerUrl).origin
    } catch {
      return false
    }
  }
  return parsed.protocol === 'file:'
}

function issueMessage(error: z.ZodError): string {
  const first = error.issues[0]
  const where = first ? first.path.join('.') : ''
  return `${first?.message ?? 'Invalid input'}${where ? ` (${where})` : ''}`
}

/** Registers all AP-07 handlers. Every payload is validated with zod. */
export function registerIpcHandlers(ipc: IpcMainLike, deps: IpcDeps): void {
  const log = deps.log ?? silentLogger

  function handle<S extends z.ZodType, R>(
    channel: IpcChannel,
    schema: S,
    run: (input: z.infer<S>) => Promise<R>
  ): void {
    ipc.handle(channel, async (event, payload): Promise<IpcResult<R>> => {
      if (!deps.isTrustedSender(event)) {
        log(channel, 'FORBIDDEN')
        return fail('FORBIDDEN', 'Untrusted sender')
      }
      const parsed = schema.safeParse(payload)
      if (!parsed.success) return fail('VALIDATION', issueMessage(parsed.error))
      try {
        return ok(await run(parsed.data))
      } catch (err) {
        if (err instanceof StorageError) {
          log(channel, err.code)
          return fail(err.code, err.message)
        }
        log(channel, 'INTERNAL')
        return fail('INTERNAL', 'Internal error')
      }
    })
  }

  handle(IPC_CHANNELS.entityList, EntityListInputSchema, (i) => deps.store().list(i.collection))
  handle(IPC_CHANNELS.entityGet, EntityGetInputSchema, (i) => deps.store().get(i.collection, i.id))
  handle(IPC_CHANNELS.entityCreate, EntityCreateInputSchema, (i) =>
    deps.store().create(i.collection, i.data)
  )
  handle(IPC_CHANNELS.entityUpdate, EntityUpdateInputSchema, (i) =>
    deps.store().update(i.collection, i.id, i.data)
  )
  handle(IPC_CHANNELS.entityDelete, EntityDeleteInputSchema, async (i) => {
    await deps.store().delete(i.collection, i.id, { cascade: i.cascade })
    return {}
  })

  handle(IPC_CHANNELS.settingsGet, NoInputSchema, () => deps.store().getSettings())
  handle(IPC_CHANNELS.settingsSet, SettingsSetInputSchema, (i) => deps.store().setSettings(i))

  handle(IPC_CHANNELS.dataDirGet, NoInputSchema, async () => ({ path: deps.dataDir() }))
  handle(IPC_CHANNELS.dataDirChoose, NoInputSchema, async () => ({
    path: await deps.chooseDataDir()
  }))

  handle(IPC_CHANNELS.backupList, NoInputSchema, () => deps.listBackups())
  handle(IPC_CHANNELS.backupRestore, BackupRestoreInputSchema, async (i) => {
    await deps.restoreBackup(i.name)
    return {}
  })

  handle(IPC_CHANNELS.shellOpenExternal, OpenExternalInputSchema, async (i) => {
    if (!isSafeExternalUrl(i.url)) {
      throw new StorageError('FORBIDDEN', 'URL not allowed')
    }
    await deps.openExternal(new URL(i.url.trim()).href)
    return {}
  })
}
