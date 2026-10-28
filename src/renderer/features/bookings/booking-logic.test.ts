import { describe, expect, it } from 'vitest'
import { buildLedger } from '@core/ledger/ledger'
import type { Expense } from '@shared/schemas/expense'
import type { Income } from '@shared/schemas/income'
import type { Project } from '@shared/schemas/project'
import { applyCurrencyChange } from '@/components/forms/money-logic'
import {
  setAllocationMode,
  setAllocationProjects,
  setAllocationSplit,
  setAllocationPercent
} from '@/components/forms/allocation-logic'
import {
  categoryHasPerson,
  categoryHasService,
  defaultKindFor,
  emptyExpenseDraft,
  emptyIncomeDraft,
  expenseDraftFrom,
  expenseDraftToInput,
  incomeDraftFrom,
  incomeDraftToInput,
  isOutsideActivePeriod,
  isSelectableExpenseCategory,
  localToday,
  QUICK_CATEGORIES,
  referenceDate,
  type ExpenseDraft,
  type IncomeDraft
} from './booking-logic'

/* Invented test data only (R2). */
const P1 = '11111111-1111-4111-8111-111111111111'
const P2 = '22222222-2222-4222-8222-222222222222'
const P3 = '33333333-3333-4333-8333-333333333333'
const PERSON = '44444444-4444-4444-8444-444444444444'
const SERVICE = '55555555-5555-4555-8555-555555555555'
const TS = '2026-01-01T00:00:00.000Z'
const BASE = { ownerId: 'local' as const, createdAt: TS, updatedAt: TS }

function project(id: string, startDate = '2020-01-01'): Project {
  return {
    ...BASE,
    id,
    name: `Test ${id.slice(0, 4)}`,
    description: '',
    platforms: [],
    phase: 'live',
    startDate,
    links: [],
    archived: false
  }
}

function expenseDraft(patch: Partial<ExpenseDraft> = {}): ExpenseDraft {
  const d = emptyExpenseDraft('2026-03-15', { category: 'softwareLicense' })
  return { ...d, money: { ...d.money, amountText: '100' }, ...patch }
}

function asExpense(draft: ExpenseDraft, id = '66666666-6666-4666-8666-666666666666'): Expense {
  const r = expenseDraftToInput(draft, 'de')
  if (!r.ok) throw new Error(r.error.join(','))
  return { ...BASE, id, ...r.value }
}

describe('expense prefill and category rules', () => {
  it('quick actions map to categories and kinds (PE-48, PE-10)', () => {
    expect(QUICK_CATEGORIES).toEqual({
      personPayment: 'staff',
      aiCredit: 'aiCredit',
      subscription: 'aiSubscription'
    })
    expect(emptyExpenseDraft('2026-03-15', { category: 'aiCredit' }).kind).toBe('oneTime')
    expect(emptyExpenseDraft('2026-03-15', { category: 'aiSubscription' }).kind).toBe('recurring')
    expect(emptyExpenseDraft('2026-03-15', { category: 'staff' }).kind).toBe('oneTime')
    expect(emptyExpenseDraft('2026-03-15', { category: 'aiCredit', kind: 'recurring' }).kind).toBe(
      'recurring'
    )
    expect(defaultKindFor('')).toBe('oneTime')
  })

  it('prefills person, service and dates', () => {
    const d = emptyExpenseDraft('2026-03-15', {
      category: 'staff',
      personId: PERSON,
      serviceId: SERVICE
    })
    expect(d.personId).toBe(PERSON)
    expect(d.serviceId).toBe(SERVICE)
    expect(d.date).toBe('2026-03-15')
    expect(d.recurrence.startDate).toBe('2026-03-15')
    expect(d.money).toMatchObject({ currency: 'EUR', rateText: '1' })
    expect(d.allocation.mode).toBe('all')
  })

  it('person only for staff, service for service categories', () => {
    expect(categoryHasPerson('staff')).toBe(true)
    expect(categoryHasPerson('hosting')).toBe(false)
    expect(categoryHasService('hosting')).toBe(true)
    expect(categoryHasService('aiCredit')).toBe(true)
    expect(categoryHasService('staff')).toBe(false)
    expect(categoryHasService('customKey')).toBe(false)
  })

  it('referenceDate follows the kind', () => {
    const d = expenseDraft({ date: '2026-04-01' })
    expect(referenceDate(d)).toBe('2026-04-01')
    expect(referenceDate({ ...d, kind: 'recurring' })).toBe('2026-03-15')
  })

  it('localToday formats the local date', () => {
    expect(localToday(new Date(2026, 1, 3, 23, 59))).toBe('2026-02-03')
  })
})

