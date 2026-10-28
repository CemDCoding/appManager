import { describe, expect, it } from 'vitest'
import type { Expense } from '@shared/schemas/expense'
import {
  ALL,
  equal,
  oneTimeExpense,
  percent,
  project,
  recurringExpense
} from '@core/ledger/testFactories'
import { monthlyEquivalent, monthlyFixedCosts } from './fixedCosts'

const A = project('a', '2026-01-01')
const B = project('b', '2026-01-01', '2026-06-30')

describe('monthlyEquivalent (PE-51)', () => {
  it('daily x 365/12, weekly x 52/12, monthly x 1, yearly / 12, half-up', () => {
    expect(monthlyEquivalent(100, 'daily')).toBe(3042) // 3041.67
    expect(monthlyEquivalent(1000, 'weekly')).toBe(4333) // 4333.33
    expect(monthlyEquivalent(999, 'monthly')).toBe(999)
    expect(monthlyEquivalent(12_000, 'yearly')).toBe(1000)
    expect(monthlyEquivalent(6, 'yearly')).toBe(1) // 0.5 -> 1
    expect(monthlyEquivalent(5, 'yearly')).toBe(0) // 0.4167 -> 0
    expect(monthlyEquivalent(0, 'daily')).toBe(0)
  })
})

describe('monthlyFixedCosts', () => {
  const expenses: Expense[] = [
    recurringExpense('m', { interval: 'monthly', startDate: '2026-01-31' }, { cents: 1001 }, ALL),
    recurringExpense(
      'y',
      { interval: 'yearly', startDate: '2025-05-01' },
      { cents: 12_000 },
      equal('a')
    ),
    recurringExpense(
      'usd',
      {
        interval: 'monthly',
        startDate: '2026-01-01',
        priceChanges: [{ fromDate: '2026-05-01', cents: 2000 }]
      },
      { cents: 1000, currency: 'USD', rateToEur: '0.92' },
      percent(['a', 7500], ['b', 2500])
    ),
    recurringExpense(
      'ended',
      { interval: 'monthly', startDate: '2026-01-01', endDate: '2026-04-30' },
      { cents: 777 },
      ALL
    ),
    recurringExpense(
      'future',
      { interval: 'monthly', startDate: '2026-06-01' },
      { cents: 555 },
      ALL
    ),
    oneTimeExpense('once', '2026-05-01', { cents: 99_999 }, ALL)
  ]

  it('sums active recurring expenses on the date, per project and total', () => {
    const r = monthlyFixedCosts(expenses, [A, B], '2026-05-15')
    // m: 1001 -> 501/500 ; y: 1000 -> a ; usd: 2000 USD-cents * 0.92 = 1840 -> 1380/460
    expect(r).toEqual({
      totalCents: 1001 + 1000 + 1840,
      byProject: [
        { projectId: 'a', cents: 501 + 1000 + 1380 },
        { projectId: 'b', cents: 500 + 460 }
      ],
      unallocatedCents: 0,
      errors: []
    })
  })

  it('discontinued project gets nothing after its end date; inactive share goes to the rest', () => {
    const r = monthlyFixedCosts(expenses, [A, B], '2026-07-01')
    expect(r.byProject).toEqual([
      { projectId: 'a', cents: 1001 + 1000 + 1840 + 555 },
      { projectId: 'b', cents: 0 }
    ])
    expect(r.totalCents).toBe(1001 + 1000 + 1840 + 555)
  })

  it('end date and start date are inclusive', () => {
    expect(monthlyFixedCosts([expenses[3]], [A], '2026-04-30').totalCents).toBe(777)
    expect(monthlyFixedCosts([expenses[3]], [A], '2026-05-01').totalCents).toBe(0)
    expect(monthlyFixedCosts([expenses[4]], [A], '2026-06-01').totalCents).toBe(555)
  })

  it('without active projects the amount is unallocated but counted in the total', () => {
    const r = monthlyFixedCosts([expenses[0]], [B], '2026-08-01')
    expect(r).toEqual({
      totalCents: 1001,
      byProject: [{ projectId: 'b', cents: 0 }],
      unallocatedCents: 1001,
      errors: []
    })
  })

  it('conversion errors are reported, not counted as 0', () => {
    const bad = {
      ...expenses[0],
      id: 'bad',
      amount: { cents: 100, currency: 'USD' },
      rateToEur: ''
    } as Expense
    const r = monthlyFixedCosts([bad, expenses[1]], [A], '2026-05-15')
    expect(r.errors).toEqual([{ expenseId: 'bad', error: 'invalidRate' }])
    expect(r.totalCents).toBe(1000)
  })

  it('no projects and no expenses', () => {
    expect(monthlyFixedCosts([], [], '2026-01-01')).toEqual({
      totalCents: 0,
      byProject: [],
      unallocatedCents: 0,
      errors: []
    })
  })

  it('throws on invalid date and on overflow', () => {
    expect(() => monthlyFixedCosts([], [], '2026-13-01')).toThrow(RangeError)
    const huge = recurringExpense(
      'h',
      { interval: 'monthly', startDate: '2026-01-01' },
      { cents: Number.MAX_SAFE_INTEGER },
      ALL
    )
    expect(() => monthlyFixedCosts([huge, huge], [A], '2026-02-01')).toThrow(RangeError)
  })
})

describe('monthlyFixedCosts frequencies and edge dates', () => {
  const run = (interval: 'daily' | 'weekly' | 'yearly', startDate: string, date: string): number =>
    monthlyFixedCosts(
      [recurringExpense('x', { interval, startDate }, { cents: 1000 }, ALL)],
      [A],
      date
    ).totalCents

  it('applies the PE-51 factor for daily, weekly and yearly', () => {
    expect(run('daily', '2026-01-01', '2026-03-10')).toBe(30_417) // 30416.67
    expect(run('weekly', '2026-01-01', '2026-03-10')).toBe(4333)
    expect(run('yearly', '2026-01-01', '2026-03-10')).toBe(83) // 83.33
  })

  it('handles 29 February in a leap year and rejects it otherwise', () => {
    expect(run('yearly', '2024-02-29', '2024-02-29')).toBe(83)
    expect(run('yearly', '2024-02-29', '2024-03-01')).toBe(83)
    expect(() => monthlyFixedCosts([], [], '2026-02-29')).toThrow(RangeError)
  })

  it('price change applies from its date and the original price before', () => {
    const e = recurringExpense(
      'p',
      {
        interval: 'monthly',
        startDate: '2026-01-01',
        priceChanges: [{ fromDate: '2026-03-01', cents: 2000 }]
      },
      { cents: 1000 },
      ALL
    )
    expect(monthlyFixedCosts([e], [A], '2026-02-28').totalCents).toBe(1000)
    expect(monthlyFixedCosts([e], [A], '2026-03-01').totalCents).toBe(2000)
  })

  it('ignores projects not yet started', () => {
    const late = project('late', '2027-01-01')
    const r = monthlyFixedCosts(
      [
        recurringExpense('x', { interval: 'monthly', startDate: '2026-01-01' }, { cents: 500 }, ALL)
      ],
      [late],
      '2026-05-01'
    )
    expect(r.unallocatedCents).toBe(500)
    expect(r.byProject).toEqual([{ projectId: 'late', cents: 0 }])
  })
})
