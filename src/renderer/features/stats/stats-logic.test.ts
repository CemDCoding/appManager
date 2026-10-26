import { describe, expect, it } from 'vitest'
import { aggregate } from '@core/aggregate/aggregate'
import { monthlyFixedCosts } from '@core/aggregate/fixedCosts'
import { breakEven, forecast } from '@core/forecast/forecast'
import { buildLedger } from '@core/ledger/ledger'
import { campaignRanking } from '@core/metrics/metrics'
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
import {
  breakEvenRows,
  breakEvenSortValue,
  buildCampaignRanking,
  buildOutlook,
  buildPeriodStats,
  chartMoney,
  clampDate,
  fillMonths,
  forecastRows,
  historyRange,
  monthKeys,
  toCategorySlices,
  toFixedCostSlices,
  toMonthlyPoints,
  type StatsInput
} from './stats-logic'

// Erfundene Daten (keine echten Personen/Projekte, PE-18).
const TODAY = '2026-10-26'
const YEAR = { from: '2026-01-01', to: '2026-12-31' }

function seed(): StatsInput {
  const a = project('a', '2026-01-01')
  const b = project('b', '2026-03-01', '2026-08-31')
  return {
    projects: [a, b],
    expenses: [
      recurringExpense(
        'hosting',
        { interval: 'monthly', startDate: '2026-01-15' },
        { cents: 1001 },
        ALL
      ),
      oneTimeExpense('laptop', '2026-04-10', { cents: 120000 }, equal('a', 'b'), {
        category: 'hardware'
      }),
      oneTimeExpense('orphan', '2025-12-01', { cents: 500 }, ALL),
      oneTimeExpense('usd', '2026-05-05', { cents: 1000, currency: 'USD', rateToEur: '0.9' }, ALL)
    ],
    incomes: [
      recurringIncome(
        'subs',
        { interval: 'monthly', startDate: '2026-02-01' },
        { cents: 30000 },
        'a'
      ),
      oneTimeIncome('sale', '2026-06-01', { cents: 5000 }, 'b')
    ],
    campaigns: [
      {
        ...campaign('c1', '2026-05-01', '2026-05-31', { cents: 10000 }, equal('a', 'b')),
        usersGained: 50,
        rating: 3
      },
      {
        ...campaign('c2', '2026-07-01', '2026-07-31', { cents: 4000 }, equal('a')),
        usersGained: 10,
        rating: 5
      },
      { ...campaign('c3', '2025-11-01', '2025-11-30', { cents: 999 }, ALL), usersGained: 1 }
    ]
  }
}

describe('historyRange / clampDate / monthKeys', () => {
  it('starts at the earliest date of all data and ends today', () => {
    expect(historyRange(seed(), TODAY)).toEqual({ from: '2025-11-01', to: TODAY })
    expect(historyRange({ projects: [], expenses: [], incomes: [], campaigns: [] }, TODAY)).toEqual(
      {
        from: TODAY,
        to: TODAY
      }
    )
  })

  it('clamps the fixed-cost date into the range', () => {
    expect(clampDate(TODAY, YEAR)).toBe(TODAY)
    expect(clampDate(TODAY, { from: '2027-01-01', to: '2027-12-31' })).toBe('2027-01-01')
    expect(clampDate(TODAY, { from: '2025-01-01', to: '2025-12-31' })).toBe('2025-12-31')
  })

  it('lists months across year boundaries and fills gaps with zero', () => {
    expect(monthKeys('2025-11-15', '2026-02-01')).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02'
    ])
    const filled = fillMonths(
      [{ month: '2026-02', incomeCents: 1, expenseCents: 2, balanceCents: -1 }],
      { from: '2026-01-01', to: '2026-03-31' }
    )
    expect(filled.map((r) => r.month)).toEqual(['2026-01', '2026-02', '2026-03'])
    expect(filled[0]).toEqual({
      month: '2026-01',
      incomeCents: 0,
      expenseCents: 0,
      balanceCents: 0
    })
    expect(filled[1].balanceCents).toBe(-1)
  })

  it('does not fill absurdly long ranges', () => {
    const rows = [{ month: '2000-01', incomeCents: 1, expenseCents: 0, balanceCents: 1 }]
    expect(fillMonths(rows, { from: '0001-01-01', to: '9999-12-31' })).toEqual(rows)
  })
})

