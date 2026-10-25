import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  COLLECTIONS,
  SCHEMA_VERSION,
  parseCollectionFile,
  type CollectionFile,
  type CollectionName,
  type EntityMap
} from '@shared/collections'
import { nodeAtomicFs, writeFileAtomic, type AtomicFs } from './atomic'
import { StorageError, errnoCode, silentLogger, type SafeLogger } from './errors'

export type RepositoryStatus =
  | { state: 'unloaded' }
  | { state: 'ok' }
  /** File exists but is broken. It is never overwritten (write lock). */
  | { state: 'invalid'; reason: string }
  /** File could not be read (permissions, locked ...). Also write-locked. */
  | { state: 'error'; reason: string }

export interface RepositoryOptions {
  fs?: AtomicFs
  log?: SafeLogger
}

/** Serialises collection data the same way for every write. */
export function serializeCollection<T>(items: readonly T[]): string {
  const file: CollectionFile<T> = { schemaVersion: SCHEMA_VERSION, items: [...items] }
  return `${JSON.stringify(file, null, 2)}\n`
}

/**
 * One JSON file per collection (PE-17). Loads with zod, writes atomically and
 * serialises all writes to its file through a queue.
 */
export class CollectionRepository<C extends CollectionName> {
  readonly name: C
  readonly filePath: string
  private readonly fs: AtomicFs
  private readonly log: SafeLogger
  private current: RepositoryStatus = { state: 'unloaded' }
  private data: EntityMap[C][] = []
  private queue: Promise<unknown> = Promise.resolve()

  constructor(dir: string, name: C, options: RepositoryOptions = {}) {
    this.name = name
    this.filePath = join(dir, COLLECTIONS[name].file)
    this.fs = options.fs ?? nodeAtomicFs
    this.log = options.log ?? silentLogger
  }

  get status(): RepositoryStatus {
    return this.current
  }

  /** Reads and validates the file. A missing file means "empty collection". */
  async load(): Promise<RepositoryStatus> {
    return this.enqueue(async () => {
      let text: string
      try {
        text = await readFile(this.filePath, 'utf8')
      } catch (err) {
        if (errnoCode(err) === 'ENOENT') {
          this.data = []
          this.current = { state: 'ok' }
          return this.current
        }
        this.data = []
        this.current = { state: 'error', reason: 'File could not be read' }
        this.log(this.name, 'IO')
        return this.current
      }
      let raw: unknown
      try {
        raw = JSON.parse(text)
      } catch {
        this.data = []
        this.current = { state: 'invalid', reason: 'File is not valid JSON' }
        this.log(this.name, 'INVALID_DATA')
        return this.current
      }
      const parsed = parseCollectionFile(this.name, raw)
      if (!parsed.ok) {
        this.data = []
        this.current = { state: 'invalid', reason: parsed.message }
        this.log(this.name, 'INVALID_DATA')
        return this.current
      }
      this.data = parsed.file.items
      this.current = { state: 'ok' }
      return this.current
    })
  }

  /** Marks the loaded data as invalid (extra checks beyond the schema). */
  markInvalid(reason: string): void {
    this.data = []
    this.current = { state: 'invalid', reason }
    this.log(this.name, 'INVALID_DATA')
  }

  /** Throws unless the collection is loaded and valid. */
  assertUsable(): void {
    const s = this.current
    if (s.state === 'ok') return
    if (s.state === 'unloaded') {
      throw new StorageError('INTERNAL', `${this.name}: not loaded`)
    }
    if (s.state === 'error') {
      throw new StorageError('IO', `${this.name}: ${s.reason}`)
    }
    throw new StorageError('INVALID_DATA', `${this.name}: ${s.reason}`)
  }

  /** Current items (copy of the array). Throws if the file is invalid. */
  items(): EntityMap[C][] {
    this.assertUsable()
    return [...this.data]
  }

  /**
   * Runs `fn` with the current items inside the write queue and writes its
   * result atomically. In-memory data changes only after the write succeeded.
   * Refuses to write invalid/unreadable collections (the file stays as it is).
   */
  async update<R>(fn: (items: EntityMap[C][]) => { items: EntityMap[C][]; result: R }): Promise<R> {
    return this.enqueue(async () => {
      this.assertUsable()
      const { items, result } = fn([...this.data])
      try {
        await writeFileAtomic(this.filePath, serializeCollection(items), this.fs)
      } catch {
        this.log(this.name, 'IO')
        throw new StorageError('IO', `${this.name}: write failed`)
      }
      this.data = items
      return result
    })
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task)
    this.queue = run.catch(() => undefined)
    return run
  }
}
