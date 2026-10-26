import { describe, expect, it } from 'vitest'
import type { Goal } from '@shared/schemas/goal'
import { equal, oneTimeExpense, oneTimeIncome, project } from '@core/ledger/testFactories'
import {
  buildGoalView,
  draftFromGoal,
  emptyGoalDraft,
  groupGoals,
  historyStart,
  monthStart,
  monthlyBalances,
  validateGoalDraft,
  withDone,
  type GoalData,
  type GoalRow
} from './goal-logic'

const TS = '2026-01-01T00:00:00.000Z'
const TODAY = '2026-10-26'

function goal(kind: Goal['kind'], extra: Partial<Goal> = {}): Goal {
  return {
    id: `g-${kind}`,
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

function data(goals: Goal[]): GoalData {
  return {
    goals,
    projects: [project('A', '2026-01-01')],
    expenses: [oneTimeExpense('e1', '2026-10-05', { cents: 8_000 }, equal('A'))],
    incomes: [oneTimeIncome('i1', '2026-10-06', { cents: 20_000 }, 'A')],
    campaigns: [],
    userMetrics: []
  }
}

describe('validateGoalDraft', () => {
  it('builds a revenue goal with cents from the amount text', () => {
    const draft = {
      ...emptyGoalDraft('p1'),
      title: ' Umsatz ',
      target: '1.234,50',
      dueDate: '2026-12-31'
    }
    const res = validateGoalDraft(draft, 'de')
    expect(res).toEqual({
      ok: true,
      value: {
        projectId: 'p1',
        kind: 'revenue',
        title: 'Umsatz',
        targetValue: 123_450,
        dueDate: '2026-12-31',
        done: false
      }
    })
  })

  it('uses null for the portfolio and a plain count for users', () => {
    const res = validateGoalDraft(
      { ...emptyGoalDraft(), kind: 'users', title: 'U', target: '500' },
      'en'
    )
    expect(res).toMatchObject({ ok: true, value: { projectId: null, targetValue: 500 } })
  })

  it('omits the target for break-even and free goals and keeps done for free', () => {
    const d = { ...emptyGoalDraft(), title: 'T', target: '99' }
    expect(validateGoalDraft({ ...d, kind: 'breakEven' }, 'de')).toMatchObject({
      ok: true,
      value: { done: false }
    })
    const free = validateGoalDraft({ ...d, kind: 'free' }, 'de', true)
    expect(free.ok && free.value.targetValue).toBeUndefined()
    expect(free.ok && free.value.done).toBe(true)
  })

  it('reports invalid fields', () => {
    const res = validateGoalDraft(
      {
        ...emptyGoalDraft(),
        title: ' ',
        target: 'abc',
        fromDate: '2026-05-01',
        dueDate: '2026-04-01'
      },
      'de'
    )
    expect(res).toEqual({ ok: false, issues: ['invalidTitle', 'invalidTarget', 'dueBeforeFrom'] })
    expect(
      validateGoalDraft(
        { ...emptyGoalDraft(), title: 'x', target: '5', fromDate: '2026-02-30' },
        'de'
      )
    ).toEqual({ ok: false, issues: ['invalidFrom'] })
  })

  it('round-trips a goal through the draft', () => {
    const g = goal('costLimit', { targetValue: 5_050, dueDate: '2026-11-30' })
    const res = validateGoalDraft(draftFromGoal(g, 'de'), 'de')
    expect(res).toMatchObject({ ok: true, value: { targetValue: 5_050, projectId: 'A' } })
  })

  it('withDone keeps all other fields', () => {
    const g = goal('free', { dueDate: '2026-12-01' })
    expect(withDone(g, true)).toEqual({
      projectId: 'A',
      kind: 'free',
      title: 'Goal',
      dueDate: '2026-12-01',
      done: true
    })
  })
})

describe('months and history', () => {
  it('computes month starts across year ends', () => {
    expect(monthStart('2026-02-15', 0)).toBe('2026-02-01')
    expect(monthStart('2026-02-15', 5)).toBe('2025-09-01')
    expect(monthStart('2026-01-31', 1)).toBe('2025-12-01')
  })

  it('starts the history at the earliest booking, project or goal date', () => {
    expect(historyStart(data([]), TODAY)).toBe('2026-01-01')
    expect(historyStart(data([goal('revenue', { fromDate: '2025-03-01' })]), TODAY)).toBe(
      '2025-03-01'
    )
    expect(historyStart({ ...data([]), projects: [], expenses: [], incomes: [] }, TODAY)).toBe(
      '2026-05-01'
    )
  })

  it('sums the monthly balance of the last 6 months', () => {
    const view = buildGoalView(data([]), TODAY)
    expect(view?.balanceSeries).toEqual([0, 0, 0, 0, 0, 12_000])
    expect(monthlyBalances({ entries: [], errors: [] }, TODAY)).toHaveLength(6)
  })
})

describe('groupGoals', () => {
  const row = (g: Goal): GoalRow => ({
    goal: g,
    progress: { value: 0, target: 0, ratio: 0, status: 'open' }
  })
  it('puts the portfolio first and sorts projects by name', () => {
    const groups = groupGoals(
      [
        row(goal('free', { id: '1', projectId: 'B' })),
        row(goal('free', { id: '2', projectId: null })),
        row(goal('free', { id: '3', projectId: 'A' })),
        row(goal('free', { id: '4', projectId: 'B' }))
      ],
      [
        { id: 'A', name: 'Alpha' },
        { id: 'B', name: 'Beta' }
      ]
    )
    expect(groups.map((g) => g.name)).toEqual([null, 'Alpha', 'Beta'])
    expect(groups[2]?.rows).toHaveLength(2)
  })
})

describe('buildGoalView – cost limit (PE-53)', () => {
  it('keeps a cost limit open before the due date, even when exceeded', () => {
    const g = goal('costLimit', { targetValue: 5_000, dueDate: '2026-10-31' })
    const view = buildGoalView(data([g]), TODAY)
    const p = view?.groups[0]?.rows[0]?.progress
    expect(p).toMatchObject({ value: 8_000, status: 'open' })
    expect(p?.ratio).toBe(10_000)
  })

  it('decides after the due date: missed above, achieved within the limit', () => {
    const over = buildGoalView(
      data([goal('costLimit', { targetValue: 5_000, dueDate: '2026-10-20' })]),
      TODAY
    )
    expect(over?.groups[0]?.rows[0]?.progress.status).toBe('missed')
    const within = buildGoalView(
      data([goal('costLimit', { targetValue: 9_000, dueDate: '2026-10-20' })]),
      TODAY
    )
    expect(within?.groups[0]?.rows[0]?.progress.status).toBe('achieved')
  })
})

describe('buildGoalView – other kinds', () => {
  it('marks a revenue goal missed after the due date and achieved when reached', () => {
    const missed = buildGoalView(
      data([goal('revenue', { targetValue: 50_000, dueDate: '2026-10-10' })]),
      TODAY
    )
    expect(missed?.groups[0]?.rows[0]?.progress.status).toBe('missed')
    const done = buildGoalView(data([goal('revenue', { targetValue: 20_000 })]), TODAY)
    expect(done?.groups[0]?.rows[0]?.progress.status).toBe('achieved')
  })

  it('adds the break-even month and checks free goals', () => {
    const view = buildGoalView(
      data([goal('breakEven'), goal('free', { id: 'f', done: true })]),
      TODAY
    )
    const rows = view?.groups[0]?.rows ?? []
    expect(rows.find((r) => r.goal.kind === 'breakEven')?.breakEven).toEqual({
      reachedAt: '2026-10'
    })
    expect(rows.find((r) => r.goal.kind === 'free')?.progress.status).toBe('achieved')
  })

  it('passes ledger and forecast errors through', () => {
    const view = buildGoalView(data([]), TODAY)
    expect(view?.ledger.errors).toEqual([])
    expect(view?.forecast.errors).toEqual([])
  })
})
