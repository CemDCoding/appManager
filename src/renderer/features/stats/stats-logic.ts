import { aggregate, type LedgerFilter, type Totals } from '@core/aggregate/aggregate'
import { toDisplay } from '@core/aggregate/display'
import { monthlyFixedCosts, type MonthlyFixedCosts } from '@core/aggregate/fixedCosts'
import type { RateEntry } from '@core/currency/currency'
import { breakEven, forecast, type BreakEven, type Forecast } from '@core/forecast/forecast'
import { buildLedger, type DateRange, type Ledger } from '@core/ledger/ledger'
import { campaignRanking, type CampaignRanking, type RankingKey } from '@core/metrics/metrics'
import { BASE_CURRENCY } from '@shared/money'
import type { Campaign } from '@shared/schemas/campaign'
import type { Expense } from '@shared/schemas/expense'
import type { Income } from '@shared/schemas/income'
import type { Project } from '@shared/schemas/project'

/**
 * Daten-Mapping der Statistikseite (F-09, PE-16). Gerechnet wird ausschließlich im Kern
 * (`buildLedger`, `aggregate`, `monthlyFixedCosts`, `forecast`, `breakEven`,
 * `campaignRanking`, `toDisplay`); hier werden die Ergebnisse nur ausgewählt, benannt und
 * für Diagramme und Tabellen umgeformt.
 */

export interface StatsInput {
  projects: readonly Project[]
  expenses: readonly Expense[]
  incomes: readonly Income[]
  campaigns: readonly Campaign[]
}

/** `null` = Portfolio (alle Projekte inkl. unzugeordneter Buchungen). */
export type StatsScope = string | null

/** Monatszeile: Werte 1:1 aus einer Kern-Gruppe bzw. einem Prognosemonat (EUR-Cent). */
export interface MonthRow extends Totals {
  /** "YYYY-MM". */
  month: string
}

export interface CategoryRow {
  /** Kategorie-Schlüssel ohne Präfix `expense:`. */
  key: string
  cents: number
}

export interface ProjectRow extends Totals {
  /** `null` = Buchungen ohne aktives Projekt. */
  projectId: string | null
  name: string | null
}

export interface FixedCostRow {
  /** `null` = Anteil ohne aktives Projekt am Stichtag. */
  projectId: string | null
  name: string | null
  cents: number
}

export interface PeriodStats {
  ledger: Ledger
  totals: Totals
  /** Stichtag der Fixkosten: heute, begrenzt auf den Zeitraum. */
  fixedCostDate: string
  fixedCosts: MonthlyFixedCosts
  /** Fixkosten pro Monat im gewählten Umfang (Portfolio: gesamt). */
  fixedCostsCents: number
  months: MonthRow[]
  categories: CategoryRow[]
  /** Projekte nach Saldo absteigend (Projektansicht: nur dieses Projekt). */
  projectRanking: ProjectRow[]
  fixedByProject: FixedCostRow[]
  /** Anzahl Einträge ohne aktives Projekt im Umfang (0 = keine). */
  unallocatedCount: number
}

/** Höchstzahl Monate, die als leere Balken aufgefüllt werden (Schutz bei Riesen-Zeiträumen). */
export const MAX_FILLED_MONTHS = 1200

/** Stichtag der Fixkosten-Kennzahl: heute, begrenzt auf den Zeitraum (wie Startseite). */
export function clampDate(today: string, range: DateRange): string {
  if (today < range.from) return range.from
  if (today > range.to) return range.to
  return today
}

/**
 * Zeitraum der Ledger-Historie für Break-even: frühestes Datum aller Daten (Projektstart,
 * Buchungsdatum, Wiederholungsstart, Kampagnenstart) bis `today`.
 */
export function historyRange(input: StatsInput, today: string): DateRange {
  let from = today
  const take = (date: string): void => {
    if (date < from) from = date
  }
  for (const p of input.projects) take(p.startDate)
  for (const e of input.expenses) take(e.kind === 'oneTime' ? e.date : e.recurrence.startDate)
  for (const i of input.incomes) take(i.kind === 'oneTime' ? i.date : i.recurrence.startDate)
  for (const c of input.campaigns) take(c.startDate)
  return { from, to: today }
}

export interface Outlook {
  /** Journal vom frühesten Datum bis heute. */
  history: Ledger
  /** 12-Monats-Prognose für dasselbe `today`. */
  forecast: Forecast
}

/** Historie und Prognose für dasselbe `today` (Voraussetzung für `breakEven`). */
export function buildOutlook(input: StatsInput, today: string): Outlook {
  return {
    history: buildLedger(input, historyRange(input, today)),
    forecast: forecast(input, today)
  }
}

function scopeFilter(scope: StatsScope): LedgerFilter {
  return scope === null ? {} : { projectIds: [scope] }
}

function pad(n: number, len = 2): string {
  return String(n).padStart(len, '0')
}

