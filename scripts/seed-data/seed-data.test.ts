import { describe, expect, it } from 'vitest'
import { COLLECTION_NAMES, SCHEMA_VERSION, parseCollectionFile } from '@shared/collections'
import { buildSeedData } from './index'

describe('seed data', () => {
  const data = buildSeedData()

  it.each(COLLECTION_NAMES)('%s passes its schema', (name) => {
    const res = parseCollectionFile(name, { schemaVersion: SCHEMA_VERSION, items: data[name] })
    expect(res.ok, res.ok ? '' : res.message).toBe(true)
  })

  it('has the planned sizes', () => {
    expect(data.projects).toHaveLength(4)
    expect(data.services).toHaveLength(5)
    expect(data.expenses).toHaveLength(15)
    expect(data.incomes).toHaveLength(6)
    expect(data.persons).toHaveLength(3)
    expect(data.campaigns).toHaveLength(3)
    expect(data.goals).toHaveLength(4)
    expect(data.settings).toHaveLength(1)
  })

  it('is deterministic and has unique ids', () => {
    expect(buildSeedData()).toEqual(data)
    const ids = COLLECTION_NAMES.flatMap((n) => data[n].map((e) => e.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('references only existing projects, services and persons', () => {
    const projects = new Set(data.projects.map((p) => p.id))
    const services = new Set(data.services.map((s) => s.id))
    const persons = new Set(data.persons.map((p) => p.id))
    const shares = [...data.services, ...data.expenses, ...data.campaigns].flatMap(
      (e) => e.allocation.shares
    )
    shares.forEach((s) => expect(projects.has(s.projectId)).toBe(true))
    data.incomes.forEach((i) => expect(projects.has(i.projectId)).toBe(true))
    data.userMetrics.forEach((m) => expect(projects.has(m.projectId)).toBe(true))
    data.expenses.forEach((e) => {
      if (e.serviceId) expect(services.has(e.serviceId)).toBe(true)
      if (e.personId) expect(persons.has(e.personId)).toBe(true)
    })
  })
})
