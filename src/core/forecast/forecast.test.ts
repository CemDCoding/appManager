import { describe, expect, it } from 'vitest'
import { buildLedger } from '@core/ledger/ledger'
import {
  ALL,
  campaign,
  equal,
  oneTimeExpense,
  oneTimeIncome,
  project,
  recurringExpense,
  recurringIncome
} from '@core/ledger/testFactories'
import { breakEven, endOfMonthAfter, forecast, nextDay, type Forecast } from './forecast'

const A = project('A', '2026-01-01')
const TODAY = '2026-10-26'

function month(f: Forecast, key: string): Forecast['months'][number] {
  const m = f.months.find((x) => x.month === key)
  if (m === undefined) throw new Error(`month ${key} missing`)
  return m
}

describe('date helpers', () => {
  it('nextDay crosses month and year ends and leap days', () => {
    expect(nextDay('2026-10-31')).toBe('2026-11-01')
    expect(nextDay('2026-12-31')).toBe('2027-01-01')
    expect(nextDay('2028-02-28')).toBe('2028-02-29')
    expect(nextDay('2027-02-28')).toBe('2027-03-01')
  })

  it('endOfMonthAfter returns the last day of the target month', () => {
    expect(endOfMonthAfter('2026-10-26', 12)).toBe('2027-10-31')
    expect(endOfMonthAfter('2027-01-31', 1)).toBe('2027-02-28')
    expect(endOfMonthAfter('2027-01-15', 13)).toBe('2028-02-29')
    expect(endOfMonthAfter('2026-10-01', 0)).toBe('2026-10-31')
  })
})

