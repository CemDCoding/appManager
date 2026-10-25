import { mkdir } from 'node:fs/promises'
import type { BackupInfo } from '@shared/ipc'
import { MAX_BACKUPS } from '@shared/limits'
import type { AtomicFs } from './atomic'
import { createBackup, listBackups, restoreBackup } from './backups'
import { StorageError, silentLogger, type SafeLogger } from './errors'
import { DataStore } from './store'

export interface DataServiceDeps {
  now: () => Date
  newId: () => string
  log?: SafeLogger
  fs?: AtomicFs
  keepBackups?: number
}

/**
 * Owns the active data folder: opens it (backup on start, load all
 * collections), switches folders and restores backups.
 */
export class DataService {
  private readonly deps: DataServiceDeps
  private readonly log: SafeLogger
  private active: DataStore | null = null

  constructor(deps: DataServiceDeps) {
    this.deps = deps
    this.log = deps.log ?? silentLogger
  }

  get dir(): string {
    return this.store.dir
  }

  get store(): DataStore {
    if (!this.active) throw new StorageError('INTERNAL', 'storage: not opened')
    return this.active
  }

  /**
   * Opens a data folder: creates it if needed, loads all files and makes the
   * start backup (a failed backup is logged, the app still starts). While a
   * collection is invalid, old backups are not rotated away.
   *
   * `beforeActivate` (e.g. persisting the choice) runs before switching; if it
   * fails, the previous folder stays active and the error is thrown.
   */
  async open(dir: string, beforeActivate?: () => Promise<void>): Promise<DataStore> {
    try {
      await mkdir(dir, { recursive: true })
    } catch {
      this.log('dataDir', 'IO')
      throw new StorageError('IO', 'dataDir: folder could not be created')
    }
    const store = new DataStore(dir, {
      now: this.deps.now,
      newId: this.deps.newId,
      fs: this.deps.fs,
      log: this.log
    })
    // Loading never writes, so the backup still captures the files as found.
    await store.loadAll()
    try {
      await createBackup(dir, this.deps.now(), store.allUsable() ? this.keep : null)
    } catch {
      this.log('backups', 'IO')
    }
    if (beforeActivate) await beforeActivate()
    const previous = this.active
    if (previous) await previous.idle()
    this.active = store
    return store
  }

  async listBackups(): Promise<BackupInfo[]> {
    return listBackups(this.dir)
  }

  /** Validates the backup, backs up the current state, restores, reloads. */
  async restoreBackup(name: string): Promise<void> {
    const store = this.store
    await store.replaceFiles(() =>
      restoreBackup(
        store.dir,
        name,
        this.deps.now(),
        this.deps.fs,
        store.allUsable() ? this.keep : null
      )
    )
  }

  private get keep(): number {
    return this.deps.keepBackups ?? MAX_BACKUPS
  }
}
