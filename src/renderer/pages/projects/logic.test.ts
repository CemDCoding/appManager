import { describe, expect, it } from 'vitest'
import type { LedgerEntry } from '@core/ledger/ledger'
import { ProjectSchema, type Project } from '@shared/schemas/project'
import type { Service } from '@shared/schemas/service'
import {
  balanceByProject,
  emptyForm,
  filterProjects,
  formFromProject,
  isHttpUrl,
  projectBookings,
  projectServiceRows,
  suggestEndDate,
  toProjectInput,
  todayIso,
  validateForm,
  withArchived
} from './logic'

const ID_A = '00000000-0000-4000-8000-00000000000a'
const ID_B = '00000000-0000-4000-8000-00000000000b'
const ID_S = '00000000-0000-4000-8000-0000000000a1'
const NOW = '2026-10-26T10:00:00.000Z'

function project(id: string, over: Partial<Project> = {}): Project {
  return {
    id,
    ownerId: 'local',
    createdAt: NOW,
    updatedAt: NOW,
    name: `P-${id.slice(-1)}`,
    description: '',
    platforms: ['web'],
    phase: 'live',
    startDate: '2026-01-01',
    links: [],
    archived: false,
    ...over
  }
}

function entry(over: Partial<LedgerEntry>): LedgerEntry {
  return {
    date: '2026-03-01',
    kind: 'expense',
    category: 'hosting',
    projectId: ID_A,
    eurCents: 1000,
    original: { cents: 1000, currency: 'EUR' },
    sourceType: 'expense',
    sourceId: 'x',
    ...over
  }
}

