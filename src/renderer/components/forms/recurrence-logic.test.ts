import { describe, expect, it } from 'vitest'
import {
  draftFromRecurrence,
  emptyRecurrenceDraft,
  validateRecurrenceDraft
} from './recurrence-logic'

describe('validateRecurrenceDraft', () => {
  it('builds a recurrence with sorted price changes', () => {
    const draft = {
      ...emptyRecurrenceDraft('2026-01-15'),
      endDate: '2026-12-31',
      priceChanges: [
        { fromDate: '2026-07-01', amountText: '12,00' },
        { fromDate: '2026-04-01', amountText: '11' }
      ]
    }
    expect(validateRecurrenceDraft(draft, 'de')).toEqual({
      ok: true,
      value: {
        interval: 'monthly',
        startDate: '2026-01-15',
        endDate: '2026-12-31',
        priceChanges: [
          { fromDate: '2026-04-01', cents: 1100 },
          { fromDate: '2026-07-01', cents: 1200 }
        ]
      }
    })
  })

  it('omits an empty end date', () => {
    const r = validateRecurrenceDraft(emptyRecurrenceDraft('2026-01-01'), 'en')
    expect(r).toEqual({
      ok: true,
      value: { interval: 'monthly', startDate: '2026-01-01', priceChanges: [] }
    })
  })

  it('reports problems per field', () => {
    const r = validateRecurrenceDraft(
      {
        interval: 'yearly',
        startDate: '2026-05-01',
        endDate: '2026-04-30',
        priceChanges: [
          { fromDate: '2026-04-01', amountText: '1' },
          { fromDate: '2026-06-01', amountText: 'x' },
          { fromDate: '2026-06-01', amountText: '2' },
          { fromDate: '', amountText: '2' }
        ]
      },
      'de'
    )
    expect(r).toEqual({
      ok: false,
      error: [
        { field: 'endDate', code: 'endBeforeStart' },
        { field: 'priceChange', index: 0, code: 'priceChangeBeforeStart' },
        { field: 'priceChange', index: 1, code: 'invalidAmount' },
        { field: 'priceChange', index: 2, code: 'priceChangeDuplicate' },
        { field: 'priceChange', index: 3, code: 'invalidDate' }
      ]
    })
    expect(validateRecurrenceDraft({ ...emptyRecurrenceDraft(''), endDate: 'x' }, 'de')).toEqual({
      ok: false,
      error: [
        { field: 'startDate', code: 'invalidDate' },
        { field: 'endDate', code: 'invalidDate' }
      ]
    })
  })

  it('round-trips a stored recurrence', () => {
    const stored = {
      interval: 'weekly' as const,
      startDate: '2026-01-01',
      priceChanges: [{ fromDate: '2026-02-01', cents: 999 }]
    }
    const draft = draftFromRecurrence(stored, 'de')
    expect(draft.priceChanges).toEqual([{ fromDate: '2026-02-01', amountText: '9,99' }])
    expect(validateRecurrenceDraft(draft, 'de')).toEqual({ ok: true, value: stored })
  })
})
