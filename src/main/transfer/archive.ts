/**
 * ZIP export/import of all collection files (AP-25, F-14, section 5).
 * No Electron imports: everything here runs in unit tests with temp folders.
 *
 * Import rules (section 5, never shortened):
 * - only the expected file names at the archive root, no path parts, no
 *   folders, no duplicates, no further entries (zip-slip protection);
 * - size limit for the ZIP file and for the unpacked content (zip bomb);
 * - every file is parsed as JSON and validated with zod, schema version checked;
 * - only after everything passed: backup of the current state, then all files
 *   are replaced; if replacing fails, already replaced files are rolled back.
 */
import { copyFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import JSZip from 'jszip'
import { z } from 'zod'
import {
  COLLECTIONS,
  COLLECTION_NAMES,
  SCHEMA_VERSION,
  parseCollectionFile,
  type CollectionName
} from '@shared/collections'
import { MAX_BACKUPS, MAX_IMPORT_ZIP_BYTES } from '@shared/limits'
import { nodeAtomicFs, tempPathFor, type AtomicFs } from '../storage/atomic'
import { backupPath, createBackup } from '../storage/backups'
import { StorageError, errnoCode } from '../storage/errors'
import { serializeCollection } from '../storage/repository'

export const MANIFEST_FILE = 'manifest.json'
export const MANIFEST_FORMAT = 'appManager-export'

export const ManifestSchema = z
  .object({
    format: z.literal(MANIFEST_FORMAT),
    appVersion: z.string().min(1).max(50),
    schemaVersion: z.number().int(),
    createdAt: z.iso.datetime()
  })
  .strict()
export type Manifest = z.infer<typeof ManifestSchema>

/** Collection contents, already validated and serialised like the repository does. */
export type CollectionContents = Map<CollectionName, string>

const ALLOWED_ENTRIES: ReadonlySet<string> = new Set([
  MANIFEST_FILE,
  ...COLLECTION_NAMES.map((n) => COLLECTIONS[n].file)
])

function invalid(message: string): StorageError {
  return new StorageError('INVALID_DATA', `import: ${message}`)
}

/** Validates parsed JSON of one collection file and returns the normalised text. */
function normaliseCollection(collection: CollectionName, raw: unknown, scope: string): string {
  const parsed = parseCollectionFile(collection, raw)
  if (!parsed.ok) {
    throw new StorageError('INVALID_DATA', `${scope}: ${collection} is invalid (${parsed.reason})`)
  }
  if (collection === 'settings' && parsed.file.items.length > 1) {
    throw new StorageError('INVALID_DATA', `${scope}: settings must contain at most one item`)
  }
  return serializeCollection(parsed.file.items)
}

// ---------- export ----------

/**
 * Reads and validates every collection file of the data folder. A missing
 * file is an empty collection. Broken files are not exported (they could not
 * be imported again), the export fails with INVALID_DATA instead.
 */
export async function readCollections(dataDir: string): Promise<CollectionContents> {
  const contents: CollectionContents = new Map()
  for (const collection of COLLECTION_NAMES) {
    let text: string
    try {
      text = await readFile(join(dataDir, COLLECTIONS[collection].file), 'utf8')
    } catch (err) {
      if (errnoCode(err) === 'ENOENT') {
        contents.set(collection, serializeCollection([]))
        continue
      }
      throw new StorageError('IO', `export: ${collection} could not be read`)
    }
    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      throw new StorageError('INVALID_DATA', `export: ${collection} is not valid JSON`)
    }
    contents.set(collection, normaliseCollection(collection, raw, 'export'))
  }
  return contents
}

export function buildManifest(appVersion: string, now: Date): Manifest {
  return {
    format: MANIFEST_FORMAT,
    appVersion,
    schemaVersion: SCHEMA_VERSION,
    createdAt: now.toISOString()
  }
}

