import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { backupPath, createBackup, formatBackupName, listBackups, restoreBackup } from '../backups'
import { serializeCollection } from '../repository'
import { makeTempDir, removeDir } from './fixtures'

let dir: string
beforeEach(async () => {
  dir = await makeTempDir()
})
afterEach(async () => {
  await removeDir(dir)
})

const EMPTY = serializeCollection([])

function at(second: number, minute = 0): Date {
  return new Date(2026, 2, 1, 10, minute, second)
}

async function backupDirs(): Promise<string[]> {
  return (await readdir(join(dir, 'backups'))).sort()
}

describe('createBackup', () => {
  it('does nothing when there are no collection files', async () => {
    expect(await createBackup(dir, at(0))).toBeNull()
  })

  it('copies all collection files (byte for byte, also broken ones)', async () => {
    await writeFile(join(dir, 'projects.json'), EMPTY, 'utf8')
    await writeFile(join(dir, 'persons.json'), 'broken', 'utf8')
    await writeFile(join(dir, 'unrelated.txt'), 'x', 'utf8')
    const name = await createBackup(dir, at(1))
    expect(name).toBe(formatBackupName(at(1)))
    const files = (await readdir(join(dir, 'backups', name!))).sort()
    expect(files).toEqual(['persons.json', 'projects.json'])
    expect(await readFile(join(dir, 'backups', name!, 'persons.json'), 'utf8')).toBe('broken')
  })

  it('uses YYYY-MM-DD_HH-mm-ss and a suffix within the same second', async () => {
    await writeFile(join(dir, 'projects.json'), EMPTY, 'utf8')
    expect(await createBackup(dir, at(5))).toBe('2026-03-01_10-00-05')
    expect(await createBackup(dir, at(5))).toBe('2026-03-01_10-00-05-1')
  })

  it('keeps only the newest 10: the 11th backup deletes the oldest', async () => {
    await writeFile(join(dir, 'projects.json'), EMPTY, 'utf8')
    for (let i = 0; i < 10; i++) await createBackup(dir, at(i))
    expect(await backupDirs()).toHaveLength(10)
    await createBackup(dir, at(10))
    const dirs = await backupDirs()
    expect(dirs).toHaveLength(10)
    expect(dirs).not.toContain(formatBackupName(at(0)))
    expect(dirs).toContain(formatBackupName(at(10)))
  })

  it('ignores foreign folders when rotating', async () => {
    await writeFile(join(dir, 'projects.json'), EMPTY, 'utf8')
    await mkdir(join(dir, 'backups', 'keep-me'), { recursive: true })
    for (let i = 0; i < 12; i++) await createBackup(dir, at(i))
    expect(await backupDirs()).toContain('keep-me')
  })
})

describe('listBackups', () => {
  it('lists newest first with ISO timestamps', async () => {
    await writeFile(join(dir, 'projects.json'), EMPTY, 'utf8')
    await createBackup(dir, at(1))
    await createBackup(dir, at(2))
    const list = await listBackups(dir)
    expect(list.map((b) => b.name)).toEqual([formatBackupName(at(2)), formatBackupName(at(1))])
    expect(list[0]?.createdAt).toBe(at(2).toISOString())
  })

  it('returns an empty list without backups folder', async () => {
    expect(await listBackups(dir)).toEqual([])
  })
})

describe('backupPath', () => {
  it.each(['..', '../x', 'a/b', 'a\\b', '', 'C:', '2026-03-01_10-00-00/../..', 'random'])(
    'rejects %j',
    (name) => {
      expect(() => backupPath(dir, name)).toThrow(expect.objectContaining({ code: 'VALIDATION' }))
    }
  )

  it('accepts a backup name', () => {
    expect(backupPath(dir, '2026-03-01_10-00-00')).toBe(join(dir, 'backups', '2026-03-01_10-00-00'))
  })
})

describe('restoreBackup', () => {
  const project = {
    id: '00000000-0000-4000-8000-000000000001',
    ownerId: 'local',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    name: 'Old',
    description: '',
    platforms: [],
    phase: 'idea',
    startDate: '2026-01-01',
    links: [],
    archived: false
  }

  it('backs up the current state first, then restores', async () => {
    await writeFile(join(dir, 'projects.json'), serializeCollection([project]), 'utf8')
    const name = (await createBackup(dir, at(1)))!
    await writeFile(join(dir, 'projects.json'), EMPTY, 'utf8')
    await writeFile(join(dir, 'persons.json'), EMPTY, 'utf8')

    await restoreBackup(dir, name, at(2))

    const restored = JSON.parse(await readFile(join(dir, 'projects.json'), 'utf8'))
    expect(restored.items).toEqual([project])
    // files missing in the backup become empty collections
    expect(await readFile(join(dir, 'persons.json'), 'utf8')).toBe(EMPTY)
    // pre-restore backup holds the state before the restore
    const pre = formatBackupName(at(2))
    expect(await readFile(join(dir, 'backups', pre, 'projects.json'), 'utf8')).toBe(EMPTY)
  })

  it('restores the oldest backup even if rotation removes it', async () => {
    await writeFile(join(dir, 'projects.json'), serializeCollection([project]), 'utf8')
    const oldest = (await createBackup(dir, at(0)))!
    await writeFile(join(dir, 'projects.json'), EMPTY, 'utf8')
    for (let i = 1; i < 10; i++) await createBackup(dir, at(i))
    await restoreBackup(dir, oldest, at(30))
    const restored = JSON.parse(await readFile(join(dir, 'projects.json'), 'utf8'))
    expect(restored.items).toEqual([project])
    expect(await backupDirs()).toHaveLength(10)
  })

  it('refuses an invalid backup and changes nothing', async () => {
    await writeFile(join(dir, 'projects.json'), EMPTY, 'utf8')
    const name = (await createBackup(dir, at(1)))!
    await writeFile(join(dir, 'backups', name, 'projects.json'), '{"schemaVersion":1}', 'utf8')
    await writeFile(join(dir, 'projects.json'), serializeCollection([project]), 'utf8')
    await expect(restoreBackup(dir, name, at(2))).rejects.toMatchObject({ code: 'INVALID_DATA' })
    const current = JSON.parse(await readFile(join(dir, 'projects.json'), 'utf8'))
    expect(current.items).toEqual([project])
    expect(await backupDirs()).toEqual([name])
  })

  it('returns NOT_FOUND for unknown backups and VALIDATION for path tricks', async () => {
    await expect(restoreBackup(dir, '2026-01-01_00-00-00', at(1))).rejects.toMatchObject({
      code: 'NOT_FOUND'
    })
    await expect(restoreBackup(dir, '../..', at(1))).rejects.toMatchObject({
      code: 'VALIDATION'
    })
  })
})
