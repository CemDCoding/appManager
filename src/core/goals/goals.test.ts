import { describe, expect, it } from 'vitest'
import type { Goal } from '@shared/schemas/goal'
import type { UserMetric } from '@shared/schemas/userMetric'
import { buildLedger, type LedgerInput } from '@core/ledger/ledger'
import {
  ALL,
  equal,
  oneTimeExpense,
  oneTimeIncome,
  project,
  recurringIncome
} from '@core/ledger/testFactories'
import { forecast } from '@core/forecast/forecast'
import { goalProgress, type GoalData } from './goals'

const TS = '2026-01-01T00:00:00.000Z'
const TODAY = '2026-10-26'
const A = project('A', '2026-01-01')
const B = project('B', '2026-01-01')

function goal(kind: Goal['kind'], extra: Partial<Goal> = {}): Goal {
  return {
    id: 'g',
    ownerId: 'local',
    createdAt: TS,
    updatedAt: TS,
    projectId: 'A',
    kind,
    title: 'Goal',
    done: false,
    ...extra
  }
}

function snapshot(projectId: string, date: string, usersTotal: number): UserMetric {
  return {
    id: `${projectId}-${date}`,
    ownerId: 'local',
    createdAt: TS,
    updatedAt: TS,
    projectId,
    date,
    usersTotal,
    usersActive: 0,
    usersPaying: 0
  }
}

function dataOf(
  input: Partial<LedgerInput>,
  userMetrics: UserMetric[] = [],
  today = TODAY
): GoalData {
  const full: LedgerInput = { projects: [A, B], expenses: [], incomes: [], campaigns: [], ...input }
  return {
    ledger: buildLedger(full, { from: '2026-01-01', to: today }),
    forecast: forecast(full, today),
    userMetrics
  }
}

const EMPTY = dataOf({})

describe('goalProgress – revenue', () => {
  const incomes = [
    oneTimeIncome('i1', '2026-02-01', { cents: 10_000 }, 'A'),
    oneTimeIncome('i2', '2026-06-01', { cents: 20_000 }, 'A'),
    oneTimeIncome('i3', '2026-06-01', { cents: 5_000 }, 'B')
  ]
  const data = dataOf({ incomes })

  it('counts incomes of the project from fromDate (inclusive) to today', () => {
    const g = goal('revenue', {
      targetValue: 40_000,
      fromDate: '2026-06-01',
      dueDate: '2026-12-31'
    })
    expect(goalProgress(g, data, TODAY)).toEqual({
      value: 20_000,
      target: 40_000,
      ratio: 5_000,
      status: 'open'
    })
  })

  it('without fromDate counts from the beginning; achieved and capped at 10 000', () => {
    const g = goal('revenue', { targetValue: 25_000 })
    expect(goalProgress(g, data, TODAY)).toEqual({
      value: 30_000,
      target: 25_000,
      ratio: 10_000,
      status: 'achieved'
    })
  })

  it('portfolio counts all projects', () => {
    const g = goal('revenue', { projectId: null, targetValue: 35_000 })
    expect(goalProgress(g, data, TODAY).status).toBe('achieved')
  })

  it('missed after the due date; incomes after the due date do not count', () => {
    const g = goal('revenue', { targetValue: 30_000, dueDate: '2026-05-31' })
    expect(goalProgress(g, data, TODAY)).toEqual({
      value: 10_000,
      target: 30_000,
      ratio: 3_333,
      status: 'missed'
    })
  })

  it('open on the due date itself; ratio rounds down', () => {
    const g = goal('revenue', { targetValue: 30_001, dueDate: TODAY })
    expect(goalProgress(g, data, TODAY)).toMatchObject({ ratio: 9_999, status: 'open' })
  })

  it('goal without data has value 0; target 0 counts as reached', () => {
    expect(goalProgress(goal('revenue', { targetValue: 100 }), EMPTY, TODAY)).toEqual({
      value: 0,
      target: 100,
      ratio: 0,
      status: 'open'
    })
    expect(goalProgress(goal('revenue', { targetValue: 0 }), EMPTY, TODAY)).toMatchObject({
      ratio: 10_000,
      status: 'achieved'
    })
  })
})

describe('goalProgress – users', () => {
  const users = [
    snapshot('A', '2026-03-01', 100),
    snapshot('A', '2026-09-01', 400),
    snapshot('A', '2026-11-01', 900),
    snapshot('B', '2026-08-01', 50),
    snapshot('B', '2026-05-01', 20)
  ]
  const data = dataOf({}, users)

  it('uses the latest total at or before today', () => {
    expect(goalProgress(goal('users', { targetValue: 800 }), data, TODAY)).toEqual({
      value: 400,
      target: 800,
      ratio: 5_000,
      status: 'open'
    })
  })

  it('portfolio sums the latest total of each project', () => {
    expect(goalProgress(goal('users', { projectId: null, targetValue: 450 }), data, TODAY)).toEqual(
      { value: 450, target: 450, ratio: 10_000, status: 'achieved' }
    )
  })

  it('after the due date the state at the due date counts', () => {
    const g = goal('users', { targetValue: 400, dueDate: '2026-08-31' })
    expect(goalProgress(g, data, TODAY)).toMatchObject({ value: 100, status: 'missed' })
  })

  it('without snapshots value 0', () => {
    expect(goalProgress(goal('users', { targetValue: 10 }), EMPTY, TODAY)).toMatchObject({
      value: 0,
      ratio: 0,
      status: 'open'
    })
  })
})

