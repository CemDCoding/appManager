import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
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
})
