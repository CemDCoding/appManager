import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { nodeAtomicFs, writeFileAtomic, type AtomicFs } from '../atomic'
import { makeTempDir, removeDir } from './fixtures'

let dir: string
beforeEach(async () => {
  dir = await makeTempDir()
})
afterEach(async () => {
  await removeDir(dir)
})

describe('writeFileAtomic', () => {
  it('writes a new file and replaces an existing one', async () => {
    const target = join(dir, 'a.json')
    await writeFileAtomic(target, 'one')
    await writeFileAtomic(target, 'two')
    expect(await readFile(target, 'utf8')).toBe('two')
    expect(await readdir(dir)).toEqual(['a.json'])
  })

  it('keeps the old file if the process "crashes" while writing the temp file', async () => {
    const target = join(dir, 'a.json')
    await writeFile(target, 'old', 'utf8')
    const crashingFs: AtomicFs = {
      ...nodeAtomicFs,
      async writeNewFile(path, data) {
        await writeFile(path, data.slice(0, 2), 'utf8') // partial content
        throw new Error('simulated crash')
      }
    }
    await expect(writeFileAtomic(target, 'new content', crashingFs)).rejects.toThrow()
    expect(await readFile(target, 'utf8')).toBe('old')
    expect(await readdir(dir)).toEqual(['a.json'])
  })

  it('keeps the old file if rename fails', async () => {
    const target = join(dir, 'a.json')
    await writeFile(target, 'old', 'utf8')
    const failingFs: AtomicFs = {
      ...nodeAtomicFs,
      rename: async () => {
        throw Object.assign(new Error('disk full'), { code: 'ENOSPC' })
      }
    }
    await expect(writeFileAtomic(target, 'new', failingFs)).rejects.toThrow()
    expect(await readFile(target, 'utf8')).toBe('old')
    expect(await readdir(dir)).toEqual(['a.json'])
  })

  it('retries a briefly locked rename (Windows)', async () => {
    const target = join(dir, 'a.json')
    let calls = 0
    const flakyFs: AtomicFs = {
      ...nodeAtomicFs,
      rename: async (from, to) => {
        calls += 1
        if (calls < 3) throw Object.assign(new Error('locked'), { code: 'EPERM' })
        await nodeAtomicFs.rename(from, to)
      }
    }
    await writeFileAtomic(target, 'ok', flakyFs)
    expect(calls).toBe(3)
    expect(await readFile(target, 'utf8')).toBe('ok')
  })
})