describe('goalProgress – costLimit', () => {
  const expenses = [
    oneTimeExpense('e1', '2026-09-30', { cents: 99_999 }, equal('A')),
    oneTimeExpense('e2', '2026-10-01', { cents: 3_000 }, equal('A')),
    oneTimeExpense('e3', '2026-10-20', { cents: 2_000 }, ALL)
  ]
  const data = dataOf({ expenses })

  it('without due date the goal stays open; value and ratio are computed', () => {
    expect(goalProgress(goal('costLimit', { targetValue: 8_000 }), data, TODAY)).toEqual({
      value: 4_000,
      target: 8_000,
      ratio: 5_000,
      status: 'open'
    })
  })

  it('before the due date over the limit = open, ratio capped', () => {
    const g = goal('costLimit', { projectId: null, targetValue: 4_000, dueDate: '2026-10-31' })
    expect(goalProgress(g, data, TODAY)).toEqual({
      value: 5_000,
      target: 4_000,
      ratio: 10_000,
      status: 'open'
    })
  })

  it('due date = today is still open', () => {
    const g = goal('costLimit', { targetValue: 8_000, dueDate: TODAY })
    expect(goalProgress(g, data, TODAY)).toMatchObject({ value: 4_000, status: 'open' })
  })

  it('after the due date the month of the due date decides: within the limit = achieved', () => {
    const g = goal('costLimit', { targetValue: 100_000, dueDate: '2026-09-30' })
    expect(goalProgress(g, data, TODAY)).toMatchObject({ value: 99_999, status: 'achieved' })
  })

  it('after the due date above the limit = missed', () => {
    const g = goal('costLimit', { targetValue: 99_998, dueDate: '2026-09-30' })
    expect(goalProgress(g, data, TODAY)).toMatchObject({
      value: 99_999,
      ratio: 10_000,
      status: 'missed'
    })
  })

  it('limit 0 after the due date: no costs = achieved with ratio 0, any cost = missed with ratio 10 000', () => {
    const due = { targetValue: 0, dueDate: '2026-10-25' }
    expect(goalProgress(goal('costLimit', due), EMPTY, TODAY)).toEqual({
      value: 0,
      target: 0,
      ratio: 0,
      status: 'achieved'
    })
    expect(goalProgress(goal('costLimit', due), data, TODAY)).toMatchObject({
      ratio: 10_000,
      status: 'missed'
    })
  })
})

describe('goalProgress – breakEven', () => {
  const reached = dataOf({
    expenses: [oneTimeExpense('e', '2026-01-15', { cents: 10_000 }, equal('A'))],
    incomes: [
      oneTimeIncome('i1', '2026-02-10', { cents: 4_000 }, 'A'),
      oneTimeIncome('i2', '2026-03-10', { cents: 6_000 }, 'A')
    ]
  })

  it('achieved when the break-even month <= month of the due date', () => {
    // Month comparison: a due date early in the break-even month still counts.
    expect(goalProgress(goal('breakEven', { dueDate: '2026-03-01' }), reached, TODAY).status).toBe(
      'achieved'
    )
    const g = goal('breakEven', { dueDate: '2026-03-31' })
    expect(goalProgress(g, reached, TODAY)).toEqual({
      value: 10_000,
      target: 10_000,
      ratio: 10_000,
      status: 'achieved'
    })
    expect(goalProgress(goal('breakEven'), reached, TODAY).status).toBe('achieved')
  })

  it('missed when reached only after the due date', () => {
    const g = goal('breakEven', { dueDate: '2026-02-28' })
    expect(goalProgress(g, reached, TODAY)).toEqual({
      value: 4_000,
      target: 10_000,
      ratio: 4_000,
      status: 'missed'
    })
  })

  it('expected break-even is not yet achieved: open', () => {
    const data = dataOf({
      expenses: [oneTimeExpense('e', '2026-01-15', { cents: 100_000 }, equal('A'))],
      incomes: [
        recurringIncome(
          'i',
          { interval: 'monthly', startDate: '2026-02-01' },
          { cents: 10_000 },
          'A'
        )
      ]
    })
    expect(goalProgress(goal('breakEven', { dueDate: '2026-12-31' }), data, TODAY)).toEqual({
      value: 90_000,
      target: 100_000,
      ratio: 9_000,
      status: 'open'
    })
  })

  it('portfolio and goal without data', () => {
    expect(goalProgress(goal('breakEven', { projectId: null }), reached, TODAY).status).toBe(
      'achieved'
    )
    expect(goalProgress(goal('breakEven'), EMPTY, TODAY)).toEqual({
      value: 0,
      target: 0,
      ratio: 0,
      status: 'open'
    })
  })
})

describe('goalProgress – free', () => {
  it('done = achieved, otherwise open or missed after the due date', () => {
    expect(goalProgress(goal('free', { done: true }), EMPTY, TODAY)).toEqual({
      value: 1,
      target: 1,
      ratio: 10_000,
      status: 'achieved'
    })
    expect(goalProgress(goal('free'), EMPTY, TODAY)).toEqual({
      value: 0,
      target: 1,
      ratio: 0,
      status: 'open'
    })
    expect(goalProgress(goal('free', { dueDate: '2026-10-25' }), EMPTY, TODAY).status).toBe(
      'missed'
    )
  })
})

describe('goalProgress – input checks', () => {
  it('rejects an invalid today and a forecast for another day', () => {
    expect(() => goalProgress(goal('free'), EMPTY, '2026-13-01')).toThrow(RangeError)
    expect(() => goalProgress(goal('free'), EMPTY, '2026-10-27')).toThrow(RangeError)
  })

  it('throws when a sum leaves the safe integer range', () => {
    const big = (id: string): ReturnType<typeof oneTimeIncome> =>
      oneTimeIncome(id, '2026-05-01', { cents: 2 ** 52 }, 'A')
    const data = dataOf({ incomes: [big('a'), big('b')] })
    expect(() => goalProgress(goal('revenue', { targetValue: 1 }), data, TODAY)).toThrow(RangeError)
  })
})