/** Monatsschlüssel "YYYY-MM" von `from` bis `to` (höchstens `MAX_FILLED_MONTHS`). */
export function monthKeys(from: string, to: string): string[] {
  const start = Number(from.slice(0, 4)) * 12 + Number(from.slice(5, 7)) - 1
  const end = Number(to.slice(0, 4)) * 12 + Number(to.slice(5, 7)) - 1
  const keys: string[] = []
  for (let i = start; i <= end && keys.length < MAX_FILLED_MONTHS; i++) {
    keys.push(`${pad(Math.floor(i / 12), 4)}-${pad((i % 12) + 1)}`)
  }
  return keys
}

/** Ergänzt Monate ohne Buchung mit 0, damit der Verlauf lückenlos ist. */
export function fillMonths(rows: readonly MonthRow[], range: DateRange): MonthRow[] {
  const byMonth = new Map(rows.map((r) => [r.month, r]))
  const keys = monthKeys(range.from, range.to)
  if (keys.length >= MAX_FILLED_MONTHS) return [...rows]
  return keys.map(
    (month) => byMonth.get(month) ?? { month, incomeCents: 0, expenseCents: 0, balanceCents: 0 }
  )
}

/** Alle Kennzahlen eines Zeitraums für Portfolio (`scope` null) oder ein Projekt. */
export function buildPeriodStats(
  input: StatsInput,
  range: DateRange,
  today: string,
  scope: StatsScope
): PeriodStats {
  const ledger = buildLedger(input, range)
  const filter = scopeFilter(scope)
  const byMonth = aggregate(ledger.entries, { groupBy: 'month', filter })
  const byCategory = aggregate(ledger.entries, {
    groupBy: 'category',
    filter: { ...filter, kind: 'expense' }
  })
  const names = new Map(input.projects.map((p) => [p.id, p.name]))
  const name = (id: string | null): string | null => (id === null ? null : (names.get(id) ?? id))

  const fixedCostDate = clampDate(today, range)
  const fixedCosts = monthlyFixedCosts(input.expenses, input.projects, fixedCostDate)

  const months = fillMonths(
    byMonth.groups.map((g) => ({
      month: g.key ?? '',
      incomeCents: g.incomeCents,
      expenseCents: g.expenseCents,
      balanceCents: g.balanceCents
    })),
    range
  )

  const categories = byCategory.groups
    .map((g) => ({ key: (g.key ?? '').replace(/^expense:/, ''), cents: g.expenseCents }))
    .sort((a, b) => b.cents - a.cents)

  let projectRanking: ProjectRow[]
  let fixedByProject: FixedCostRow[]
  if (scope === null) {
    const byProject = aggregate(ledger.entries, { groupBy: 'project' })
    projectRanking = byProject.groups.map((g) => ({
      projectId: g.key,
      name: name(g.key),
      incomeCents: g.incomeCents,
      expenseCents: g.expenseCents,
      balanceCents: g.balanceCents
    }))
    // Projekte ohne Buchungen im Zeitraum bleiben sichtbar (mit 0).
    const present = new Set(projectRanking.map((r) => r.projectId))
    for (const p of input.projects) {
      if (!present.has(p.id)) {
        projectRanking.push({
          projectId: p.id,
          name: p.name,
          incomeCents: 0,
          expenseCents: 0,
          balanceCents: 0
        })
      }
    }
    fixedByProject = fixedCosts.byProject.map((r) => ({
      projectId: r.projectId,
      name: name(r.projectId),
      cents: r.cents
    }))
    if (fixedCosts.unallocatedCents !== 0) {
      fixedByProject.push({ projectId: null, name: null, cents: fixedCosts.unallocatedCents })
    }
  } else {
    projectRanking = [{ projectId: scope, name: name(scope), ...byMonth.total }]
    fixedByProject = fixedCosts.byProject
      .filter((r) => r.projectId === scope)
      .map((r) => ({ projectId: r.projectId, name: name(r.projectId), cents: r.cents }))
  }
  projectRanking.sort((a, b) => b.balanceCents - a.balanceCents)

  const fixedCostsCents =
    scope === null
      ? fixedCosts.totalCents
      : (fixedCosts.byProject.find((r) => r.projectId === scope)?.cents ?? 0)

  return {
    ledger,
    totals: byMonth.total,
    fixedCostDate,
    fixedCosts,
    fixedCostsCents,
    months,
    categories,
    projectRanking,
    fixedByProject,
    unallocatedCount:
      scope === null ? ledger.entries.filter((e) => e.unallocated === true).length : 0
  }
}

/**
 * Kampagnen des Zeitraums im Umfang, gereiht durch den Kern. Portfolio: Start im Zeitraum
 * (PE-49). Projekt: Kampagnen, deren Kosten im Zeitraum (laut Ledger) auf das Projekt fallen.
 */
