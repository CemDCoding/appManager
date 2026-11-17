import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
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
   * When switching away from an active folder (different resolved path,
   * case-insensitive on Windows), that
   * folder is backed up first, before anything else happens (PE-70). If this
   * backup fails, an IO error is thrown: the new folder is not created,
   * `beforeActivate` does not run and the previous folder stays active.
   *
   * `beforeActivate` (e.g. persisting the choice) runs before switching; if it
   * fails, the previous folder stays active and the error is thrown.
   */
  async open(dir: string, beforeActivate?: () => Promise<void>): Promise<DataStore> {
    const current = this.active
    // Windows paths are case-insensitive: `D:\X` and `d:\x` are the same folder
    // and need no backup of the "old" one. Other platforms compare exactly.
    const normalize = (p: string): string =>
      process.platform === 'win32' ? resolve(p).toLowerCase() : resolve(p)
    if (current && normalize(current.dir) !== normalize(dir)) {
      // Pending writes land first, so the backup holds the latest state.
      await current.idle()
      try {
        await createBackup(current.dir, this.deps.now(), current.allUsable() ? this.keep : null)
      } catch {
        this.log('backups', 'IO')
        throw new StorageError('IO', 'backups: previous folder could not be backed up')
      }
    }
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