describe('expenseDraftToInput', () => {
  it('maps a one-time EUR expense on all projects', () => {
    const r = expenseDraftToInput(expenseDraft({ description: '  Lizenz  ' }), 'de')
    expect(r).toEqual({
      ok: true,
      value: {
        kind: 'oneTime',
        date: '2026-03-15',
        category: 'softwareLicense',
        amount: { cents: 10000, currency: 'EUR' },
        rateToEur: '1',
        allocation: { mode: 'all', split: 'equal', shares: [] },
        description: 'Lizenz'
      }
    })
  })

  it('keeps the rate snapshot of a foreign currency (PE-05)', () => {
    const d = expenseDraft()
    const money = applyCurrencyChange(
      { ...d.money, amountText: '20,00' },
      'USD',
      { rate: '0.92', enteredOn: '2026-03-01' },
      'de'
    )
    expect(money.rateText).toBe('0,92')
    const r = expenseDraftToInput({ ...d, money }, 'de')
    expect(r.ok && r.value.amount).toEqual({ cents: 2000, currency: 'USD' })
    expect(r.ok && r.value.rateToEur).toBe('0.92')
    // Manually changed snapshot wins.
    const manual = expenseDraftToInput(
      { ...d, money: { ...money, rateText: '0,9', rateTouched: true } },
      'de'
    )
    expect(manual.ok && manual.value.rateToEur).toBe('0.9')
  })

  it('reports a missing rate for a foreign currency', () => {
    const d = expenseDraft()
    const money = applyCurrencyChange(d.money, 'USD', null, 'de')
    const r = expenseDraftToInput({ ...d, money }, 'de')
    expect(r).toEqual({ ok: false, error: ['invalidRate'] })
  })

  it('maps a recurring expense with end and price change', () => {
    const d = expenseDraft({
      kind: 'recurring',
      category: 'aiSubscription',
      recurrence: {
        interval: 'monthly',
        startDate: '2026-01-31',
        endDate: '2026-12-31',
        priceChanges: [{ fromDate: '2026-06-30', amountText: '25' }]
      }
    })
    const r = expenseDraftToInput(d, 'de')
    expect(r.ok).toBe(true)
    if (!r.ok || r.value.kind !== 'recurring') throw new Error('expected recurring')
    expect(r.value.recurrence).toEqual({
      interval: 'monthly',
      startDate: '2026-01-31',
      endDate: '2026-12-31',
      priceChanges: [{ fromDate: '2026-06-30', cents: 2500 }]
    })
    expect('date' in r.value).toBe(false)
  })

  it('maps selected projects equal and by percent', () => {
    const d = expenseDraft()
    const selected = setAllocationProjects(
      setAllocationMode(d.allocation, 'selected'),
      [P1, P2],
      'de'
    )
    const eq = expenseDraftToInput({ ...d, allocation: selected }, 'de')
    expect(eq.ok && eq.value.allocation).toEqual({
      mode: 'selected',
      split: 'equal',
      shares: [
        { projectId: P1, percentBasisPoints: 0 },
        { projectId: P2, percentBasisPoints: 0 }
      ]
    })
    let pct = setAllocationSplit(selected, 'percent', 'de')
    pct = setAllocationPercent(setAllocationPercent(pct, P1, '70'), P2, '30')
    const pr = expenseDraftToInput({ ...d, allocation: pct }, 'de')
    expect(pr.ok && pr.value.allocation.shares).toEqual([
      { projectId: P1, percentBasisPoints: 7000 },
      { projectId: P2, percentBasisPoints: 3000 }
    ])
  })

  it('blocks saving when percentages do not sum to 100 %', () => {
    const d = expenseDraft()
    let a = setAllocationSplit(
      setAllocationProjects(setAllocationMode(d.allocation, 'selected'), [P1, P2], 'de'),
      'percent',
      'de'
    )
    a = setAllocationPercent(a, P1, '60')
    a = setAllocationPercent(a, P2, '30')
    expect(expenseDraftToInput({ ...d, allocation: a }, 'de')).toEqual({
      ok: false,
      error: ['allocationInvalid']
    })
  })

  it('keeps the person only for staff and the service when set', () => {
    const staff = expenseDraftToInput(
      expenseDraft({ category: 'staff', personId: PERSON, serviceId: '' }),
      'de'
    )
    expect(staff.ok && staff.value.personId).toBe(PERSON)
    const other = expenseDraftToInput(
      expenseDraft({ category: 'hosting', personId: PERSON, serviceId: SERVICE }),
      'de'
    )
    expect(other.ok && 'personId' in other.value).toBe(false)
    expect(other.ok && other.value.serviceId).toBe(SERVICE)
    const none = expenseDraftToInput(expenseDraft({ category: 'staff' }), 'de')
    expect(none.ok && 'personId' in none.value).toBe(false)
  })

  it('collects all validation issues', () => {
    const r = expenseDraftToInput(
      expenseDraft({
        category: '',
        date: '2026-02-30',
        money: { amountText: '12,345', currency: 'EUR', rateText: '1', rateTouched: false },
        description: 'x'.repeat(2001),
        personId: 'nope',
        serviceId: 'nope'
      }),
      'de'
    )
    expect(r.ok).toBe(false)
    expect(!r.ok && [...r.error].sort()).toEqual(
      [
        'categoryRequired',
        'descriptionTooLong',
        'invalidAmount',
        'invalidDate',
        'invalidService'
      ].sort()
    )
    const staff = expenseDraftToInput(expenseDraft({ category: 'staff', personId: 'nope' }), 'de')
    expect(staff).toEqual({ ok: false, error: ['invalidPerson'] })
    const rec = expenseDraftToInput(
      expenseDraft({
        kind: 'recurring',
        recurrence: {
          interval: 'monthly',
          startDate: '2026-05-01',
          endDate: '2026-04-01',
          priceChanges: []
        }
      }),
      'de'
    )
    expect(rec).toEqual({ ok: false, error: ['recurrenceInvalid'] })
    expect(expenseDraftToInput(expenseDraft({ category: 'bad key!' }), 'de')).toEqual({
      ok: false,
      error: ['categoryRequired']
    })
  })

  it('round-trips through expenseDraftFrom (edit keeps snapshot)', () => {
    const original = asExpense(
      expenseDraft({
        money: { amountText: '12,34', currency: 'USD', rateText: '0,9312', rateTouched: true }
      })
    )
    const draft = expenseDraftFrom(original, 'de', '2026-10-26')
    expect(draft.money).toEqual({
      amountText: '12,34',
      currency: 'USD',
      rateText: '0,9312',
      rateTouched: true
    })
    const back = expenseDraftToInput(draft, 'de')
    expect(back.ok && back.value).toEqual(
      Object.fromEntries(
        Object.entries(original).filter(
          ([k]) => !['id', 'ownerId', 'createdAt', 'updatedAt'].includes(k)
        )
      )
    )
    const recurring = asExpense(
      expenseDraft({
        kind: 'recurring',
        category: 'aiSubscription',
        serviceId: SERVICE,
        recurrence: { interval: 'yearly', startDate: '2026-02-01', endDate: '', priceChanges: [] }
      })
    )
    const rd = expenseDraftFrom(recurring, 'en', '2026-10-26')
    expect(rd.kind).toBe('recurring')
    expect(rd.date).toBe('2026-10-26')
    expect(rd.serviceId).toBe(SERVICE)
    expect(rd.money.amountText).toBe('100.00')
  })
})

