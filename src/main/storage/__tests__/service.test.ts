import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { listBackups } from '../backups'
import { StorageError } from '../errors'
import { DataService } from '../service'
import { makeTempDir, personInput, projectInput, removeDir, testId } from './fixtures'

let root: string
beforeEach(async () => {
  root = await makeTempDir()
})
afterEach(async () => {
  await removeDir(root)
})

/** Inverts the letter case of every character (`D:\X` -> `d:\x`). */
function swapCase(path: string): string {
  return [...path].map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join('')
}

function clock(): () => Date {
  let t = new Date(2026, 2, 1, 10, 0, 0).getTime()
  return () => {
    t += 1000
    return new Date(t)
  }
}

describe('DataService', () => {
  it('throws INTERNAL before a folder is opened', () => {
    const service = new DataService({ now: clock(), newId: testId })
    expect(() => service.store).toThrow(expect.objectContaining({ code: 'INTERNAL' }))
  })

  it('creates the folder, backs up on start and loads data', async () => {
    const dir = join(root, 'data')
    const now = clock()
    const first = new DataService({ now, newId: testId })
    await first.open(dir)
    expect(first.dir).toBe(dir)
    await first.store.create('persons', personInput())

    const second = new DataService({ now, newId: testId })
    await second.open(dir)
    expect(await second.store.list('persons')).toHaveLength(1)
    expect(await second.listBackups()).toHaveLength(1)
  })

  it('restores a backup and reloads the store', async () => {
    const dir = join(root, 'data')
    const now = clock()
    const service = new DataService({ now, newId: testId })
    await service.open(dir)
    await service.store.create('projects', projectInput())
    await service.open(dir) // start backup with one project
    const [backup] = await service.listBackups()
    await service.store.create('projects', projectInput('Later'))
    expect(await service.store.list('projects')).toHaveLength(2)

    await service.restoreBackup(backup!.name)
    expect(await service.store.list('projects')).toHaveLength(1)
    expect((await readdir(join(dir, 'backups'))).length).toBe(2)
  })

  it('does not rotate good backups away while a collection is invalid', async () => {
    const dir = join(root, 'data')
    const now = clock()
    const service = new DataService({ now, newId: testId, keepBackups: 2 })
    await service.open(dir)
    await service.store.create('persons', personInput())
    await service.open(dir)
    await service.open(dir)
    const good = (await service.listBackups()).map((b) => b.name)
    expect(good).toHaveLength(2)

    await writeFile(join(dir, 'persons.json'), 'broken', 'utf8')
    await service.open(dir)
    await service.open(dir)
    const names = (await service.listBackups()).map((b) => b.name)
    expect(names).toHaveLength(4)
    for (const name of good) expect(names).toContain(name)

    // valid again -> rotation resumes
    await writeFile(join(dir, 'persons.json'), '{"schemaVersion":1,"items":[]}', 'utf8')
    await service.open(dir)
    expect(await service.listBackups()).toHaveLength(2)
  })

  it('keeps the previous folder active if beforeActivate fails', async () => {
    const service = new DataService({ now: clock(), newId: testId })
    await service.open(join(root, 'a'))
    await expect(
      service.open(join(root, 'b'), async () => {
        throw new StorageError('IO', 'save failed')
      })
    ).rejects.toMatchObject({ code: 'IO' })
    expect(service.dir).toBe(join(root, 'a'))
    await service.open(join(root, 'b'), async () => {})
    expect(service.dir).toBe(join(root, 'b'))
  })

  it('switches to another folder', async () => {
    const now = clock()
    // Folder b already holds invented data (e.g. chosen again later).
    const other = new DataService({ now, newId: testId })
    await other.open(join(root, 'b'))
    await other.store.create('projects', projectInput('Folder B App'))
    expect(await readdir(join(root, 'b'))).not.toContain('backups')

    const service = new DataService({ now, newId: testId })
    await service.open(join(root, 'a'))
    await service.store.create('persons', personInput())
    await service.open(join(root, 'b'))
    expect(service.dir).toBe(join(root, 'b'))
    expect(await service.store.list('persons')).toEqual([])
    // PE-65: the switch makes the start backup in the new folder.
    const backups = await readdir(join(root, 'b', 'backups'))
    expect(backups).toHaveLength(1)
    expect(await readdir(join(root, 'b', 'backups', backups[0]!))).toContain('projects.json')
    expect(await service.listBackups()).toHaveLength(1)
  })

  describe('backup of the previous folder (PE-70)', () => {
    it('backs up the previous folder before switching', async () => {
      const a = join(root, 'a')
      const b = join(root, 'b')
      const now = clock()
      // b already holds invented data, so it gets its own start backup.
      const other = new DataService({ now, newId: testId })
      await other.open(b)
      await other.store.create('projects', projectInput('Folder B App'))

      const service = new DataService({ now, newId: testId })
      await service.open(a)
      await service.store.create('persons', personInput())
      await service.open(b)
      expect(service.dir).toBe(b)
      const old = await readdir(join(a, 'backups'))
      expect(old).toHaveLength(1)
      expect(await readdir(join(a, 'backups', old[0]!))).toContain('persons.json')
      expect(await readdir(join(b, 'backups'))).toHaveLength(1)
    })

    it('aborts the switch without changes if the backup fails', async () => {
      const a = join(root, 'a')
      const b = join(root, 'b')
      const service = new DataService({ now: clock(), newId: testId })
      await service.open(a)
      await service.store.create('persons', personInput())
      // A file named "backups" blocks the backup folder.
      await writeFile(join(a, 'backups'), 'blocker', 'utf8')
      let called = false
      await expect(
        service.open(b, async () => {
          called = true
        })
      ).rejects.toMatchObject({ code: 'IO' })
      expect(called).toBe(false)
      expect(service.dir).toBe(a)
      expect(await readdir(root)).not.toContain('b')
      expect(await service.store.list('persons')).toHaveLength(1)
    })

    it('rotates old backups in the previous folder', async () => {
      const a = join(root, 'a')
      const service = new DataService({ now: clock(), newId: testId, keepBackups: 2 })
      await service.open(a)
      await service.store.create('persons', personInput())
      // Older backups in a: start backups of reopening the same folder (no switch).
      await service.open(a)
      await service.open(a)
      await service.open(a)
      const older = (await listBackups(a)).map((b) => b.name)
      expect(older).toHaveLength(2)
      await service.store.create('projects', projectInput('Before Leaving'))

      // Only switches to new folders, never back to a.
      await service.open(join(root, 'b'))
      const afterB = (await listBackups(a)).map((b) => b.name)
      expect(afterB).toHaveLength(2)
      // Newest first: the backup made on leaving, then the newest older one.
      expect(older).not.toContain(afterB[0])
      expect(afterB[1]).toBe(older[0])
      expect(afterB).not.toContain(older[1])
      const left = JSON.parse(
        await readFile(join(a, 'backups', afterB[0]!, 'projects.json'), 'utf8')
      ) as { items: unknown[] }
      expect(left.items).toHaveLength(1)

      await service.open(join(root, 'c'))
      expect(service.dir).toBe(join(root, 'c'))
      // Leaving b (no data) does not touch the backups of a.
      expect((await listBackups(a)).map((b) => b.name)).toEqual(afterB)
    })

    it('makes no extra backup when the same folder is opened again', async () => {
      const a = join(root, 'a')
      const service = new DataService({ now: clock(), newId: testId })
      await service.open(a)
      await service.store.create('persons', personInput())
      // Same folder, different spelling (trailing separator): compared resolved.
      await service.open(`${a}/`)
      // Only the start backup of the reopen, no backup of the "previous" folder.
      expect(await readdir(join(a, 'backups'))).toHaveLength(1)
    })

    it.skipIf(process.platform !== 'win32')(
      'makes no extra backup when the same folder is opened with other casing (win32)',
      async () => {
        const a = join(root, 'Data')
        const service = new DataService({ now: clock(), newId: testId })
        await service.open(a)
        await service.store.create('persons', personInput())
        // Same folder on Windows, different letter case (incl. drive letter).
        await service.open(swapCase(a))
        expect(await readdir(join(a, 'backups'))).toHaveLength(1)

        // A really different folder still gets the backup of the previous one.
        await service.open(join(root, 'Other'))
        expect(await readdir(join(a, 'backups'))).toHaveLength(2)
      }
    )
  })
})
