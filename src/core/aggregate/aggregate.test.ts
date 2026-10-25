import { describe, expect, it } from 'vitest'
import { buildLedger, type LedgerEntry } from '@core/ledger/ledger'
import {
  ALL,
  campaign,
  equal,
  oneTimeExpense,
  oneTimeIncome,
  percent,
  project
} from '@core/ledger/testFactories'
import { aggregate, groupKey, type GroupBy } from './aggregate'

const A = project('a', '2026-01-01')
const B = project('b', '2026-01-01')

const { entries } = buildLedger(
  {
    projects: [A, B],
    expenses: [
      oneTimeExpense('lic', '2026-01-15', { cents: 10_001 }, ALL, {
        category: 'softwareLicense',
        serviceId: 'svc'
      }),
      oneTimeExpense('pay', '2026-04-01', { cents: 5000 }, percent(['a', 6000], ['b', 4000]), {
        category: 'staff',
        personId: 'per'
      }),
      oneTimeExpense('misc', '2026-12-31', { cents: 300 }, equal('zzz'))
    ],
    incomes: [
      oneTimeIncome('in1', '2026-02-01', { cents: 20_000 }, 'a'),
      oneTimeIncome('in2', '2027-01-01', { cents: 1 }, 'b')
    ],
    campaigns: [campaign('cam', '2026-07-01', '2026-07-31', { cents: 1000 }, equal('b'))]
  },
  { from: '2026-01-01', to: '2027-12-31' }
)

const t = (key: string | null, incomeCents: number, expenseCents: number): object => ({
  key,
  incomeCents,
  expenseCents,
  balanceCents: incomeCents - expenseCents
})

describe('aggregate', () => {
  it('totals equal the sum of all entries (portfolio incl. unallocated)', () => {
    const r = aggregate(entries, { groupBy: 'year' })
    expect(r.total).toEqual({ incomeCents: 20_001, expenseCents: 16_301, balanceCents: 3700 })
    expect(r.groups).toEqual([t('2026', 20_000, 16_301), t('2027', 1, 0)])
  })

  it('groups by month and quarter', () => {
    expect(aggregate(entries, { groupBy: 'month' }).groups).toEqual([
      t('2026-01', 0, 10_001),
      t('2026-02', 20_000, 0),
      t('2026-04', 0, 5000),
      t('2026-07', 0, 1000),
      t('2026-12', 0, 300),
      t('2027-01', 1, 0)
    ])
    expect(aggregate(entries, { groupBy: 'quarter' }).groups).toEqual([
      t('2026-Q1', 20_000, 10_001),
      t('2026-Q2', 0, 5000),
      t('2026-Q3', 0, 1000),
      t('2026-Q4', 0, 300),
      t('2027-Q1', 1, 0)
    ])
  })

  it('groups by project with the unallocated group last', () => {
    expect(aggregate(entries, { groupBy: 'project' }).groups).toEqual([
      t('a', 20_000, 5001 + 3000),
      t('b', 1, 5000 + 2000 + 1000),
      t(null, 0, 300)
    ])
  })

  it('groups by category, person and service', () => {
    expect(aggregate(entries, { groupBy: 'category' }).groups).toEqual([
      t('expense:advertising', 0, 1000),
      t('expense:other', 0, 300),
      t('expense:softwareLicense', 0, 10_001),
      t('expense:staff', 0, 5000),
      t('income:storeSales', 20_001, 0)
    ])
    expect(aggregate(entries, { groupBy: 'person' }).groups).toEqual([
      t('per', 0, 5000),
      t(null, 20_001, 11_301)
    ])
    expect(aggregate(entries, { groupBy: 'service' }).groups).toEqual([
      t('svc', 0, 10_001),
      t(null, 20_001, 6300)
    ])
  })

  it('filters by date, kind, project, category, source, person, service', () => {
    const sum = (filter: Parameters<typeof aggregate>[1]['filter']): object =>
      aggregate(entries, { groupBy: 'year', filter }).total
    expect(sum({ from: '2026-02-01', to: '2026-06-30' })).toEqual({
      incomeCents: 20_000,
      expenseCents: 5000,
      balanceCents: 15_000
    })
    expect(sum({ kind: 'income' })).toEqual({
      incomeCents: 20_001,
      expenseCents: 0,
      balanceCents: 20_001
    })
    expect(sum({ projectIds: [null] })).toEqual({
      incomeCents: 0,
      expenseCents: 300,
      balanceCents: -300
    })
    expect(sum({ projectIds: ['a'] })).toEqual({
      incomeCents: 20_000,
      expenseCents: 8001,
      balanceCents: 11_999
    })
    expect(sum({ categories: ['staff'] })).toMatchObject({ expenseCents: 5000 })
    expect(sum({ sourceTypes: ['campaign'] })).toMatchObject({ expenseCents: 1000 })
    expect(sum({ personIds: ['per'] })).toMatchObject({ expenseCents: 5000 })
    expect(sum({ serviceIds: ['svc'] })).toMatchObject({ expenseCents: 10_001 })
    expect(sum({ serviceIds: ['nope'] })).toEqual({
      incomeCents: 0,
      expenseCents: 0,
      balanceCents: 0
    })
  })

  it('empty input gives no groups and zero totals', () => {
    for (const groupBy of ['month', 'project'] as GroupBy[]) {
      expect(aggregate([], { groupBy })).toEqual({
        groups: [],
        total: { incomeCents: 0, expenseCents: 0, balanceCents: 0 }
      })
    }
  })

  it('sum of project groups equals the total (property over group keys)', () => {
    for (const groupBy of [
      'month',
      'quarter',
      'year',
      'project',
      'category',
      'person',
      'service'
    ] as GroupBy[]) {
      const r = aggregate(entries, { groupBy })
      expect(r.groups.reduce((a, g) => a + g.expenseCents, 0)).toBe(r.total.expenseCents)
      expect(r.groups.reduce((a, g) => a + g.incomeCents, 0)).toBe(r.total.incomeCents)
    }
  })

  it('quarter boundaries', () => {
    const e = (date: string): LedgerEntry => ({ ...entries[0], date })
    expect(
      ['2026-03-31', '2026-04-01', '2026-09-30', '2026-10-01'].map((d) => groupKey(e(d), 'quarter'))
    ).toEqual(['2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4'])
  })

  it('throws on safe-integer overflow instead of returning a wrong sum', () => {
    const big: LedgerEntry = { ...entries[0], eurCents: Number.MAX_SAFE_INTEGER }
    expect(() => aggregate([big, big], { groupBy: 'year' })).toThrow(RangeError)
  })
})