describe('forecast', () => {
  it('covers tomorrow until the end of the month 12 months later, every month listed', () => {
    const f = forecast({ projects: [A], expenses: [], incomes: [] }, TODAY)
    expect(f.today).toBe(TODAY)
    expect(f.from).toBe('2026-10-27')
    expect(f.to).toBe('2027-10-31')
    expect(f.months.map((m) => m.month)).toEqual([
      '2026-10',
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
      '2027-03',
      '2027-04',
      '2027-05',
      '2027-06',
      '2027-07',
      '2027-08',
      '2027-09',
      '2027-10'
    ])
    expect(f.months.every((m) => m.byProject.length === 0 && m.balanceCents === 0)).toBe(true)
    expect(f.errors).toEqual([])
  })

  it('books a yearly subscription exactly in its due month', () => {
    const yearly = recurringExpense(
      'y',
      { interval: 'yearly', startDate: '2025-03-15' },
      { cents: 12_000 },
      equal('A')
    )
    const f = forecast({ projects: [A], expenses: [yearly], incomes: [] }, TODAY)
    const withCosts = f.months.filter((m) => m.expenseCents > 0)
    expect(withCosts).toEqual([
      {
        month: '2027-03',
        incomeCents: 0,
        expenseCents: 12_000,
        balanceCents: -12_000,
        byProject: [{ projectId: 'A', incomeCents: 0, expenseCents: 12_000, balanceCents: -12_000 }]
      }
    ])
  })

  it('today = last day of the month: excludes today, exactly 12 full months, month-end rule', () => {
    const monthly = recurringExpense(
      'm',
      { interval: 'monthly', startDate: '2026-01-31' },
      { cents: 1_000 },
      ALL
    )
    const f = forecast({ projects: [A], expenses: [monthly], incomes: [] }, '2026-10-31')
    expect(f.from).toBe('2026-11-01')
    expect(f.to).toBe('2027-10-31')
    expect(f.months).toHaveLength(12)
    expect(f.months[0].month).toBe('2026-11')
    expect(f.months.every((m) => m.expenseCents === 1_000)).toBe(true)
  })

  it('splits onto projects active on the due date; project end inside the forecast', () => {
    const B = project('B', '2026-01-01', '2026-12-31')
    const monthly = recurringExpense(
      'm',
      { interval: 'monthly', startDate: '2026-01-01' },
      { cents: 1_001 },
      ALL
    )
    const f = forecast({ projects: [A, B], expenses: [monthly], incomes: [] }, TODAY)
    expect(month(f, '2026-10').byProject).toEqual([])
    expect(month(f, '2026-12').byProject.map((p) => [p.projectId, p.expenseCents])).toEqual([
      ['A', 501],
      ['B', 500]
    ])
    expect(month(f, '2027-01').byProject.map((p) => [p.projectId, p.expenseCents])).toEqual([
      ['A', 1_001]
    ])
  })

  it('unallocated costs (no active project) come last as null', () => {
    const B = project('B', '2026-01-01', '2026-11-30')
    const onB = recurringExpense(
      'b',
      { interval: 'monthly', startDate: '2026-01-05' },
      { cents: 300 },
      equal('B')
    )
    const onA = recurringExpense(
      'a',
      { interval: 'monthly', startDate: '2026-01-05' },
      { cents: 200 },
      equal('A')
    )
    const f = forecast({ projects: [B, A], expenses: [onB, onA], incomes: [] }, TODAY)
    expect(month(f, '2026-11').byProject.map((p) => p.projectId)).toEqual(['B', 'A'])
    expect(month(f, '2026-12').byProject.map((p) => [p.projectId, p.expenseCents])).toEqual([
      ['A', 200],
      [null, 300]
    ])
    expect(month(f, '2026-12').expenseCents).toBe(500)
  })

  it('includes recurring incomes and price changes; ignores one-time items and campaigns', () => {
    const income = recurringIncome(
      'i',
      {
        interval: 'monthly',
        startDate: '2026-01-10',
        endDate: '2027-01-10',
        priceChanges: [{ fromDate: '2026-12-10', cents: 700 }]
      },
      { cents: 500 },
      'A'
    )
    const data = {
      projects: [A],
      expenses: [oneTimeExpense('o', '2026-11-01', { cents: 9_999 }, ALL)],
      incomes: [income, oneTimeIncome('oi', '2026-11-02', { cents: 9_999 }, 'A')],
      campaigns: [campaign('c', '2026-11-03', '2026-11-30', { cents: 9_999 }, ALL)]
    }
    const f = forecast(data, TODAY)
    expect(month(f, '2026-11')).toMatchObject({
      incomeCents: 500,
      expenseCents: 0,
      balanceCents: 500
    })
    expect(month(f, '2026-12').incomeCents).toBe(700)
    expect(month(f, '2027-01').incomeCents).toBe(700)
    expect(month(f, '2027-02').incomeCents).toBe(0)
  })

  it('converts with the snapshot rate and reports conversion errors', () => {
    const usd = recurringExpense(
      'u',
      { interval: 'yearly', startDate: '2026-11-01' },
      { cents: 1_000, currency: 'USD', rateToEur: '0.92' },
      ALL
    )
    const broken = recurringExpense(
      'x',
      { interval: 'yearly', startDate: '2026-12-01' },
      { cents: 1_000, currency: 'USD', rateToEur: 'abc' },
      ALL
    )
    const f = forecast({ projects: [A], expenses: [usd, broken], incomes: [] }, TODAY)
    expect(month(f, '2026-11').expenseCents).toBe(920)
    expect(month(f, '2026-12').expenseCents).toBe(0)
    expect(f.errors).toMatchObject([{ date: '2026-12-01', sourceId: 'x', error: 'invalidRate' }])
  })

  it('supports another horizon and is deterministic', () => {
    const data = { projects: [A], expenses: [], incomes: [] }
    const f = forecast(data, TODAY, 1)
    expect(f.to).toBe('2026-11-30')
    expect(f.months.map((m) => m.month)).toEqual(['2026-10', '2026-11'])
    expect(forecast(data, TODAY)).toEqual(forecast(data, TODAY))
  })

  it('rejects invalid input', () => {
    const data = { projects: [A], expenses: [], incomes: [] }
    expect(() => forecast(data, '2026-02-30')).toThrow(RangeError)
    expect(() => forecast(data, TODAY, 0)).toThrow(RangeError)
    expect(() => forecast(data, TODAY, 121)).toThrow(RangeError)
    expect(() => forecast(data, TODAY, 1.5)).toThrow(RangeError)
    expect(() => forecast(data, '9999-12-15')).toThrow(RangeError)
  })

  it('throws when a sum leaves the safe integer range', () => {
    const big = (id: string): ReturnType<typeof recurringExpense> =>
      recurringExpense(id, { interval: 'yearly', startDate: '2026-11-01' }, { cents: 2 ** 52 }, ALL)
    expect(() =>
      forecast({ projects: [A], expenses: [big('a'), big('b')], incomes: [] }, TODAY)
    ).toThrow(RangeError)
  })
})