describe('todayIso', () => {
  it('formats the local date with padding', () => {
    expect(todayIso(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('suggestEndDate', () => {
  it('suggests today when switching to discontinued without an end date', () => {
    expect(suggestEndDate('live', 'discontinued', '', '2026-10-26')).toBe('2026-10-26')
  })
  it('keeps an existing end date', () => {
    expect(suggestEndDate('live', 'discontinued', '2026-12-01', '2026-10-26')).toBe('2026-12-01')
  })
  it('does nothing for other phases or when already discontinued', () => {
    expect(suggestEndDate('idea', 'live', '', '2026-10-26')).toBe('')
    expect(suggestEndDate('discontinued', 'discontinued', '', '2026-10-26')).toBe('')
  })
})

describe('isHttpUrl', () => {
  it('accepts only http and https', () => {
    expect(isHttpUrl('https://example.com/a')).toBe(true)
    expect(isHttpUrl('http://example.com')).toBe(true)
    expect(isHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isHttpUrl('file:///etc/passwd')).toBe(false)
    expect(isHttpUrl('example.com')).toBe(false)
    expect(isHttpUrl('')).toBe(false)
  })
})

describe('validateForm', () => {
  const valid = { ...emptyForm('2026-10-26'), name: 'App' }

  it('accepts a minimal valid form', () => {
    expect(validateForm(valid).ok).toBe(true)
  })
  it('requires a name', () => {
    const r = validateForm({ ...valid, name: '   ' })
    expect(r.ok).toBe(false)
    expect(r.errors.name).toBe('required')
  })
  it('rejects an end date before the start date', () => {
    const r = validateForm({ ...valid, endDate: '2026-01-01' })
    expect(r.errors.endDate).toBe('endBeforeStart')
  })
  it('rejects invalid dates', () => {
    expect(validateForm({ ...valid, startDate: '2026-02-30' }).errors.startDate).toBe('invalidDate')
    expect(validateForm({ ...valid, startDate: '' }).errors.startDate).toBe('required')
  })
  it('checks every link per row', () => {
    const r = validateForm({
      ...valid,
      links: [
        { label: 'ok', url: 'https://a.example' },
        { label: 'bad', url: 'ftp://a.example' },
        { label: 'empty', url: ' ' }
      ]
    })
    expect(r.ok).toBe(false)
    expect(r.errors.linkRows[0]).toEqual({})
    expect(r.errors.linkRows[1].url).toBe('invalidUrl')
    expect(r.errors.linkRows[2].url).toBe('required')
  })
})

describe('toProjectInput', () => {
  it('produces data accepted by the project schema', () => {
    const form = {
      ...emptyForm('2026-10-26'),
      name: '  App  ',
      platforms: ['web', 'web', 'mobile'],
      endDate: '2026-12-31',
      links: [{ label: ' Repo ', url: ' https://git.example/r ' }]
    }
    const input = toProjectInput(form, false)
    expect(input.name).toBe('App')
    expect(input.platforms).toEqual(['web', 'mobile'])
    expect(input.links).toEqual([{ label: 'Repo', url: 'https://git.example/r' }])
    const parsed = ProjectSchema.safeParse({
      ...input,
      id: ID_A,
      ownerId: 'local',
      createdAt: NOW,
      updatedAt: NOW
    })
    expect(parsed.success).toBe(true)
  })
  it('omits an empty end date', () => {
    expect('endDate' in toProjectInput(emptyForm('2026-10-26'), false)).toBe(false)
  })
  it('withArchived only changes the flag', () => {
    const p = project(ID_A, { endDate: '2026-12-01' })
    expect(withArchived(p, true)).toEqual({
      ...toProjectInput(formFromProject(p), false),
      archived: true
    })
  })
})

describe('filterProjects', () => {
  const list = [project(ID_A, { phase: 'live' }), project(ID_B, { phase: 'idea', archived: true })]
  it('hides archived by default and filters by phase', () => {
    expect(filterProjects(list, { phase: 'all', showArchived: false }).map((p) => p.id)).toEqual([
      ID_A
    ])
    expect(filterProjects(list, { phase: 'all', showArchived: true })).toHaveLength(2)
    expect(filterProjects(list, { phase: 'idea', showArchived: true }).map((p) => p.id)).toEqual([
      ID_B
    ])
  })
})

describe('balanceByProject', () => {
  it('sums income minus expense per project and skips unallocated', () => {
    const map = balanceByProject([
      entry({ eurCents: 300 }),
      entry({ kind: 'income', category: 'storeSales', eurCents: 1000, sourceType: 'income' }),
      entry({ projectId: null, unallocated: true, eurCents: 50 })
    ])
    expect(map.get(ID_A)).toBe(700)
    expect(map.size).toBe(1)
  })
})

describe('projectServiceRows', () => {
  const projects = [project(ID_A), project(ID_B)]
  const service = (over: Partial<Service>): Service => ({
    id: ID_S,
    ownerId: 'local',
    createdAt: NOW,
    updatedAt: NOW,
    provider: 'Vercel',
    purpose: 'hosting',
    plan: '',
    note: '',
    allocation: { mode: 'all', split: 'equal', shares: [] },
    ...over
  })

  it('computes the share today and costs from the ledger', () => {
    const rows = projectServiceRows(
      [service({})],
      projects,
      ID_A,
      [entry({ serviceId: ID_S, eurCents: 250 }), entry({ serviceId: ID_S, eurCents: 250 })],
      '2026-10-26'
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].share).toBe(0.5)
    expect(rows[0].costCents).toBe(500)
  })
  it('uses percent weights for selected allocations', () => {
    const rows = projectServiceRows(
      [
        service({
          allocation: {
            mode: 'selected',
            split: 'percent',
            shares: [
              { projectId: ID_A, percentBasisPoints: 7500 },
              { projectId: ID_B, percentBasisPoints: 2500 }
            ]
          }
        })
      ],
      projects,
      ID_B,
      [],
      '2026-10-26'
    )
    expect(rows[0].share).toBe(0.25)
    expect(rows[0].costCents).toBe(0)
  })
  it('omits services without share and cost', () => {
    const rows = projectServiceRows(
      [
        service({
          allocation: {
            mode: 'selected',
            split: 'equal',
            shares: [{ projectId: ID_B, percentBasisPoints: 0 }]
          }
        })
      ],
      projects,
      ID_A,
      [],
      '2026-10-26'
    )
    expect(rows).toEqual([])
  })
})

describe('projectBookings', () => {
  it('keeps only the project and sorts newest first', () => {
    const rows = projectBookings(
      [
        entry({ date: '2026-01-01', sourceId: 'a' }),
        entry({ date: '2026-05-01', sourceId: 'b' }),
        entry({ date: '2026-09-01', sourceId: 'c', projectId: ID_B })
      ],
      ID_A
    )
    expect(rows.map((r) => r.sourceId)).toEqual(['b', 'a'])
  })
})
