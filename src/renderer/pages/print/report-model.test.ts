import { describe, expect, it } from 'vitest'
import { aggregate } from '@core/aggregate/aggregate'
import { breakEven, forecast } from '@core/forecast/forecast'
import { buildLedger } from '@core/ledger/ledger'
import {
  ALL,
  campaign,
  equal,
  oneTimeExpense,
  oneTimeIncome,
  project,
  recurringExpense
} from '@core/ledger/testFactories'
import type { Service } from '@shared/schemas/service'
import {
  amountsForDisplay,
  buildHistory,
  buildReportModel,
  earliestDate,
  fixedCostDate,
  localIsoDate,
  monthsForDisplay,
  type ReportData
} from './report-model'

// Erfundene Testdaten (R2/PE-18).
const TODAY = '2026-03-15'
const PERIOD = { from: '2026-02-01', to: '2026-02-28' }
const service: Service = {
  id: 's1',
  ownerId: 'local',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  provider: 'Host',
  purpose: '',
  plan: 'Basic',
  note: '',
  allocation: equal('A')
}

function data(): ReportData {
  return {
    projects: [project('A', '2026-01-01'), project('B', '2026-01-01')],
    expenses: [
      oneTimeExpense('e1', '2026-02-10', { cents: 10_000 }, ALL, { personId: 'p-gone' }),
      recurringExpense(
        'e2',
        { interval: 'monthly', startDate: '2026-01-05' },
        { cents: 1_000 },
        equal('A'),
        { serviceId: 's1' }
      ),
      oneTimeExpense('bad', '2026-02-11', { cents: 500, currency: 'USD', rateToEur: 'x' }, ALL)
    ],
    incomes: [oneTimeIncome('i1', '2026-02-20', { cents: 30_000 }, 'A')],
    campaigns: [campaign('c1', '2026-02-15', '2026-02-20', { cents: 2_000 }, ALL)],
    services: [service],
    people: []
  }
}