/** ZIP with every collection file and `manifest.json` at the archive root. */
export async function createExportArchive(
  contents: CollectionContents,
  manifest: Manifest
): Promise<Buffer> {
  const zip = new JSZip()
  const date = new Date(manifest.createdAt)
  zip.file(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`, { date })
  for (const collection of COLLECTION_NAMES) {
    const text = contents.get(collection) ?? serializeCollection([])
    zip.file(COLLECTIONS[collection].file, text, { date })
  }
  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  })
}

// ---------- import: archive checks ----------

const EOCD_SIGNATURE = 0x06054b50
const EOCD_MIN_SIZE = 22
const MAX_ZIP_COMMENT = 0xffff

/**
 * Number of entries declared in the "end of central directory" record (the
 * same record JSZip uses). JSZip keeps only one entry per (normalised) name,
 * so comparing both numbers detects duplicate or colliding names.
 * Returns null if there is no record or the archive uses ZIP64.
 */
export function declaredEntryCount(data: Uint8Array): number | null {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const lowest = Math.max(0, data.length - EOCD_MIN_SIZE - MAX_ZIP_COMMENT)
  for (let i = data.length - EOCD_MIN_SIZE; i >= lowest; i--) {
    if (view.getUint32(i, true) !== EOCD_SIGNATURE) continue
    const total = view.getUint16(i + 10, true)
    return total === 0xffff ? null : total
  }
  return null
}

/** Reads one entry, aborting as soon as more than `limit` bytes were unpacked. */
function readEntryLimited(entry: JSZip.JSZipObject, limit: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const stream = entry.nodeStream('nodebuffer') as NodeJS.ReadableStream & {
      destroy?: () => void
    }
    const chunks: Buffer[] = []
    let total = 0
    let settled = false
    const finish = (err: StorageError | null) => {
      if (settled) return
      settled = true
      stream.removeAllListeners('data')
      if (err) {
        stream.pause()
        stream.destroy?.()
        reject(err)
      } else {
        resolve(Buffer.concat(chunks, total))
      }
    }
    stream.on('data', (chunk: Buffer) => {
      if (settled) return
      total += chunk.length
      if (total > limit) {
        finish(invalid('unpacked content too large'))
        return
      }
      chunks.push(chunk)
    })
    stream.on('end', () => finish(null))
    stream.on('error', () => finish(invalid('archive entry is corrupt')))
  })
}

const utf8 = new TextDecoder('utf-8', { fatal: true })

function parseJson(bytes: Buffer, name: string): unknown {
  let text: string
  try {
    text = utf8.decode(bytes)
  } catch {
    throw invalid(`${name} is not UTF-8`)
  }
  try {
    return JSON.parse(text)
  } catch {
    throw invalid(`${name} is not valid JSON`)
  }
}

/**
 * Checks and validates a whole import archive in memory. Throws INVALID_DATA
 * on the first problem; nothing is written here.
 */
export async function readImportArchive(
  data: Uint8Array,
  maxBytes: number = MAX_IMPORT_ZIP_BYTES
): Promise<CollectionContents> {
  if (data.length > maxBytes) throw invalid('file too large')

  let zip: JSZip
  try {
    // No CRC check here: it would unpack everything without a size limit.
    zip = await JSZip.loadAsync(data, { createFolders: false })
  } catch {
    throw invalid('not a valid ZIP archive')
  }

  const names = Object.keys(zip.files)
  const declared = declaredEntryCount(data)
  if (declared === null || declared !== names.length) {
    throw invalid('duplicate or unsupported entries')
  }
  if (names.length !== ALLOWED_ENTRIES.size) throw invalid('unexpected number of entries')

  const entries = new Map<string, JSZip.JSZipObject>()
  for (const name of names) {
    const entry = zip.files[name]
    if (!entry || entry.dir) throw invalid('folders are not allowed')
    // JSZip strips "../" from `name`; the original name must already be clean.
    const original = entry.unsafeOriginalName ?? entry.name
    if (original !== entry.name || !ALLOWED_ENTRIES.has(original)) {
      throw invalid('unexpected entry name')
    }
    entries.set(original, entry)
  }
  for (const expected of ALLOWED_ENTRIES) {
    if (!entries.has(expected)) throw invalid(`${expected} is missing`)
  }

  // Unpack with one shared budget for all entries (zip bomb protection).
  let budget = maxBytes
  const unpacked = new Map<string, Buffer>()
  for (const [name, entry] of entries) {
    const bytes = await readEntryLimited(entry, budget)
    budget -= bytes.length
    unpacked.set(name, bytes)
  }

  const manifest = ManifestSchema.safeParse(
    parseJson(unpacked.get(MANIFEST_FILE) as Buffer, MANIFEST_FILE)
  )
  if (!manifest.success) throw invalid('manifest.json is invalid')
  if (manifest.data.schemaVersion !== SCHEMA_VERSION) {
    throw invalid('unsupported schema version')
  }

  const contents: CollectionContents = new Map()
  for (const collection of COLLECTION_NAMES) {
    const file = COLLECTIONS[collection].file
    const raw = parseJson(unpacked.get(file) as Buffer, file)
    contents.set(collection, normaliseCollection(collection, raw, 'import'))
  }
  return contents
}

// ---------- import: replace files ----------

/** Windows can briefly lock files (virus scanner, indexer). */
const RETRYABLE = new Set(['EPERM', 'EACCES', 'EBUSY'])
const RENAME_ATTEMPTS = 5

async function renameWithRetry(fs: AtomicFs, from: string, to: string): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await fs.rename(from, to)
      return
    } catch (err) {
      const code = errnoCode(err)
      if (attempt >= RENAME_ATTEMPTS || code === undefined || !RETRYABLE.has(code)) throw err
      await new Promise((resolve) => setTimeout(resolve, 20 * attempt))
    }
  }
}

/** Puts one file back to its state in `backup` (or removes it if it did not exist). */
async function rollbackFile(
  dataDir: string,
  backupDir: string | null,
  file: string,
  fs: AtomicFs
): Promise<void> {
  const target = join(dataDir, file)
  if (backupDir === null) {
    await fs.remove(target)
    return
  }
  const temp = tempPathFor(target)
  try {
    await copyFile(join(backupDir, file), temp)
  } catch (err) {
    await fs.remove(temp).catch(() => {})
    // Not in the backup = the file did not exist before the import.
    if (errnoCode(err) === 'ENOENT') {
      await fs.remove(target)
      return
    }
    throw err
  }
  await renameWithRetry(fs, temp, target)
}

export interface ApplyImportOptions {
  fs?: AtomicFs
  /** Backups to keep (default MAX_BACKUPS); null = no rotation (current state is broken). */
  keep?: number | null
}

/**
 * Backs up the current state, then replaces every collection file with the
 * validated contents. All new files are written to temp files first; then they
 * are renamed one by one. If a step fails, already replaced files are restored
 * from the backup and the error is thrown (IO).
 */
export async function applyImport(
  dataDir: string,
  contents: CollectionContents,
  now: Date,
  options: ApplyImportOptions = {}
): Promise<void> {
  const fs = options.fs ?? nodeAtomicFs
  const keep = options.keep === undefined ? MAX_BACKUPS : options.keep
  const backupName = await createBackup(dataDir, now, keep)
  const backupDir = backupName === null ? null : backupPath(dataDir, backupName)

  const staged: { file: string; temp: string; target: string }[] = []
  try {
    for (const collection of COLLECTION_NAMES) {
      const file = COLLECTIONS[collection].file
      const target = join(dataDir, file)
      const temp = tempPathFor(target)
      staged.push({ file, temp, target })
      await fs.writeNewFile(temp, contents.get(collection) ?? serializeCollection([]))
    }
  } catch {
    for (const s of staged) await fs.remove(s.temp).catch(() => {})
    throw new StorageError('IO', 'import: files could not be written')
  }

  const replaced: string[] = []
  try {
    for (const s of staged) {
      await renameWithRetry(fs, s.temp, s.target)
      replaced.push(s.file)
    }
  } catch {
    for (const s of staged) await fs.remove(s.temp).catch(() => {})
    let rolledBack = true
    for (const file of replaced) {
      try {
        await rollbackFile(dataDir, backupDir, file, fs)
      } catch {
        rolledBack = false
      }
    }
    throw new StorageError(
      'IO',
      rolledBack
        ? 'import: files could not be replaced, previous state kept'
        : 'import: files could not be replaced, restore the latest backup'
    )
  }
}
