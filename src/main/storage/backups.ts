import { copyFile, mkdir, readFile, readdir, rename, rm, stat } from 'node:fs/promises'
import { isAbsolute, join, relative } from 'node:path'
import {
  COLLECTIONS,
  COLLECTION_NAMES,
  parseCollectionFile,
  type CollectionName
} from '@shared/collections'
import { BackupNameSchema, type BackupInfo } from '@shared/ipc'
import { MAX_BACKUPS } from '@shared/limits'
import { nodeAtomicFs, writeFileAtomic, type AtomicFs } from './atomic'
import { StorageError, errnoCode } from './errors'
import { serializeCollection } from './repository'

export const BACKUPS_DIR = 'backups'

/** `YYYY-MM-DD_HH-mm-ss`, optionally `-<n>` if several backups share one second. */
const BACKUP_NAME = /^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})(?:-(\d{1,4}))?$/

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Backup folder name from local time. */
export function formatBackupName(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_` +
    `${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`
  )
}

interface ParsedName {
  name: string
  date: Date
  seq: number
}

function parseBackupName(name: string): ParsedName | null {
  const m = BACKUP_NAME.exec(name)
  if (!m) return null
  const [y, mo, d, h, mi, s] = m.slice(1, 7).map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number
  ]
  const date = new Date(y, mo - 1, d, h, mi, s)
  if (Number.isNaN(date.getTime())) return null
  return { name, date, seq: m[7] === undefined ? 0 : Number(m[7]) }
}

/** Newest first. */
function compareNewestFirst(a: ParsedName, b: ParsedName): number {
  const byTime = b.date.getTime() - a.date.getTime()
  return byTime !== 0 ? byTime : b.seq - a.seq
}

async function readBackupDirs(dataDir: string): Promise<ParsedName[]> {
  let entries
  try {
    entries = await readdir(join(dataDir, BACKUPS_DIR), { withFileTypes: true })
  } catch (err) {
    if (errnoCode(err) === 'ENOENT') return []
    throw new StorageError('IO', 'backups: folder could not be read')
  }
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => parseBackupName(e.name))
    .filter((p): p is ParsedName => p !== null)
    .sort(compareNewestFirst)
}

export async function listBackups(dataDir: string): Promise<BackupInfo[]> {
  const dirs = await readBackupDirs(dataDir)
  return dirs.map((d) => ({ name: d.name, createdAt: d.date.toISOString() }))
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

/**
 * Copies all existing collection files (also broken ones, byte for byte) into
 * `backups/<timestamp>/` and keeps only the newest `keep` backups.
 * Returns the backup name, or null if there was nothing to back up.
 * The folder is filled under a temp name first, so incomplete backups never
 * show up in the list.
 */
export async function createBackup(
  dataDir: string,
  now: Date,
  keep: number = MAX_BACKUPS
): Promise<string | null> {
  const present: string[] = []
  for (const name of COLLECTION_NAMES) {
    const file = COLLECTIONS[name].file
    if (await isFile(join(dataDir, file))) present.push(file)
  }
  if (present.length === 0) return null

  const root = join(dataDir, BACKUPS_DIR)
  const base = formatBackupName(now)
  const taken = new Set((await readBackupDirs(dataDir)).map((d) => d.name))
  let name = base
  for (let seq = 1; taken.has(name); seq++) name = `${base}-${seq}`

  const temp = join(root, `.tmp-${name}`)
  try {
    await mkdir(temp, { recursive: true })
    for (const file of present) await copyFile(join(dataDir, file), join(temp, file))
    await rename(temp, join(root, name))
  } catch {
    await rm(temp, { recursive: true, force: true }).catch(() => {})
    throw new StorageError('IO', 'backups: backup could not be created')
  }
  await rotateBackups(dataDir, keep)
  return name
}

/** Deletes all but the newest `keep` backups. */
export async function rotateBackups(dataDir: string, keep: number = MAX_BACKUPS): Promise<void> {
  const dirs = await readBackupDirs(dataDir)
  for (const old of dirs.slice(keep)) {
    await rm(join(dataDir, BACKUPS_DIR, old.name), { recursive: true, force: true })
  }
}

/** Resolves a backup name to its folder; rejects anything that is not a plain backup name. */
export function backupPath(dataDir: string, name: unknown): string {
  const parsed = BackupNameSchema.safeParse(name)
  if (!parsed.success || parseBackupName(parsed.data) === null) {
    throw new StorageError('VALIDATION', 'backups: invalid backup name')
  }
  const root = join(dataDir, BACKUPS_DIR)
  const full = join(root, parsed.data)
  const rel = relative(root, full)
  if (
    rel === '' ||
    rel.startsWith('..') ||
    isAbsolute(rel) ||
    rel.includes('/') ||
    rel.includes('\\')
  ) {
    throw new StorageError('VALIDATION', 'backups: invalid backup name')
  }
  return full
}

/**
 * Validates every file of the backup and returns the normalised contents.
 * Missing files mean "empty collection". Throws INVALID_DATA if a file is broken.
 */
export async function readBackup(
  dataDir: string,
  name: string
): Promise<Map<CollectionName, string>> {
  const dir = backupPath(dataDir, name)
  const known = new Set((await readBackupDirs(dataDir)).map((d) => d.name))
  if (!known.has(name)) throw new StorageError('NOT_FOUND', 'backups: not found')

  const contents = new Map<CollectionName, string>()
  for (const collection of COLLECTION_NAMES) {
    const file = COLLECTIONS[collection].file
    let text: string
    try {
      text = await readFile(join(dir, file), 'utf8')
    } catch (err) {
      if (errnoCode(err) === 'ENOENT') {
        contents.set(collection, serializeCollection([]))
        continue
      }
      throw new StorageError('IO', `backups: ${collection} could not be read`)
    }
    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      throw new StorageError('INVALID_DATA', `backups: ${collection} is not valid JSON`)
    }
    const parsed = parseCollectionFile(collection, raw)
    if (!parsed.ok) {
      throw new StorageError('INVALID_DATA', `backups: ${collection} is invalid`)
    }
    if (collection === 'settings' && parsed.file.items.length > 1) {
      throw new StorageError('INVALID_DATA', 'backups: settings must contain exactly one item')
    }
    contents.set(collection, serializeCollection(parsed.file.items))
  }
  return contents
}

/**
 * Restores a backup: validates it completely (in memory), then backs up the
 * current state, then writes every collection file atomically.
 * The caller must reload its repositories afterwards.
 */
export async function restoreBackup(
  dataDir: string,
  name: string,
  now: Date,
  fs: AtomicFs = nodeAtomicFs,
  keep: number = MAX_BACKUPS
): Promise<void> {
  // Read first: rotation below may delete the backup we restore from.
  const contents = await readBackup(dataDir, name)
  await createBackup(dataDir, now, keep)
  for (const [collection, text] of contents) {
    try {
      await writeFileAtomic(join(dataDir, COLLECTIONS[collection].file), text, fs)
    } catch {
      throw new StorageError('IO', `backups: ${collection} could not be restored`)
    }
  }
}