describe('buildPeriodStats (portfolio)', () => {
  const input = seed()
  const stats = buildPeriodStats(input, YEAR, TODAY, null)
  const ledger = buildLedger(input, YEAR)

  it('totals and months equal the core aggregation', () => {
    const byMonth = aggregate(ledger.entries, { groupBy: 'month' })
    expect(stats.totals).toEqual(byMonth.total)
    expect(stats.months).toHaveLength(12)
    for (const g of byMonth.groups) {
      const row = stats.months.find((m) => m.month === g.key)
      expect(row).toEqual({
        month: g.key,
        incomeCents: g.incomeCents,
        expenseCents: g.expenseCents,
        balanceCents: g.balanceCents
      })
    }
    expect(stats.months.reduce((s, m) => s + m.expenseCents, 0)).toBe(byMonth.total.expenseCents)
  })

  it('categories equal core expense groups, largest first, without prefix', () => {
    const groups = aggregate(ledger.entries, {
      groupBy: 'category',
      filter: { kind: 'expense' }
    }).groups
    expect(stats.categories).toHaveLength(groups.length)
    for (const g of groups) {
      expect(stats.categories).toContainEqual({
        key: (g.key ?? '').replace('expense:', ''),
        cents: g.expenseCents
      })
    }
    expect(stats.categories[0].key).toBe('hardware')
    const cents = stats.categories.map((c) => c.cents)
    expect([...cents].sort((x, y) => y - x)).toEqual(cents)
  })

  it('project ranking equals core project groups sorted by balance', () => {
    const groups = aggregate(ledger.entries, { groupBy: 'project' }).groups
    for (const g of groups) {
      const row = stats.projectRanking.find((r) => r.projectId === g.key)
      expect(row?.balanceCents).toBe(g.balanceCents)
    }
    const balances = stats.projectRanking.map((r) => r.balanceCents)
    expect([...balances].sort((x, y) => y - x)).toEqual(balances)
    expect(stats.projectRanking.find((r) => r.projectId === 'a')?.name).toBe('Project a')
  })

  it('fixed costs equal the core figure at today', () => {
    const fixed = monthlyFixedCosts(input.expenses, input.projects, TODAY)
    expect(stats.fixedCostDate).toBe(TODAY)
    expect(stats.fixedCostsCents).toBe(fixed.totalCents)
    expect(stats.fixedByProject.map((r) => r.cents)).toEqual(fixed.byProject.map((r) => r.cents))
  })

  it('counts unallocated entries and passes ledger errors through', () => {
    expect(stats.ledger.errors).toEqual(ledger.errors)
    expect(stats.unallocatedCount).toBe(ledger.entries.filter((e) => e.unallocated).length)
  })

  it('keeps projects without bookings visible with zero', () => {
    const extra = { ...input, projects: [...input.projects, project('z', '2030-01-01')] }
    const s = buildPeriodStats(extra, YEAR, TODAY, null)
    expect(s.projectRanking.find((r) => r.projectId === 'z')).toMatchObject({ balanceCents: 0 })
  })

  it('shows unallocated fixed costs as an own row', () => {
    const lonely: StatsInput = {
      projects: [project('a', '2026-01-01', '2026-01-31')],
      expenses: [
        recurringExpense('x', { interval: 'monthly', startDate: '2026-01-01' }, { cents: 700 }, ALL)
      ],
      incomes: [],
      campaigns: []
    }
    const s = buildPeriodStats(lonely, YEAR, TODAY, null)
    expect(s.fixedByProject).toContainEqual({ projectId: null, name: null, cents: 700 })
  })
})

describe('buildPeriodStats (project)', () => {
  const input = seed()
  const stats = buildPeriodStats(input, YEAR, TODAY, 'b')
  const ledger = buildLedger(input, YEAR)

  it('filters every figure to the project', () => {
    const total = aggregate(ledger.entries, {
      groupBy: 'month',
      filter: { projectIds: ['b'] }
    }).total
    expect(stats.totals).toEqual(total)
    expect(stats.projectRanking).toEqual([{ projectId: 'b', name: 'Project b', ...total }])
    expect(stats.unallocatedCount).toBe(0)
  })

  it('uses the project share of the fixed costs (0 after its end)', () => {
    const fixed = monthlyFixedCosts(input.expenses, input.projects, TODAY)
    const share = fixed.byProject.find((r) => r.projectId === 'b')?.cents
    expect(stats.fixedCostsCents).toBe(share)
    expect(stats.fixedByProject).toEqual([{ projectId: 'b', name: 'Project b', cents: share }])
  })
})