describe('smoke test M1 via the ledger', () => {
  const projects = [project(P1), project(P2), project(P3)]

  it('100 € licence on 3 projects → 33,34 / 33,33 / 33,33', () => {
    const e = asExpense(expenseDraft())
    const ledger = buildLedger(
      { projects, expenses: [e], incomes: [], campaigns: [] },
      { from: '2026-03-01', to: '2026-03-31' }
    )
    expect(ledger.entries.map((x) => x.eurCents)).toEqual([3334, 3333, 3333])
  })

  it('USD expense uses the snapshot rate', () => {
    const d = expenseDraft()
    const money = applyCurrencyChange(
      { ...d.money, amountText: '10' },
      'USD',
      { rate: '0.92', enteredOn: '2026-03-01' },
      'de'
    )
    const e = asExpense({ ...d, money })
    const ledger = buildLedger(
      { projects: [project(P1)], expenses: [e], incomes: [], campaigns: [] },
      { from: '2026-03-01', to: '2026-03-31' }
    )
    expect(ledger.entries).toHaveLength(1)
    expect(ledger.entries[0]?.eurCents).toBe(920)
    expect(ledger.entries[0]?.original).toEqual({ cents: 1000, currency: 'USD' })
  })

  it('monthly subscription on the 31st is due on the last day of February', () => {
    const e = asExpense(
      expenseDraft({
        kind: 'recurring',
        category: 'aiSubscription',
        recurrence: { interval: 'monthly', startDate: '2026-01-31', endDate: '', priceChanges: [] }
      })
    )
    const ledger = buildLedger(
      { projects: [project(P1)], expenses: [e], incomes: [], campaigns: [] },
      { from: '2026-02-01', to: '2026-03-31' }
    )
    expect(ledger.entries.map((x) => x.date)).toEqual(['2026-02-28', '2026-03-31'])
  })

  it('AI credit is a one-time expense on the top-up day (PE-10)', () => {
    const base = emptyExpenseDraft('2026-05-07', { category: QUICK_CATEGORIES.aiCredit })
    const e = asExpense({ ...base, money: { ...base.money, amountText: '50' } })
    expect(e.kind).toBe('oneTime')
    expect(e.kind === 'oneTime' && e.date).toBe('2026-05-07')
    const ledger = buildLedger(
      { projects: [project(P1)], expenses: [e], incomes: [], campaigns: [] },
      { from: '2026-01-01', to: '2026-12-31' }
    )
    expect(ledger.entries.map((x) => [x.date, x.category, x.eurCents])).toEqual([
      ['2026-05-07', 'aiCredit', 5000]
    ])
  })
})

