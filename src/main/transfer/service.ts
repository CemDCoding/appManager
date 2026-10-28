/**
 * Export/import flow (AP-25): native dialogs are injected, so the whole flow
 * runs in unit tests. The renderer never sends a path (section 5).
 */
import { open } from 'node:fs/promises'
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
  /**
   * @deprecated Ignored since AP-34 (size check and reading are one step in
   * `readImportFile`); kept only so existing wiring still compiles.
   */
  fileSize?: (path: string) => Promise<number>
  /** @deprecated Ignored since AP-34, see `fileSize`. */
  readFile?: (path: string) => Promise<Uint8Array>
  /**
   * Reads the import file and fails with INVALID_DATA as soon as more than
   * `maxBytes` were read (default `readFileLimited`).
   */
  readImportFile?: (path: string, maxBytes: number) => Promise<Uint8Array>
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

const READ_CHUNK_BYTES = 64 * 1024

/**
 * Reads a regular file through one file handle and stops as soon as more than
 * `maxBytes` were read. The limit applies to the bytes actually read, not to
 * an earlier `stat` (no TOCTOU when the file grows in between).
 * Errors: INVALID_DATA (too large), IO (missing, not a file, unreadable).
 */
export async function readFileLimited(path: string, maxBytes: number): Promise<Buffer> {
  const tooLarge = () => new StorageError('INVALID_DATA', 'import: file too large')
  const unreadable = () => new StorageError('IO', 'import: file could not be read')
  let handle: Awaited<ReturnType<typeof open>>
  try {
    handle = await open(path, 'r')
  } catch {
    throw unreadable()
  }
  try {
    let info: Awaited<ReturnType<typeof handle.stat>>
    try {
      info = await handle.stat()
    } catch {
      throw unreadable()
    }
    if (!info.isFile()) throw unreadable()
    // Cheap early exit; the real limit is enforced while reading below.
    if (info.size > maxBytes) throw tooLarge()
    const chunks: Buffer[] = []
    let total = 0
    for (;;) {
      const chunk = Buffer.alloc(READ_CHUNK_BYTES)
      let bytesRead: number
      try {
        ;({ bytesRead } = await handle.read(chunk, 0, chunk.length, null))
      } catch {
        throw unreadable()
      }
      if (bytesRead === 0) break
      total += bytesRead
      if (total > maxBytes) throw tooLarge()
      chunks.push(chunk.subarray(0, bytesRead))
    }
    return Buffer.concat(chunks, total)
  } finally {
    await handle.close().catch(() => {})
  }
}

export class TransferService {
  private readonly deps: TransferDeps

  constructor(deps: TransferDeps) {
    this.deps = deps
  }

  /** Validates all collection files, builds the ZIP and saves it via dialog. */
  async exportZip(): Promise<{ saved: boolean }> {
    const store = this.deps.store()
    // Read under the store lock: queued writes are done first and no mutation
    // or file replacement runs while reading (consistent snapshot, AP-34).
    const contents = await store.readExclusive(() => readCollections(store.dir))
    const now = this.deps.now()
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

    // Size check and reading in one step; nothing is written before all checks passed.
    let data: Uint8Array
    try {
      data = await (this.deps.readImportFile ?? readFileLimited)(source, max)
    } catch (err) {
      if (err instanceof StorageError) throw err
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
