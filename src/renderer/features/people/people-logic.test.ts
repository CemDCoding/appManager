import { describe, expect, it } from 'vitest'
import type { Ledger, LedgerEntry } from '@core/ledger/ledger'
import type { Person } from '@shared/schemas/person'
import {
  emptyPersonInput,
  filterPersons,
  personDetailPath,
  personPayments,
  personsOfProject,
  totalsByPerson,
  validatePersonInput
} from './people-logic'

const entry = (o: Partial<LedgerEntry>): LedgerEntry => ({
  date: '2026-03-10',
  kind: 'expense',
  category: 'staff',
  projectId: 'p1',
  eurCents: 1000,
  original: { cents: 1000, currency: 'EUR' },
  sourceType: 'expense',
  sourceId: 'e1',
  personId: 'a',
  ...o
})
const ledger: Ledger = {
  errors: [],
  entries: [
    entry({ projectId: 'p1', eurCents: 600 }),
    entry({ projectId: 'p2', eurCents: 400 }),
    entry({ sourceId: 'e2', date: '2026-04-01', projectId: 'p1', eurCents: 300 }),
    entry({ sourceId: 'e3', personId: 'b', projectId: 'p1', eurCents: 50 }),
    entry({ sourceId: 'e4', kind: 'income', personId: undefined })
  ]
}
const range = { from: '2026-01-01', to: '2026-12-31' }
const person = (id: string, name: string, status: Person['status']): Person =>
  ({ id, name, status, role: '', note: '' }) as Person

describe('validatePersonInput', () => {
  it('requires a name and trims', () => {
    expect(validatePersonInput(emptyPersonInput())).toEqual({ ok: false, error: ['nameRequired'] })
    const r = validatePersonInput({ ...emptyPersonInput(), name: '  Ada ', role: ' Dev ' })
    expect(r).toMatchObject({ ok: true, value: { name: 'Ada', role: 'Dev' } })
  })
  it('limits lengths', () => {
    const r = validatePersonInput({
      ...emptyPersonInput(),
      name: 'x'.repeat(201),
      note: 'n'.repeat(5001)
    })
    expect(r).toEqual({ ok: false, error: ['nameTooLong', 'noteTooLong'] })
  })
})

describe('filterPersons', () => {
  const list = [person('1', 'bob', 'inactive'), person('2', 'Ada', 'active')]
  it('filters and sorts by name', () => {
    expect(filterPersons(list, 'all').map((p) => p.id)).toEqual(['2', '1'])
    expect(filterPersons(list, 'inactive').map((p) => p.id)).toEqual(['1'])
  })
})

describe('personPayments', () => {
  it('groups projects per booking day, newest first', () => {
    const rows = personPayments(ledger, 'a', range)
    expect(rows.map((r) => [r.sourceId, r.eurCents, r.projectIds])).toEqual([
      ['e2', 300, ['p1']],
      ['e1', 1000, ['p1', 'p2']]
    ])
  })
  it('respects the range', () => {
    expect(personPayments(ledger, 'a', { from: '2026-04-01', to: '2026-04-30' })).toHaveLength(1)
  })
})

describe('totalsByPerson / personsOfProject', () => {
  it('sums per person', () => {
    const t = totalsByPerson(
      ledger,
      [person('a', 'A', 'active'), person('c', 'C', 'active')],
      range
    )
    expect(t.get('a')).toBe(1300)
    expect(t.get('c')).toBe(0)
  })
  it('lists persons of a project, including unknown ids', () => {
    expect(personsOfProject(ledger, 'p1', range)).toEqual([
      { personId: 'a', eurCents: 900 },
      { personId: 'b', eurCents: 50 }
    ])
    expect(personsOfProject(ledger, 'p2', range)).toEqual([{ personId: 'a', eurCents: 400 }])
  })
})

describe('personDetailPath', () => {
  it('encodes the id', () => {
    expect(personDetailPath('a/b')).toBe('/people/a%2Fb')
  })
})
