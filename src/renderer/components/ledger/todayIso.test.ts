import { afterEach, describe, expect, it, vi } from 'vitest'
import { todayIso } from './todayIso'

describe('todayIso', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats the local date with padding', () => {
    expect(todayIso(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(todayIso(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
  })

  it('uses the current local date by default and follows midnight', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 28, 23, 59, 59))
    expect(todayIso()).toBe('2026-10-28')
    vi.setSystemTime(new Date(2026, 9, 29, 0, 0, 1))
    expect(todayIso()).toBe('2026-10-29')
  })
})
