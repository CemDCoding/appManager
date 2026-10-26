/**
 * Export/import flow (AP-25): native dialogs are injected, so the whole flow
 * runs in unit tests. The renderer never sends a path (section 5).
 */
import { MAX_BACKUPS, MAX_IMPORT_ZIP_BYTES } from '@shared/limits'
import type { AtomicFs } from '../storage/atomic'
import { StorageError } from '../storage/errors'
import type { DataStore } from '../storage/store'
import {
  applyImport,
  buildManifest,
  createExportArchive,
  readCollections,
  readImportArchive
} from './archive'

export interface TransferDeps {
  /** Active data store (changes when the data folder is switched). */
  store: () => DataStore
  appVersion: string
  now: () => Date
  /** Native save dialog; returns the chosen path or null (cancelled). */
  showSaveDialog: (defaultName: string) => Promise<string | null>
  /** Native open dialog for one `.zip`; returns the path or null (cancelled). */
  showOpenDialog: () => Promise<string | null>
  /** Size of the file in bytes (checked before reading it). */
  fileSize: (path: string) => Promise<number>
  readFile: (path: string) => Promise<Uint8Array>
  writeFile: (path: string, data: Uint8Array) => Promise<void>
  fs?: AtomicFs
  keepBackups?: number
  maxImportBytes?: number
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** `appManager-export-YYYY-MM-DD.zip` (local date). */
export function exportFileName(now: Date): string {
  return `appManager-export-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.zip`
}

export class TransferService {
  private readonly deps: TransferDeps

  constructor(deps: TransferDeps) {
    this.deps = deps
  }

  /** Validates all collection files, builds the ZIP and saves it via dialog. */
  async exportZip(): Promise<{ saved: boolean }> {
    const store = this.deps.store()
    // Wait for queued writes so the export contains them.
    await store.idle()
    const now = this.deps.now()
    const contents = await readCollections(store.dir)
    const archive = await createExportArchive(contents, buildManifest(this.deps.appVersion, now))
    const target = await this.deps.showSaveDialog(exportFileName(now))
    if (target === null) return { saved: false }
    try {
      await this.deps.writeFile(target, archive)
    } catch {
      throw new StorageError('IO', 'export: file could not be written')
    }
    return { saved: true }
  }

  /**
   * Opens a ZIP via dialog, checks and validates it completely, and only then
   * backs up and replaces the data (store reloads afterwards).
   */
  async importZip(): Promise<{ imported: boolean }> {
    const source = await this.deps.showOpenDialog()
    if (source === null) return { imported: false }
    const max = this.deps.maxImportBytes ?? MAX_IMPORT_ZIP_BYTES

    let size: number
    try {
      size = await this.deps.fileSize(source)
    } catch {
      throw new StorageError('IO', 'import: file could not be read')
    }
    if (size > max) throw new StorageError('INVALID_DATA', 'import: file too large')
    let data: Uint8Array
    try {
      data = await this.deps.readFile(source)
    } catch {
      throw new StorageError('IO', 'import: file could not be read')
    }
    const contents = await readImportArchive(data, max)

    const store = this.deps.store()
    await store.replaceFiles(() =>
      applyImport(store.dir, contents, this.deps.now(), {
        fs: this.deps.fs,
        // While the current state is broken, old backups are not rotated away.
        keep: store.allUsable() ? (this.deps.keepBackups ?? MAX_BACKUPS) : null
      })
    )
    return { imported: true }
  }
}