describe('buildCampaignRanking', () => {
  const input = seed()
  const ledger = buildLedger(input, YEAR)

  it('portfolio: campaigns started in the range, order from the core', () => {
    const r = buildCampaignRanking(input.campaigns, ledger, YEAR, null, 'costPerUser')
    const core = campaignRanking(
      input.campaigns.filter((c) => c.id !== 'c3'),
      'costPerUser'
    )
    expect(r).toEqual(core)
    expect(r.items.map((i) => i.campaign.id)).toEqual(['c1', 'c2'])
    expect(
      buildCampaignRanking(input.campaigns, ledger, YEAR, null, 'rating').items[0].campaign.id
    ).toBe('c2')
  })

  it('project: only campaigns whose cost falls onto the project', () => {
    const r = buildCampaignRanking(input.campaigns, ledger, YEAR, 'b', 'rating')
    expect(r.items.map((i) => i.campaign.id)).toEqual(['c1'])
  })
})

describe('outlook, forecast and break-even', () => {
  const input = seed()
  const outlook = buildOutlook(input, TODAY)
  const core = forecast(input, TODAY)

  it('forecast is the core forecast for the same today', () => {
    expect(outlook.forecast).toEqual(core)
    expect(outlook.history).toEqual(buildLedger(input, historyRange(input, TODAY)))
  })

  it('maps forecast months for portfolio and project', () => {
    const portfolio = forecastRows(outlook.forecast, null)
    expect(portfolio).toHaveLength(core.months.length)
    expect(portfolio[1]).toEqual({
      month: core.months[1].month,
      incomeCents: core.months[1].incomeCents,
      expenseCents: core.months[1].expenseCents,
      balanceCents: core.months[1].balanceCents
    })
    const a = forecastRows(outlook.forecast, 'a')
    const coreA = core.months[1].byProject.find((p) => p.projectId === 'a')
    expect(a[1].incomeCents).toBe(coreA?.incomeCents)
    const b = forecastRows(outlook.forecast, 'b')
    expect(b.every((m) => m.incomeCents === 0 && m.expenseCents === 0)).toBe(true)
  })

  it('break-even rows equal core results, portfolio last', () => {
    const rows = breakEvenRows(outlook, input.projects, null)
    expect(rows.map((r) => r.projectId)).toEqual(['a', 'b', null])
    expect(rows[0].result).toEqual(breakEven(outlook.history, outlook.forecast, 'a'))
    expect(rows[1].result).toEqual(breakEven(outlook.history, outlook.forecast, 'b'))
    expect(rows[2].result).toEqual(breakEven(outlook.history, outlook.forecast, null))
    expect(breakEvenRows(outlook, input.projects, 'b').map((r) => r.projectId)).toEqual(['b'])
  })

  it('sorts break-even results reached < expected < not in sight', () => {
    const values = [
      breakEvenSortValue('notInSight'),
      breakEvenSortValue({ expectedAt: '2027-01' }),
      breakEvenSortValue({ reachedAt: '2026-05' })
    ].sort()
    expect(values).toEqual(['1-2026-05', '2-2027-01', '3'])
  })
})

describe('chart mapping', () => {
  const rates = [{ currency: 'USD', rate: '0.5', enteredOn: '2026-01-01' }]

  it('keeps EUR unchanged', () => {
    const m = chartMoney('EUR', rates)
    expect(m).toMatchObject({ currency: 'EUR', fallback: false })
    expect(m.convert(1234)).toBe(1234)
  })

  it('converts each value with the core (1 USD = 0.5 EUR)', () => {
    const m = chartMoney('USD', rates)
    expect(m.currency).toBe('USD')
    expect(m.convert(100)).toBe(200)
    expect(m.convert(-100)).toBe(-200)
    expect(Number.isNaN(m.convert(Number.MAX_SAFE_INTEGER + 2))).toBe(true)
  })

  it('falls back to EUR without a rate', () => {
    const m = chartMoney('CHF', rates)
    expect(m).toMatchObject({ currency: 'EUR', fallback: true })
    expect(m.convert(5)).toBe(5)
  })

  it('maps months, categories and fixed costs to chart data', () => {
    const double = (c: number) => c * 2
    expect(
      toMonthlyPoints(
        [{ month: '2026-01', incomeCents: 3, expenseCents: 4, balanceCents: -1 }],
        double
      )
    ).toEqual([{ month: '2026-01', incomeCents: 6, expenseCents: 8 }])
    expect(toCategorySlices([{ key: 'hosting', cents: 5 }], (k) => `L:${k}`, double)).toEqual([
      { key: 'hosting', label: 'L:hosting', cents: 10 }
    ])
    expect(
      toFixedCostSlices(
        [
          { projectId: 'a', name: 'A', cents: 1 },
          { projectId: null, name: null, cents: 2 }
        ],
        'none',
        double
      )
    ).toEqual([
      { key: 'a', label: 'A', cents: 2 },
      { key: '__unallocated', label: 'none', cents: 4 }
    ])
  })
})
