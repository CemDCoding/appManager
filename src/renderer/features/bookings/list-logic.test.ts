import { describe, expect, it } from 'vitest'
import type { Ledger, LedgerEntry } from '@core/ledger/ledger'
import { bookingsDict } from './i18n'
import { bookingRows, hasWarning, totalEurCents } from './list-logic'
import { expensesPageDict } from '@/pages/expenses/i18n'
import { incomesPageDict } from '@/pages/incomes/i18n'

function entry(p: Partial<LedgerEntry>): LedgerEntry {
  return {
    date: '2026-03-01',
    kind: 'expense',
    category: 'hosting',
    projectId: 'a',
    eurCents: 100,
    original: { cents: 300, currency: 'EUR' },
    sourceType: 'expense',
    sourceId: 'e1',
    ...p
  }
}

const ledger: Ledger = {
  entries: [
    entry({ projectId: 'a', eurCents: 101 }),
    entry({ projectId: 'b', eurCents: 100 }),
    entry({ projectId: 'c', eurCents: 99 }),
    entry({
      date: '2026-03-05',
      sourceId: 'e2',
      category: 'domain',
      projectId: null,
      unallocated: true,
      eurCents: 500,
      original: { cents: 500, currency: 'EUR' }
    }),
    entry({
      date: '2026-03-10',
      kind: 'income',
      sourceType: 'income',
      sourceId: 'i1',
      category: 'steam',
      projectId: 'a',
      eurCents: 999
    }),
    entry({
      date: '2026-03-12',
      sourceType: 'campaign',
      sourceId: 'c1',
      category: 'advertising',
      eurCents: 50
    })
  ],
  errors: [
    {
      date: '2026-03-03',
      sourceType: 'expense',
      sourceId: 'e3',
      original: { cents: 700, currency: 'USD' },
      error: 'missingRate'
    },
    {
      date: '2026-03-04',
      sourceType: 'income',
      sourceId: 'i2',
      original: { cents: 1, currency: 'USD' },
      error: 'invalidRate'
    }
  ]
}

const categoryOf = (id: string) =>
  ({ e1: 'hosting', e2: 'domain', e3: 'aiCredit', i1: 'steam', i2: 'steam' })[id]

describe('bookingRows', () => {
  it('groups entries per booking and day, without campaigns, newest first', () => {
    const rows = bookingRows(ledger, 'expense', { projectId: '', category: '' }, categoryOf)
    expect(rows.map((r) => r.key)).toEqual(['e2|2026-03-05', 'e3|2026-03-03', 'e1|2026-03-01'])
    const e1 = rows[2]
    expect(e1).toMatchObject({
      eurCents: 300,
      projectIds: ['a', 'b', 'c'],
      unallocated: false,
      error: null
    })
    expect(e1?.original).toEqual({ cents: 300, currency: 'EUR' })
    expect(rows[0]).toMatchObject({ unallocated: true, projectIds: [], eurCents: 500 })
    expect(rows[1]).toMatchObject({ eurCents: null, error: 'missingRate', category: 'aiCredit' })
    expect(rows.map(hasWarning)).toEqual([true, true, false])
    expect(totalEurCents(rows)).toBe(800)
  })

  it('project filter shows only the share of that project', () => {
    const rows = bookingRows(ledger, 'expense', { projectId: 'b', category: '' }, categoryOf)
    expect(rows.map((r) => [r.key, r.eurCents])).toEqual([
      ['e3|2026-03-03', null],
      ['e1|2026-03-01', 100]
    ])
  })

  it('category filter applies to entries and errors', () => {
    expect(
      bookingRows(ledger, 'expense', { projectId: '', category: 'domain' }, categoryOf).map(
        (r) => r.sourceId
      )
    ).toEqual(['e2'])
    expect(
      bookingRows(ledger, 'expense', { projectId: '', category: 'aiCredit' }, categoryOf).map(
        (r) => r.sourceId
      )
    ).toEqual(['e3'])
  })

  it('income rows', () => {
    const rows = bookingRows(ledger, 'income', { projectId: '', category: '' }, categoryOf)
    expect(rows.map((r) => [r.sourceId, r.eurCents, r.error])).toEqual([
      ['i1', 999, null],
      ['i2', null, 'invalidRate']
    ])
  })
})

describe('dictionaries', () => {
  it.each([
    ['bookings', bookingsDict],
    ['expensesPage', expensesPageDict],
    ['incomesPage', incomesPageDict]
  ] as const)('%s has the same non-empty keys in de and en', (_name, dict) => {
    const de = Object.keys(dict.de).sort()
    expect(Object.keys(dict.en).sort()).toEqual(de)
    for (const key of de) {
      expect((dict.de as Record<string, string>)[key]?.trim()).not.toBe('')
      expect((dict.en as Record<string, string>)[key]?.trim()).not.toBe('')
    }
  })
})
