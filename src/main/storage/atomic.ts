import { open, rename, rm } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { basename, dirname, join } from 'node:path'
import { errnoCode } from './errors'

/** File operations used for atomic writes. Injectable to simulate crashes in tests. */
export interface AtomicFs {
  /** Creates a new file (fails if it exists), writes data and flushes it to disk. */
  writeNewFile(path: string, data: string): Promise<void>
  rename(from: string, to: string): Promise<void>
  remove(path: string): Promise<void>
}

export const nodeAtomicFs: AtomicFs = {
  async writeNewFile(path, data) {
    const handle = await open(path, 'wx')
    try {
      await handle.writeFile(data, 'utf8')
      await handle.sync()
    } finally {
      await handle.close()
    }
  },
  rename: (from, to) => rename(from, to),
  remove: (path) => rm(path, { force: true })
}

/** Windows can briefly lock files (virus scanner, indexer). */
const RETRYABLE = new Set(['EPERM', 'EACCES', 'EBUSY'])
const RENAME_ATTEMPTS = 5

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Name of the temp file next to the target (same folder = same volume, rename is atomic). */
export function tempPathFor(target: string): string {
  return join(dirname(target), `.${basename(target)}.${randomBytes(6).toString('hex')}.tmp`)
}

/**
 * Writes `data` atomically: temp file in the same folder, flush, then rename
 * over the target. If anything fails, the old target file stays untouched and
 * the temp file is removed.
 */
export async function writeFileAtomic(
  target: string,
  data: string,
  fs: AtomicFs = nodeAtomicFs
): Promise<void> {
  const temp = tempPathFor(target)
  try {
    await fs.writeNewFile(temp, data)
    for (let attempt = 1; ; attempt++) {
      try {
        await fs.rename(temp, target)
        break
      } catch (err) {
        const code = errnoCode(err)
        if (attempt >= RENAME_ATTEMPTS || code === undefined || !RETRYABLE.has(code)) throw err
        await delay(20 * attempt)
      }
    }
  } catch (err) {
    await fs.remove(temp).catch(() => {})
    throw err
  }
}