describe('incomes', () => {
  function incomeDraft(patch: Partial<IncomeDraft> = {}): IncomeDraft {
    const d = emptyIncomeDraft('2026-03-15', { projectId: P1 })
    return { ...d, category: 'storeSales', money: { ...d.money, amountText: '9,99' }, ...patch }
  }

  it('maps a one-time net income to exactly one project', () => {
    expect(incomeDraftToInput(incomeDraft(), 'de')).toEqual({
      ok: true,
      value: {
        kind: 'oneTime',
        date: '2026-03-15',
        category: 'storeSales',
        amount: { cents: 999, currency: 'EUR' },
        rateToEur: '1',
        projectId: P1,
        description: ''
      }
    })
  })

  it('maps a recurring income', () => {
    const r = incomeDraftToInput(
      incomeDraft({
        kind: 'recurring',
        recurrence: { interval: 'weekly', startDate: '2026-03-02', endDate: '', priceChanges: [] }
      }),
      'de'
    )
    expect(r.ok && r.value.kind).toBe('recurring')
    expect(r.ok && r.value.kind === 'recurring' && r.value.recurrence).toEqual({
      interval: 'weekly',
      startDate: '2026-03-02',
      priceChanges: []
    })
  })

  it('requires a project and validates the rest', () => {
    expect(emptyIncomeDraft('2026-03-15').projectId).toBe('')
    const r = incomeDraftToInput(incomeDraft({ projectId: '', category: '' }), 'de')
    expect(!r.ok && [...r.error].sort()).toEqual(['categoryRequired', 'projectRequired'])
    const money = incomeDraftToInput(
      incomeDraft({
        money: { amountText: '-5', currency: 'EUR', rateText: '1', rateTouched: false }
      }),
      'de'
    )
    expect(money).toEqual({ ok: false, error: ['invalidAmount'] })
  })

  it('round-trips through incomeDraftFrom', () => {
    const r = incomeDraftToInput(incomeDraft(), 'de')
    if (!r.ok) throw new Error('expected ok')
    const income: Income = { ...BASE, id: '77777777-7777-4777-8777-777777777777', ...r.value }
    const back = incomeDraftToInput(incomeDraftFrom(income, 'de', '2026-10-26'), 'de')
    expect(back).toEqual(r)
  })
})

describe('AP-29 helpers', () => {
  it('advertising is not selectable for new expenses (PE-60), other categories are', () => {
    expect(isSelectableExpenseCategory('advertising')).toBe(false)
    expect(isSelectableExpenseCategory('hosting')).toBe(true)
    expect(isSelectableExpenseCategory('myCustom')).toBe(true)
  })

  it('detects a date outside the active period (PE-58)', () => {
    const open = { startDate: '2026-02-01' }
    const closed = { startDate: '2026-02-01', endDate: '2026-02-28' }
    expect(isOutsideActivePeriod(open, '2026-01-31')).toBe(true)
    expect(isOutsideActivePeriod(open, '2026-02-01')).toBe(false)
    expect(isOutsideActivePeriod(open, '2030-01-01')).toBe(false)
    expect(isOutsideActivePeriod(closed, '2026-02-28')).toBe(false)
    expect(isOutsideActivePeriod(closed, '2026-03-01')).toBe(true)
  })

  it('shows no notice without project or with an invalid date', () => {
    expect(isOutsideActivePeriod(undefined, '2026-01-01')).toBe(false)
    expect(isOutsideActivePeriod({ startDate: '2026-02-01' }, '')).toBe(false)
  })
})
