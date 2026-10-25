import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { EntityCollectionName } from '@shared/collections'
import { nodeAtomicFs, type AtomicFs } from '../atomic'
import { DataStore } from '../store'
import {
  campaignInput,
  exchangeRateInput,
  expenseInput,
  fixedNow,
  goalInput,
  incomeInput,
  makeTempDir,
  personInput,
  projectInput,
  removeDir,
  selected,
  serviceInput,
  testId,
  userMetricInput
} from './fixtures'

let dir: string
beforeEach(async () => {
  dir = await makeTempDir()
})
afterEach(async () => {
  await removeDir(dir)
})

async function openStore(fs?: AtomicFs): Promise<DataStore> {
  const store = new DataStore(dir, { now: fixedNow(), newId: testId, fs })
  await store.loadAll()
  return store
}

describe('DataStore CRUD', () => {
  it('creates, reads, updates and deletes in every entity collection', async () => {
    const store = await openStore()
    const project = await store.create('projects', projectInput())
    const inputs: Record<EntityCollectionName, Record<string, unknown>> = {
      projects: projectInput('Second'),
      services: serviceInput(),
      persons: personInput(),
      expenses: expenseInput(),
      incomes: incomeInput(project.id),
      campaigns: campaignInput(),
      exchangeRates: exchangeRateInput(),
      goals: goalInput(project.id),
      userMetrics: userMetricInput(project.id)
    }
    for (const [name, input] of Object.entries(inputs) as [
      EntityCollectionName,
      Record<string, unknown>
    ][]) {
      const created = await store.create(name, input)
      expect(created.ownerId).toBe('local')
      expect(await store.get(name, created.id)).toEqual(created)
      const updated = await store.update(name, created.id, input)
      expect(updated.createdAt).toBe(created.createdAt)
      // reload from disk gives the same entity
      const reloaded = await openStore()
      expect(await reloaded.get(name, created.id)).toEqual(updated)
      if (name !== 'exchangeRates') {
        await store.delete(name, created.id)
        await expect(store.get(name, created.id)).rejects.toMatchObject({ code: 'NOT_FOUND' })
      }
    }
    await store.delete('projects', project.id)
    expect(await store.list('projects')).toEqual([])
  })

  it('ignores id/ownerId/timestamps from the renderer and strips unknown fields', async () => {
    const store = await openStore()
    const created = await store.create('persons', {
      ...personInput(),
      id: 'evil',
      ownerId: 'someone',
      createdAt: 'x',
      email: 'a@example.invalid'
    })
    expect(created.id).not.toBe('evil')
    expect(created.ownerId).toBe('local')
    expect(created).not.toHaveProperty('email')
    const raw = await readFile(join(dir, 'persons.json'), 'utf8')
    expect(raw).not.toContain('example.invalid')
  })

  it('rejects invalid data with VALIDATION and writes nothing', async () => {
    const store = await openStore()
    await expect(store.create('persons', { name: '' })).rejects.toMatchObject({
      code: 'VALIDATION'
    })
    expect(await store.list('persons')).toEqual([])
  })

  it('returns NOT_FOUND for unknown ids', async () => {
    const store = await openStore()
    await expect(store.update('persons', testId(), personInput())).rejects.toMatchObject({
      code: 'NOT_FOUND'
    })
    await expect(store.delete('persons', testId())).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('keeps the old valid file and memory if a write crashes', async () => {
    const store = await openStore()
    await store.create('persons', personInput())
    const before = await readFile(join(dir, 'persons.json'), 'utf8')

    let crash = true
    const crashingFs: AtomicFs = {
      ...nodeAtomicFs,
      async writeNewFile(path, data) {
        if (crash) {
          await writeFile(path, data.slice(0, 10), 'utf8')
          throw new Error('simulated crash')
        }
        await nodeAtomicFs.writeNewFile(path, data)
      }
    }
    const crashing = await openStore(crashingFs)
    await expect(crashing.create('persons', personInput())).rejects.toMatchObject({ code: 'IO' })
    expect(await readFile(join(dir, 'persons.json'), 'utf8')).toBe(before)
    expect(await crashing.list('persons')).toHaveLength(1)
    crash = false
    await crashing.create('persons', personInput())
    expect(await crashing.list('persons')).toHaveLength(2)
  })

  it('reports an invalid file, refuses writes and does not overwrite it', async () => {
    const file = join(dir, 'projects.json')
    await writeFile(file, '{"schemaVersion":1,"items":[{}]}', 'utf8')
    const store = await openStore()
    expect(store.statuses().projects.state).toBe('invalid')
    await expect(store.list('projects')).rejects.toMatchObject({ code: 'INVALID_DATA' })
    await expect(store.create('projects', projectInput())).rejects.toMatchObject({
      code: 'INVALID_DATA'
    })
    expect(await readFile(file, 'utf8')).toBe('{"schemaVersion":1,"items":[{}]}')
    // other collections still work
    await store.create('persons', personInput())
  })
})

describe('DataStore delete rules (PE-35)', () => {
  it('refuses to delete a referenced project (IN_USE) and allows it without references', async () => {
    const store = await openStore()
    const used = await store.create('projects', projectInput())
    const free = await store.create('projects', projectInput('Free'))
    await store.create('expenses', expenseInput({ allocation: selected(used.id) }))
    await expect(store.delete('projects', used.id)).rejects.toMatchObject({
      code: 'CONFLICT',
      message: expect.stringMatching(/^IN_USE/)
    })
    expect(await store.list('projects')).toHaveLength(2)
    await store.delete('projects', free.id)
    expect((await store.list('projects')).map((p) => p.id)).toEqual([used.id])
  })

  it.each([
    ['incomes', (id: string) => incomeInput(id)],
    ['goals', (id: string) => goalInput(id)],
    ['userMetrics', (id: string) => userMetricInput(id)],
    ['campaigns', (id: string) => campaignInput(selected(id))],
    ['services', (id: string) => ({ ...serviceInput(), allocation: selected(id) })]
  ] as const)('counts references from %s', async (collection, input) => {
    const store = await openStore()
    const project = await store.create('projects', projectInput())
    await store.create(collection, input(project.id))
    await expect(store.delete('projects', project.id)).rejects.toMatchObject({
      code: 'CONFLICT'
    })
  })

  it('refuses to check references when a referencing file is invalid', async () => {
    await writeFile(join(dir, 'incomes.json'), 'broken', 'utf8')
    const store = await openStore()
    const project = await store.create('projects', projectInput())
    await expect(store.delete('projects', project.id)).rejects.toMatchObject({
      code: 'INVALID_DATA'
    })
  })

  it('deleting a person keeps their payments', async () => {
    const store = await openStore()
    const person = await store.create('persons', personInput())
    const expense = await store.create('expenses', expenseInput({ personId: person.id }))
    await store.delete('persons', person.id)
    expect(await store.get('expenses', expense.id)).toMatchObject({ personId: person.id })
  })

  it('deletes linked costs of a service only with cascade', async () => {
    const store = await openStore()
    const s1 = await store.create('services', serviceInput())
    const s2 = await store.create('services', serviceInput())
    await store.create('expenses', expenseInput({ serviceId: s1.id }))
    await store.create('expenses', expenseInput({ serviceId: s2.id }))
    await store.create('expenses', expenseInput())
    await store.delete('services', s1.id)
    expect(await store.list('expenses')).toHaveLength(3)
    await store.delete('services', s2.id, { cascade: true })
    const left = await store.list('expenses')
    expect(left).toHaveLength(2)
    expect(left.some((e) => e.serviceId === s2.id)).toBe(false)
  })

  it('never deletes exchange rates', async () => {
    const store = await openStore()
    const rate = await store.create('exchangeRates', exchangeRateInput())
    await expect(store.delete('exchangeRates', rate.id)).rejects.toMatchObject({
      code: 'FORBIDDEN'
    })
    expect(await store.list('exchangeRates')).toHaveLength(1)
  })
})

describe('DataStore settings', () => {
  const emptyList = { custom: [], hiddenDefaults: [] }
  const baseInput = {
    displayCurrency: 'EUR',
    expenseCategories: emptyList,
    incomeCategories: emptyList,
    projectPlatforms: emptyList,
    campaignPlatforms: emptyList,
    campaignFormats: emptyList
  }

  it('creates defaults once and keeps them stable', async () => {
    const store = await openStore()
    const first = await store.getSettings()
    expect(first.displayCurrency).toBe('EUR')
    expect(await store.getSettings()).toEqual(first)
    const reloaded = await openStore()
    expect(await reloaded.getSettings()).toEqual(first)
  })

  it('saves settings and keeps the id', async () => {
    const store = await openStore()
    const first = await store.getSettings()
    const custom = { key: 'myCat', label: 'My category', hidden: false }
    const saved = await store.setSettings({
      ...baseInput,
      displayCurrency: 'USD',
      expenseCategories: { custom: [custom], hiddenDefaults: ['hardware'] }
    })
    expect(saved.id).toBe(first.id)
    expect(saved.displayCurrency).toBe('USD')
    expect(saved.expenseCategories.custom).toEqual([custom])
  })

  it('rejects custom keys that collide with default keys', async () => {
    const store = await openStore()
    await expect(
      store.setSettings({
        ...baseInput,
        expenseCategories: {
          custom: [{ key: 'hosting', label: 'Hosting', hidden: false }],
          hiddenDefaults: []
        }
      })
    ).rejects.toMatchObject({ code: 'VALIDATION' })
  })

  it('rejects unknown hidden default keys', async () => {
    const store = await openStore()
    await expect(
      store.setSettings({ ...baseInput, campaignFormats: { custom: [], hiddenDefaults: ['nope'] } })
    ).rejects.toMatchObject({ code: 'VALIDATION' })
  })

  it('allows hiding but not removing or renaming custom entries (PE-54)', async () => {
    const store = await openStore()
    const entry = { key: 'myCat', label: 'My category', hidden: false }
    await store.setSettings({
      ...baseInput,
      incomeCategories: { custom: [entry], hiddenDefaults: [] }
    })
    await store.setSettings({
      ...baseInput,
      incomeCategories: { custom: [{ ...entry, hidden: true }], hiddenDefaults: [] }
    })
    await expect(store.setSettings(baseInput)).rejects.toMatchObject({ code: 'CONFLICT' })
    await expect(
      store.setSettings({
        ...baseInput,
        incomeCategories: { custom: [{ ...entry, label: 'Other' }], hiddenDefaults: [] }
      })
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })

  it('treats a settings file with more than one item as invalid', async () => {
    const store = await openStore()
    const s = await store.getSettings()
    const file = join(dir, 'settings.json')
    const content = JSON.stringify({ schemaVersion: 1, items: [s, { ...s, id: testId() }] })
    await writeFile(file, content, 'utf8')
    const reloaded = await openStore()
    expect(reloaded.statuses().settings.state).toBe('invalid')
    await expect(reloaded.getSettings()).rejects.toMatchObject({ code: 'INVALID_DATA' })
    await expect(reloaded.setSettings(baseInput)).rejects.toMatchObject({ code: 'INVALID_DATA' })
    expect(await readFile(file, 'utf8')).toBe(content)
  })
})
