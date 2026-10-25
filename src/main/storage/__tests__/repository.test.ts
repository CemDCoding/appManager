import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Person } from '@shared/schemas/person'
import { CollectionRepository } from '../repository'
import { makeTempDir, personInput, removeDir, testId } from './fixtures'

let dir: string
beforeEach(async () => {
  dir = await makeTempDir()
})
afterEach(async () => {
  await removeDir(dir)
})

function person(): Person {
  return {
    ...(personInput() as Omit<Person, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>),
    id: testId(),
    ownerId: 'local',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
}

describe('CollectionRepository', () => {
  it('treats a missing file as an empty collection and writes the envelope', async () => {
    const repo = new CollectionRepository(dir, 'persons')
    expect((await repo.load()).state).toBe('ok')
    expect(repo.items()).toEqual([])
    const p = person()
    await repo.update((items) => ({ items: [...items, p], result: undefined }))
    const raw = JSON.parse(await readFile(join(dir, 'persons.json'), 'utf8'))
    expect(raw).toEqual({ schemaVersion: 1, items: [p] })
  })

  it.each([
    ['broken JSON', '{ not json'],
    ['wrong version', JSON.stringify({ schemaVersion: 99, items: [] })],
    ['schema violation', JSON.stringify({ schemaVersion: 1, items: [{ name: 'x' }] })]
  ])('reports %s, locks writes and leaves the file untouched', async (_label, content) => {
    const file = join(dir, 'persons.json')
    await writeFile(file, content, 'utf8')
    const log = vi.fn()
    const repo = new CollectionRepository(dir, 'persons', { log })
    expect((await repo.load()).state).toBe('invalid')
    expect(log).toHaveBeenCalledWith('persons', 'INVALID_DATA')
    expect(() => repo.items()).toThrow(expect.objectContaining({ code: 'INVALID_DATA' }))
    await expect(
      repo.update(() => ({ items: [person()], result: undefined }))
    ).rejects.toMatchObject({ code: 'INVALID_DATA' })
    expect(await readFile(file, 'utf8')).toBe(content)
  })

  it('logs only collection name and code, never data', async () => {
    await writeFile(join(dir, 'persons.json'), '{"secret":"Person A"', 'utf8')
    const log = vi.fn()
    const repo = new CollectionRepository(dir, 'persons', { log })
    await repo.load()
    for (const call of log.mock.calls) {
      expect(JSON.stringify(call)).not.toContain('Person A')
    }
  })

  it('serialises concurrent updates (no lost update)', async () => {
    const repo = new CollectionRepository(dir, 'persons')
    await repo.load()
    await Promise.all(
      Array.from({ length: 10 }, () =>
        repo.update((items) => ({ items: [...items, person()], result: undefined }))
      )
    )
    expect(repo.items()).toHaveLength(10)
    const raw = JSON.parse(await readFile(join(dir, 'persons.json'), 'utf8'))
    expect(raw.items).toHaveLength(10)
  })

  it('stores the parsed result (unknown fields stripped)', async () => {
    const p = { ...person(), email: 'x@example.invalid' }
    await writeFile(
      join(dir, 'persons.json'),
      JSON.stringify({ schemaVersion: 1, items: [p] }),
      'utf8'
    )
    const repo = new CollectionRepository(dir, 'persons')
    await repo.load()
    expect(repo.items()[0]).not.toHaveProperty('email')
  })
})
