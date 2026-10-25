import { describe, expect, it } from 'vitest'
import type { Recurrence } from '@shared/schemas/common'
import { amountAt, occurrences, occurrencesWithAmount } from './recurrence'

const rec = (
  interval: Recurrence['interval'],
  startDate: string,
  endDate?: string,
  priceChanges: Recurrence['priceChanges'] = []
): Recurrence =>
  endDate === undefined
    ? { interval, startDate, priceChanges }
    : { interval, startDate, endDate, priceChanges }

describe('occurrences', () => {
  it.each([
    [
      'daily',
      '2026-12-30',
      '2026-12-30',
      '2027-01-02',
      ['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']
    ],
    [
      'daily',
      '2028-02-27',
      '2028-02-27',
      '2028-03-01',
      ['2028-02-27', '2028-02-28', '2028-02-29', '2028-03-01']
    ],
    [
      'weekly',
      '2026-12-28',
      '2026-12-28',
      '2027-01-18',
      ['2026-12-28', '2027-01-04', '2027-01-11', '2027-01-18']
    ],
    ['weekly', '2026-01-01', '2026-01-02', '2026-01-15', ['2026-01-08', '2026-01-15']],
    [
      'monthly',
      '2026-01-15',
      '2026-01-01',
      '2026-04-30',
      ['2026-01-15', '2026-02-15', '2026-03-15', '2026-04-15']
    ],
    [
      'monthly',
      '2026-11-30',
      '2026-11-01',
      '2027-03-31',
      ['2026-11-30', '2026-12-30', '2027-01-30', '2027-02-28', '2027-03-30']
    ],
    [
      'yearly',
      '2026-05-10',
      '2026-01-01',
      '2029-12-31',
      ['2026-05-10', '2027-05-10', '2028-05-10', '2029-05-10']
    ]
  ] as const)('%s from %s [%s..%s]', (interval, start, from, to, exp) => {
    expect(occurrences(rec(interval, start), from, to)).toEqual(exp)
  })

  it('PE-29: 31st -> Feb -> Mar returns to day 31', () => {
    expect(occurrences(rec('monthly', '2027-01-31'), '2027-01-01', '2027-05-31')).toEqual([
      '2027-01-31',
      '2027-02-28',
      '2027-03-31',
      '2027-04-30',
      '2027-05-31'
    ])
  })
  it('leap year 2028 monthly 31st', () => {
    expect(occurrences(rec('monthly', '2028-01-31'), '2028-02-01', '2028-03-31')).toEqual([
      '2028-02-29',
      '2028-03-31'
    ])
  })
  it('29.02 yearly -> 28.02 in non-leap years, back to 29.02 in 2028', () => {
    expect(occurrences(rec('yearly', '2024-02-29'), '2024-01-01', '2028-12-31')).toEqual([
      '2024-02-29',
      '2025-02-28',
      '2026-02-28',
      '2027-02-28',
      '2028-02-29'
    ])
  })
  it('29.02 monthly start, century rule 2100', () => {
    expect(occurrences(rec('monthly', '2100-01-29'), '2100-02-01', '2100-03-01')).toEqual([
      '2100-02-28'
    ])
    expect(occurrences(rec('yearly', '2096-02-29'), '2100-01-01', '2100-12-31')).toEqual([
      '2100-02-28'
    ])
    expect(occurrences(rec('yearly', '2000-02-29'), '2400-01-01', '2400-12-31')).toEqual([
      '2400-02-29'
    ])
  })
  it('bounds inclusive; end date on due day included, after excluded', () => {
    const r = rec('monthly', '2026-01-10', '2026-03-10')
    expect(occurrences(r, '2026-01-10', '2026-12-31')).toEqual([
      '2026-01-10',
      '2026-02-10',
      '2026-03-10'
    ])
    expect(occurrences(r, '2026-03-10', '2026-03-10')).toEqual(['2026-03-10'])
    expect(occurrences(r, '2026-03-11', '2026-12-31')).toEqual([])
  })
  it('nothing before start; to before from is empty', () => {
    expect(occurrences(rec('daily', '2026-05-01'), '2026-01-01', '2026-04-30')).toEqual([])
    expect(occurrences(rec('daily', '2026-05-01'), '2026-06-01', '2026-05-01')).toEqual([])
  })
  it('end date later than to is capped by to', () => {
    expect(
      occurrences(rec('daily', '2026-05-01', '2026-12-31'), '2026-05-01', '2026-05-02')
    ).toEqual(['2026-05-01', '2026-05-02'])
  })
  it('long range from far after start stays consistent', () => {
    expect(occurrences(rec('yearly', '2000-03-31'), '2026-01-01', '2026-12-31')).toEqual([
      '2026-03-31'
    ])
    expect(occurrences(rec('monthly', '2000-03-31'), '2026-02-01', '2026-02-28')).toEqual([
      '2026-02-28'
    ])
    expect(occurrences(rec('weekly', '2000-01-03'), '2026-01-05', '2026-01-11')).toEqual([
      '2026-01-05'
    ])
  })
  it('rejects invalid dates', () => {
    expect(() => occurrences(rec('daily', '2026-01-01'), '2026-13-01', '2026-12-31')).toThrow(
      RangeError
    )
    expect(() => occurrences(rec('daily', '2026-01-01'), '2026-01-01', 'x')).toThrow(RangeError)
    expect(() => occurrences(rec('daily', '2026-02-30'), '2026-01-01', '2026-12-31')).toThrow(
      RangeError
    )
    expect(() =>
      occurrences(rec('daily', '2026-01-01', '2026-99-01'), '2026-01-01', '2026-12-31')
    ).toThrow(RangeError)
  })
})

describe('amountAt', () => {
  const r = rec('monthly', '2026-01-01', undefined, [
    { fromDate: '2026-09-15', cents: 1500 },
    { fromDate: '2026-04-01', cents: 1200 }
  ])
  it.each([
    ['2026-03-31', 1000],
    ['2026-04-01', 1200],
    ['2026-09-14', 1200],
    ['2026-09-15', 1500],
    ['2030-01-01', 1500]
  ])('%s -> %i', (d, c) => {
    expect(amountAt(r, 1000, d)).toBe(c)
  })
  it('no changes -> base', () => {
    expect(amountAt(rec('daily', '2026-01-01'), 700, '2026-02-02')).toBe(700)
  })
  it('rejects invalid date', () => {
    expect(() => amountAt(r, 1, 'nope')).toThrow(RangeError)
  })
})

describe('occurrencesWithAmount', () => {
  it('price change exactly on due day applies', () => {
    const r = rec('monthly', '2026-01-31', undefined, [{ fromDate: '2026-02-28', cents: 2000 }])
    expect(occurrencesWithAmount(r, 1000, '2026-01-01', '2026-03-31')).toEqual([
      { date: '2026-01-31', cents: 1000 },
      { date: '2026-02-28', cents: 2000 },
      { date: '2026-03-31', cents: 2000 }
    ])
  })
})
