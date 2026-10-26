import { describe, expect, it } from 'vitest'
import type { UserMetric } from '@shared/schemas/userMetric'
import {
  chartSeries,
  draftFrom,
  emptyDraft,
  parseCount,
  projectSnapshots,
  validateDraft
} from './logic'

const P = '11111111-1111-4111-8111-111111111111'

function draft(total: string, active: string, paying: string) {
  return {
    ...emptyDraft('2026-03-01'),
    usersTotal: total,
    usersActive: active,
    usersPaying: paying
  }
}

describe('parseCount', () => {
  it('accepts whole numbers only', () => {
    expect(parseCount(' 12 ')).toBe(12)
    expect(parseCount('0')).toBe(0)
    for (const bad of ['', '-1', '1.5', '1e3', 'abc', '9999999999999999']) {
      expect(parseCount(bad)).toBeNull()
    }
  })
})

describe('validateDraft', () => {
  it('accepts valid values', () => {
    expect(validateDraft(draft('100', '40', '10'), P)).toEqual({
      ok: true,
      value: { projectId: P, date: '2026-03-01', usersTotal: 100, usersActive: 40, usersPaying: 10 }
    })
  })
  it('accepts equal values', () => {
    expect(validateDraft(draft('5', '5', '5'), P).ok).toBe(true)
  })
  it('rejects active > total', () => {
    expect(validateDraft(draft('10', '11', '1'), P)).toEqual({
      ok: false,
      issues: ['activeExceedsTotal']
    })
  })
  it('rejects paying > total', () => {
    expect(validateDraft(draft('10', '1', '11'), P)).toEqual({
      ok: false,
      issues: ['payingExceedsTotal']
    })
  })
  it('rejects bad counts and date', () => {
    const r = validateDraft({ ...draft('x', '', '-1'), date: '2026-02-30' }, P)
    expect(r).toEqual({
      ok: false,
      issues: ['invalidDate', 'invalidTotal', 'invalidActive', 'invalidPaying']
    })
  })
  it('handles optional platforms', () => {
    const ok = validateDraft({ ...draft('10', '5', '1'), platforms: { ios: '4', web: '' } }, P)
    expect(ok.ok && ok.value.perPlatform).toEqual([{ platform: 'ios', users: 4 }])
    const bad = validateDraft({ ...draft('10', '5', '1'), platforms: { ios: 'x' } }, P)
    expect(bad).toEqual({ ok: false, issues: ['invalidPlatform'] })
  })
})

describe('lists', () => {
  const mk = (projectId: string, date: string, total: number): UserMetric => ({
    id: date + projectId,
    ownerId: 'local',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    projectId,
    date,
    usersTotal: total,
    usersActive: 1,
    usersPaying: 0
  })
  const all = [mk(P, '2026-01-01', 1), mk('other', '2026-01-02', 2), mk(P, '2026-02-01', 3)]
  it('filters by project, newest first', () => {
    expect(projectSnapshots(all, P).map((m) => m.date)).toEqual(['2026-02-01', '2026-01-01'])
  })
  it('builds ascending chart series', () => {
    const s = chartSeries(projectSnapshots(all, P), { total: 'T', active: 'A', paying: 'P' })
    expect(s[0].points).toEqual([
      { x: '2026-01-01', value: 1 },
      { x: '2026-02-01', value: 3 }
    ])
  })
  it('roundtrips a draft', () => {
    const m = { ...all[0], perPlatform: [{ platform: 'ios', users: 1 }] }
    expect(draftFrom(m).platforms).toEqual({ ios: '1' })
  })
})