describe('breakEven', () => {
  const history = (
    data: Parameters<typeof buildLedger>[0],
    to = TODAY
  ): ReturnType<typeof buildLedger> => buildLedger(data, { from: '2026-01-01', to })
  const input = (
    expenses: Parameters<typeof buildLedger>[0]['expenses'],
    incomes: Parameters<typeof buildLedger>[0]['incomes'],
    projects = [A]
  ): Parameters<typeof buildLedger>[0] => ({ projects, expenses, incomes, campaigns: [] })

  it('reached: history alone reaches it', () => {
    const data = input(
      [oneTimeExpense('e', '2026-01-15', { cents: 10_000 }, equal('A'))],
      [
        oneTimeIncome('i1', '2026-02-10', { cents: 4_000 }, 'A'),
        oneTimeIncome('i2', '2026-03-10', { cents: 6_000 }, 'A')
      ]
    )
    expect(breakEven(history(data), forecast(data, TODAY), 'A')).toEqual({ reachedAt: '2026-03' })
  })

  it('expected: only the forecast reaches it', () => {
    const data = input(
      [oneTimeExpense('e', '2026-01-15', { cents: 100_000 }, equal('A'))],
      [
        recurringIncome(
          'i',
          { interval: 'monthly', startDate: '2026-02-01' },
          { cents: 10_000 },
          'A'
        )
      ]
    )
    // Feb..Oct = 9 x 100 EUR in the history, the 10th payment on 2026-11-01.
    expect(breakEven(history(data), forecast(data, TODAY), 'A')).toEqual({ expectedAt: '2026-11' })
  })

  it('expected in the current month via the rest of the month', () => {
    const data = input(
      [oneTimeExpense('e', '2026-10-01', { cents: 100 }, equal('A'))],
      [recurringIncome('i', { interval: 'yearly', startDate: '2026-10-28' }, { cents: 100 }, 'A')]
    )
    expect(breakEven(history(data), forecast(data, TODAY), 'A')).toEqual({ expectedAt: '2026-10' })
  })

  it('reached in the current month up to today', () => {
    const data = input(
      [oneTimeExpense('e', '2026-10-01', { cents: 100 }, equal('A'))],
      [oneTimeIncome('i', TODAY, { cents: 100 }, 'A')]
    )
    expect(breakEven(history(data), forecast(data, TODAY), 'A')).toEqual({ reachedAt: '2026-10' })
  })

  it('ignores history entries after today (no double counting)', () => {
    const data = input(
      [oneTimeExpense('e', '2026-01-15', { cents: 1_000 }, equal('A'))],
      [oneTimeIncome('i', '2026-12-01', { cents: 1_000 }, 'A')]
    )
    expect(breakEven(history(data, '2026-12-31'), forecast(data, TODAY), 'A')).toBe('notInSight')
  })

  it('not in sight: costs stay above incomes', () => {
    const data = input(
      [
        recurringExpense('e', { interval: 'monthly', startDate: '2026-01-01' }, { cents: 100 }, ALL)
      ],
      [recurringIncome('i', { interval: 'monthly', startDate: '2026-01-01' }, { cents: 50 }, 'A')]
    )
    expect(breakEven(history(data), forecast(data, TODAY), 'A')).toBe('notInSight')
  })

  it('not in sight without bookings and for other projects', () => {
    const data = input(
      [],
      [
        oneTimeIncome('i', '2026-03-01', { cents: 100 }, 'A'),
        recurringIncome('r', { interval: 'monthly', startDate: '2026-11-01' }, { cents: 100 }, 'A')
      ]
    )
    expect(breakEven(history(data), forecast(data, TODAY), 'B')).toBe('notInSight')
    expect(breakEven(history(input([], [])), forecast(data, TODAY), 'A')).toEqual({
      expectedAt: '2026-11'
    })
  })

  it('portfolio (null) counts all projects and unallocated entries', () => {
    const B = project('B', '2026-01-01', '2026-03-31')
    const data = input(
      [oneTimeExpense('e', '2026-05-01', { cents: 1_000 }, equal('B'))],
      [oneTimeIncome('i', '2026-06-01', { cents: 1_000 }, 'A')],
      [A, B]
    )
    const h = history(data)
    expect(h.entries[0].unallocated).toBe(true)
    expect(breakEven(h, forecast(data, TODAY), null)).toEqual({ reachedAt: '2026-06' })
    expect(breakEven(h, forecast(data, TODAY), 'A')).toEqual({ reachedAt: '2026-06' })
  })
})
