import { describe, expect, it } from 'vitest'
import { activeProjects, isActive } from './activePeriod'

describe('isActive', () => {
  const p = { startDate: '2026-03-01', endDate: '2026-06-30' as string | undefined }
  it.each([
    ['2026-02-28', false],
    ['2026-03-01', true],
    ['2026-05-15', true],
    ['2026-06-30', true],
    ['2026-07-01', false]
  ])('%s -> %s', (d, exp) => {
    expect(isActive(p, d)).toBe(exp)
  })
  it('open end', () => {
    const open = { startDate: '2026-03-01' }
    expect(isActive(open, '2099-12-31')).toBe(true)
    expect(isActive(open, '2026-02-28')).toBe(false)
  })
  it('rejects invalid date', () => {
    expect(() => isActive(p, '2026-02-30')).toThrow(RangeError)
  })
  it('filters', () => {
    const list = [{ startDate: '2026-01-01' }, { startDate: '2027-01-01' }]
    expect(activeProjects(list, '2026-06-01')).toEqual([list[0]])
  })
})