describe('Hilfsfunktionen', () => {
  it('fixedCostDate begrenzt heute auf den Zeitraum', () => {
    expect(fixedCostDate('2026-03-15', PERIOD)).toBe('2026-02-28')
    expect(fixedCostDate('2026-01-15', PERIOD)).toBe('2026-02-01')
    expect(fixedCostDate('2026-02-15', PERIOD)).toBe('2026-02-15')
  })

  it('localIsoDate nutzt das lokale Datum', () => {
    expect(localIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })

  it('earliestDate über Projekte und Buchungen; leer → null', () => {
    expect(earliestDate(data())).toBe('2026-01-01')
    expect(earliestDate({ projects: [], expenses: [], incomes: [], campaigns: [] })).toBeNull()
  })

  it('Historie reicht vom frühesten Datum bis heute', () => {
    const h = buildHistory(data(), TODAY)
    expect(h.entries.every((e) => e.date <= TODAY)).toBe(true)
    expect(h.entries.some((e) => e.date === '2026-01-05')).toBe(true)
    expect(
      buildHistory({ ...data(), projects: [], expenses: [], incomes: [], campaigns: [] }, TODAY)
    ).toEqual({
      entries: [],
      errors: []
    })
  })
})

describe('buildReportModel – Projekt', () => {
  const d = data()
  const m = buildReportModel(d, { scope: 'project', projectId: 'A', period: PERIOD }, TODAY)

  it('Summen gleich dem Kern (aggregate auf dem Ledger des Zeitraums)', () => {
    const ledger = buildLedger(d, PERIOD)
    const core = aggregate(ledger.entries, { groupBy: 'project', filter: { projectIds: ['A'] } })
    expect(m.totals).toEqual(core.total)
    expect(m.totals).toEqual({ incomeCents: 30_000, expenseCents: 7_000, balanceCents: 23_000 })
    expect(m.projectName).toBe('Project A')
  })

  it('Monate, Kategorien, Dienste, Personen, Kampagnen', () => {
    expect(m.months).toEqual([
      { month: '2026-02', incomeCents: 30_000, expenseCents: 7_000, balanceCents: 23_000 }
    ])
    expect(m.expenseByCategory).toEqual([
      { key: 'advertising', cents: 1_000 },
      { key: 'hosting', cents: 1_000 },
      { key: 'other', cents: 5_000 }
    ])
    expect(m.incomeByCategory).toEqual([{ key: 'storeSales', cents: 30_000 }])
    expect(m.services).toEqual([{ id: 's1', name: 'Host · Basic', cents: 1_000 }])
    expect(m.people).toEqual([{ id: 'p-gone', name: null, cents: 5_000 }])
    expect(m.campaigns.map((c) => c.campaign.id)).toEqual(['c1'])
    expect(m.projects).toEqual([])
  })

  it('Break-even und Prognose wie im Kern (gleiches today)', () => {
    const fc = forecast(d, TODAY)
    expect(m.breakEven).toEqual(breakEven(buildHistory(d, TODAY), fc, 'A'))
    expect(m.breakEven).toEqual({ reachedAt: '2026-02' })
    expect(m.forecast).toHaveLength(fc.months.length)
    expect(m.forecast.find((f) => f.month === '2026-04')?.expenseCents).toBe(1_000)
  })

  it('Fixkosten des Projekts am begrenzten Stichtag', () => {
    expect(m.fixedCosts).toEqual({ cents: 1_000, date: '2026-02-28' })
  })

  it('macht Fehler aus Ledger, Historie und Prognose sichtbar', () => {
    expect(m.errors.ledger).toBe(1)
    expect(m.errors.history).toBe(1)
    expect(m.errors.forecast).toBe(0)
  })
})

describe('buildReportModel – Portfolio', () => {
  const d = data()
  const m = buildReportModel(d, { scope: 'portfolio', period: PERIOD }, TODAY)

  it('Summen aller Projekte und Vergleichstabelle', () => {
    expect(m.projectId).toBeNull()
    expect(m.totals).toEqual({ incomeCents: 30_000, expenseCents: 13_000, balanceCents: 17_000 })
    expect(m.projects.map((p) => [p.projectId, p.balanceCents, p.fixedCostsCents])).toEqual([
      ['A', 23_000, 1_000],
      ['B', -6_000, 0]
    ])
    expect(m.projects[0]?.breakEven).toEqual({ reachedAt: '2026-02' })
    expect(m.projects[1]?.breakEven).toBe('notInSight')
    expect(m.fixedCosts.cents).toBe(1_000)
  })

  it('archivierte Projekte ohne Buchungen fehlen, nicht zuordenbare Buchungen erscheinen', () => {
    const archived = { ...project('C', '2025-01-01', '2025-12-31'), archived: true }
    const lonely = oneTimeExpense('e9', '2026-02-12', { cents: 700 }, equal('Z'))
    const m2 = buildReportModel(
      { ...d, projects: [...d.projects, archived], expenses: [...d.expenses, lonely] },
      { scope: 'portfolio', period: PERIOD },
      TODAY
    )
    expect(m2.projects.map((p) => p.projectId)).toEqual(['A', 'B', null])
    expect(m2.projects[2]).toMatchObject({ expenseCents: 700, breakEven: null })
    expect(m2.unallocatedCount).toBe(1)
  })
})

describe('Umrechnung für Diagramme', () => {
  const rates = [{ currency: 'USD', rate: '0.5', enteredOn: '2026-01-01' }]

  it('rechnet jede Zahl einzeln über toDisplay um', () => {
    expect(
      monthsForDisplay(
        [{ month: '2026-02', incomeCents: 100, expenseCents: 51, balanceCents: 49 }],
        'USD',
        rates
      )
    ).toEqual([{ month: '2026-02', incomeCents: 200, expenseCents: 102 }])
    expect(amountsForDisplay([{ key: 'other', cents: 100 }], 'USD', rates)).toEqual([
      { key: 'other', cents: 200 }
    ])
  })

  it('ohne Kurs → null', () => {
    const months = [{ month: '2026-02', incomeCents: 1, expenseCents: 1, balanceCents: 0 }]
    expect(monthsForDisplay(months, 'GBP', rates)).toBeNull()
    expect(amountsForDisplay([{ key: 'x', cents: 1 }], 'GBP', rates)).toBeNull()
  })
})