export function buildCampaignRanking(
  campaigns: readonly Campaign[],
  ledger: Ledger,
  range: DateRange,
  scope: StatsScope,
  by: RankingKey
): CampaignRanking {
  let selected: readonly Campaign[]
  if (scope === null) {
    selected = campaigns.filter((c) => c.startDate >= range.from && c.startDate <= range.to)
  } else {
    const ids = new Set(
      ledger.entries
        .filter((e) => e.sourceType === 'campaign' && e.projectId === scope)
        .map((e) => e.sourceId)
    )
    selected = campaigns.filter((c) => ids.has(c.id))
  }
  return campaignRanking(selected, by)
}

/** Prognosemonate im Umfang (Projekt: dessen Anteil, 0 in Monaten ohne Anteil). */
export function forecastRows(f: Forecast, scope: StatsScope): MonthRow[] {
  return f.months.map((m) => {
    if (scope === null) {
      return {
        month: m.month,
        incomeCents: m.incomeCents,
        expenseCents: m.expenseCents,
        balanceCents: m.balanceCents
      }
    }
    const p = m.byProject.find((b) => b.projectId === scope)
    return {
      month: m.month,
      incomeCents: p?.incomeCents ?? 0,
      expenseCents: p?.expenseCents ?? 0,
      balanceCents: p?.balanceCents ?? 0
    }
  })
}

export interface BreakEvenRow {
  /** `null` = Portfolio gesamt. */
  projectId: string | null
  name: string | null
  result: BreakEven
}

/**
 * Break-even je Projekt (Kern `breakEven`). Portfolio: alle Projekte plus eine Zeile
 * „Portfolio gesamt“ (projectId null) am Ende; Projektansicht: nur das Projekt.
 */
export function breakEvenRows(
  outlook: Outlook,
  projects: readonly Project[],
  scope: StatsScope
): BreakEvenRow[] {
  const list = scope === null ? projects : projects.filter((p) => p.id === scope)
  const rows: BreakEvenRow[] = list.map((p) => ({
    projectId: p.id,
    name: p.name,
    result: breakEven(outlook.history, outlook.forecast, p.id)
  }))
  if (scope === null) {
    rows.push({
      projectId: null,
      name: null,
      result: breakEven(outlook.history, outlook.forecast, null)
    })
  }
  return rows
}

/** Sortierwert für Break-even-Tabellen: erreicht < erwartet < nicht in Sicht, dann Monat. */
export function breakEvenSortValue(result: BreakEven): string {
  if (result === 'notInSight') return '3'
  if ('reachedAt' in result) return `1-${result.reachedAt}`
  return `2-${result.expectedAt}`
}

// ------------------------------------------------------------- Diagramm-Mapping

export interface ChartMoney {
  /** Währung der Diagrammwerte. */
  currency: string
  /** EUR-Cent → Cent in `currency` (Kern `toDisplay`); nicht umrechenbar → NaN (wird ausgelassen). */
  convert: (eurCents: number) => number
  /** true, wenn die Anzeigewährung keinen Kurs hat und die Diagramme in EUR bleiben. */
  fallback: boolean
}

/**
 * Umrechnung für Diagramme (PE-50: jede Zahl einzeln aus EUR). Fehlt der Kurs der
 * Anzeigewährung, bleiben die Diagramme in EUR (`fallback`), statt Zahlen zu erfinden.
 */
export function chartMoney(displayCurrency: string, rates: readonly RateEntry[]): ChartMoney {
  const identity = (c: number): number => c
  if (displayCurrency === BASE_CURRENCY) {
    return { currency: BASE_CURRENCY, convert: identity, fallback: false }
  }
  if (!toDisplay(1, displayCurrency, rates).ok) {
    return { currency: BASE_CURRENCY, convert: identity, fallback: true }
  }
  return {
    currency: displayCurrency,
    convert: (c) => {
      const r = toDisplay(c, displayCurrency, rates)
      return r.ok ? r.value.cents : Number.NaN
    },
    fallback: false
  }
}

/** Monatszeilen → `BarChartMonthly`-Daten. */
export function toMonthlyPoints(
  rows: readonly MonthRow[],
  convert: ChartMoney['convert']
): { month: string; incomeCents: number; expenseCents: number }[] {
  return rows.map((r) => ({
    month: r.month,
    incomeCents: convert(r.incomeCents),
    expenseCents: convert(r.expenseCents)
  }))
}

/** Kategorien → `DonutChart`-Daten. */
export function toCategorySlices(
  rows: readonly CategoryRow[],
  label: (key: string) => string,
  convert: ChartMoney['convert']
): { key: string; label: string; cents: number }[] {
  return rows.map((r) => ({ key: r.key, label: label(r.key), cents: convert(r.cents) }))
}

/** Fixkosten je Projekt → `DonutChart`-Daten (`unallocatedLabel` für die Zeile ohne Projekt). */
export function toFixedCostSlices(
  rows: readonly FixedCostRow[],
  unallocatedLabel: string,
  convert: ChartMoney['convert']
): { key: string; label: string; cents: number }[] {
  return rows.map((r) => ({
    key: r.projectId ?? '__unallocated',
    label: r.name ?? unallocatedLabel,
    cents: convert(r.cents)
  }))
}
