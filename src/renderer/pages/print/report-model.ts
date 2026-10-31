/**
 * Datenmodell des PDF-Berichts (AP-24). Nur Zusammenstellung: gerechnet wird
 * ausschließlich mit Kern-Funktionen (`buildLedger`, `aggregate`,
 * `monthlyFixedCosts`, `forecast`, `breakEven`, `campaignRanking`, `toDisplay`).
 * Rein und deterministisch: „heute“ ist ein Parameter.
 */
import { aggregate, type LedgerFilter, type Totals } from '@core/aggregate/aggregate'
import { toDisplay } from '@core/aggregate/display'
import { monthlyFixedCosts } from '@core/aggregate/fixedCosts'
import type { RateEntry } from '@core/currency/currency'
import { breakEven, forecast, type BreakEven } from '@core/forecast/forecast'
import { buildLedger, type Ledger } from '@core/ledger/ledger'
import { campaignRanking, type RankedCampaign } from '@core/metrics/metrics'
import type { PdfExportInput } from '@shared/ipc'
import type { Campaign } from '@shared/schemas/campaign'
import type { Expense } from '@shared/schemas/expense'
import type { Income } from '@shared/schemas/income'
import type { Person } from '@shared/schemas/person'
import type { Project } from '@shared/schemas/project'
import type { Service } from '@shared/schemas/service'
import { projectCampaignShares } from '@/features/campaigns'

export interface ReportData {
  projects: readonly Project[]
  expenses: readonly Expense[]
  incomes: readonly Income[]
  campaigns: readonly Campaign[]
  services: readonly Service[]
  people: readonly Person[]
}

/** Monatswerte in EUR-Cent (für Diagramm und Tabelle). */
export interface MonthValues {
  month: string
  incomeCents: number
  expenseCents: number
  balanceCents: number
}

export interface KeyAmount {
  key: string
  cents: number
}

export interface NamedAmount {
  /** `null` = gelöschter Eintrag (Person/Dienst nicht mehr vorhanden). */
  name: string | null
  id: string
  cents: number
}

export interface ProjectComparisonRow extends Totals {
  /** `null` = Buchungen ohne aktives Projekt. */
  projectId: string | null
  name: string | null
  fixedCostsCents: number
  breakEven: BreakEven | null
}

/**
 * Kampagnenzeile des Berichts. `costEurCents`/`users`: im Portfolio die Werte der
 * ganzen Kampagne, im Projektbericht nur der Anteil des Projekts (PE-49, wie der
 * Kampagnen-Tab des Projekts). CPC, Kosten pro Nutzer und CTR sind Verhältnisse der
 * ganzen Kampagne (`kpis`); bei anteiliger Aufteilung bleiben sie gleich.
 */
export interface ReportCampaign extends RankedCampaign {
  costEurCents: number
  users: number
}

export interface ReportErrors {
  /** Nicht umrechenbare Buchungen im Berichtszeitraum. */
  ledger: number
  /** Nicht umrechenbare Buchungen der Historie (Break-even). */
  history: number
  /** Nicht umrechenbare Fälligkeiten der Prognose. */
  forecast: number
  fixedCosts: number
  campaigns: number
}

export interface ReportModel {
  scope: PdfExportInput['scope']
  projectId: string | null
  /** Name des Projekts (Projektbericht), sonst `null`. */
  projectName: string | null
  period: { from: string; to: string }
  today: string
  totals: Totals
  fixedCosts: { cents: number; date: string }
  breakEven: BreakEven
  months: MonthValues[]
  expenseByCategory: KeyAmount[]
  incomeByCategory: KeyAmount[]
  /** Projektbericht: Ausgaben je Dienst. */
  services: NamedAmount[]
  /** Projektbericht: Zahlungen an Personen. */
  people: NamedAmount[]
  /** Kampagnen mit Buchung im Zeitraum (Projektbericht: mit Anteil am Projekt). */
  campaigns: ReportCampaign[]
  /** Prognose 12 Monate ab morgen. */
  forecast: MonthValues[]
  /** Portfoliobericht: alle Projekte im Vergleich. */
  projects: ProjectComparisonRow[]
  /** Anzahl Einträge ohne aktives Projekt im Zeitraum. */
  unallocatedCount: number
  errors: ReportErrors
}

/** Stichtag der Fixkosten: heute, begrenzt auf den Berichtszeitraum. */
export function fixedCostDate(today: string, period: { from: string; to: string }): string {
  if (today < period.from) return period.from
  if (today > period.to) return period.to
  return today
}

/** Lokales Datum "YYYY-MM-DD" (nicht UTC). */
export function localIsoDate(now: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${String(now.getFullYear()).padStart(4, '0')}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}

/** Frühestes Datum aller Buchungen und Projektstarts (Beginn der Ledger-Historie). */
export function earliestDate(data: Omit<ReportData, 'services' | 'people'>): string | null {
  const dates: string[] = []
  for (const p of data.projects) dates.push(p.startDate)
  for (const e of data.expenses) dates.push(e.kind === 'oneTime' ? e.date : e.recurrence.startDate)
  for (const i of data.incomes) dates.push(i.kind === 'oneTime' ? i.date : i.recurrence.startDate)
  for (const c of data.campaigns) dates.push(c.startDate)
  if (dates.length === 0) return null
  return dates.reduce((min, d) => (d < min ? d : min))
}

/** Ledger von frühestem Datum bis heute (für Break-even, wie AP-22). */
export function buildHistory(data: ReportData, today: string): Ledger {
  const first = earliestDate(data)
  if (first === null) return { entries: [], errors: [] }
  return buildLedger(data, { from: first < today ? first : today, to: today })
}

function stripKindPrefix(key: string | null): string {
  if (key === null) return ''
  const i = key.indexOf(':')
  return i === -1 ? key : key.slice(i + 1)
}

/** Baut alle Zahlen des Berichts aus den Kern-Funktionen. */
export function buildReportModel(
  data: ReportData,
  input: Pick<PdfExportInput, 'scope' | 'projectId' | 'period'>,
  today: string
): ReportModel {
  const projectId = input.scope === 'project' ? (input.projectId ?? null) : null
  const period = { from: input.period.from, to: input.period.to }
  const projectFilter: LedgerFilter = projectId === null ? {} : { projectIds: [projectId] }

  const ledger = buildLedger(data, period)
  const history = buildHistory(data, today)
  const fc = forecast(data, today)
  const fixedDate = fixedCostDate(today, period)
  const fixed = monthlyFixedCosts(data.expenses, data.projects, fixedDate)

  const totals = aggregate(ledger.entries, { groupBy: 'project', filter: projectFilter }).total
  const months = aggregate(ledger.entries, { groupBy: 'month', filter: projectFilter }).groups.map(
    (g) => ({
      month: g.key ?? '',
      incomeCents: g.incomeCents,
      expenseCents: g.expenseCents,
      balanceCents: g.balanceCents
    })
  )
  const byCategory = (kind: 'expense' | 'income'): KeyAmount[] =>
    aggregate(ledger.entries, { groupBy: 'category', filter: { ...projectFilter, kind } })
      .groups.map((g) => ({
        key: stripKindPrefix(g.key),
        cents: kind === 'expense' ? g.expenseCents : g.incomeCents
      }))
      .filter((g) => g.cents !== 0)

  const serviceNames = new Map(data.services.map((s) => [s.id, `${s.provider} · ${s.plan}`]))
  const services: NamedAmount[] = aggregate(ledger.entries, {
    groupBy: 'service',
    filter: { ...projectFilter, kind: 'expense' }
  })
    .groups.filter((g) => g.key !== null)
    .map((g) => ({
      id: g.key as string,
      name: serviceNames.get(g.key as string) ?? null,
      cents: g.expenseCents
    }))

  const personNames = new Map(data.people.map((p) => [p.id, p.name]))
  const people: NamedAmount[] = aggregate(ledger.entries, {
    groupBy: 'person',
    filter: { ...projectFilter, kind: 'expense' }
  })
    .groups.filter((g) => g.key !== null)
    .map((g) => ({
      id: g.key as string,
      name: personNames.get(g.key as string) ?? null,
      cents: g.expenseCents
    }))

  // Kampagnen mit mindestens einem Eintrag im Zeitraum (Projekt: mit Anteil am Projekt).
  const campaignIds = new Set(
    ledger.entries
      .filter(
        (e) => e.sourceType === 'campaign' && (projectId === null || e.projectId === projectId)
      )
      .map((e) => e.sourceId)
  )
  const ranking = campaignRanking(
    data.campaigns.filter((c) => campaignIds.has(c.id)),
    'costPerUser'
  )
  let campaignShareErrors = 0
  const campaigns: ReportCampaign[] = []
  if (projectId === null) {
    for (const item of ranking.items) {
      campaigns.push({
        ...item,
        costEurCents: item.kpis.costEurCents,
        users: item.campaign.usersGained
      })
    }
  } else {
    // Projektanteil wie im Kampagnen-Tab des Projekts (Kosten aus dem Ledger, Nutzer aus dem Kern).
    const shares = new Map(
      projectCampaignShares(
        ranking.items.map((i) => i.campaign),
        data.projects,
        projectId
      ).map((s) => [s.campaign.id, s])
    )
    for (const item of ranking.items) {
      const share = shares.get(item.campaign.id)
      if (!share || share.costEurCents === null) {
        campaignShareErrors++
        continue
      }
      campaigns.push({ ...item, costEurCents: share.costEurCents, users: share.users })
    }
  }

  const forecastMonths: MonthValues[] = fc.months.map((m) => {
    if (projectId === null) {
      return {
        month: m.month,
        incomeCents: m.incomeCents,
        expenseCents: m.expenseCents,
        balanceCents: m.balanceCents
      }
    }
    const p = m.byProject.find((b) => b.projectId === projectId)
    return {
      month: m.month,
      incomeCents: p?.incomeCents ?? 0,
      expenseCents: p?.expenseCents ?? 0,
      balanceCents: p?.balanceCents ?? 0
    }
  })

  const fixedFor = (id: string | null): number =>
    id === null
      ? fixed.unallocatedCents
      : (fixed.byProject.find((b) => b.projectId === id)?.cents ?? 0)

  const projects: ProjectComparisonRow[] = []
  if (projectId === null) {
    const byProject = aggregate(ledger.entries, { groupBy: 'project' }).groups
    for (const p of data.projects) {
      const g = byProject.find((x) => x.key === p.id)
      const fixedCents = fixedFor(p.id)
      if (!g && p.archived && fixedCents === 0) continue
      projects.push({
        projectId: p.id,
        name: p.name,
        incomeCents: g?.incomeCents ?? 0,
        expenseCents: g?.expenseCents ?? 0,
        balanceCents: g?.balanceCents ?? 0,
        fixedCostsCents: fixedCents,
        breakEven: breakEven(history, fc, p.id)
      })
    }
    const unallocated = byProject.find((x) => x.key === null)
    if (unallocated || fixed.unallocatedCents !== 0) {
      projects.push({
        projectId: null,
        name: null,
        incomeCents: unallocated?.incomeCents ?? 0,
        expenseCents: unallocated?.expenseCents ?? 0,
        balanceCents: unallocated?.balanceCents ?? 0,
        fixedCostsCents: fixed.unallocatedCents,
        breakEven: null
      })
    }
  }

  return {
    scope: input.scope,
    projectId,
    projectName:
      projectId === null ? null : (data.projects.find((p) => p.id === projectId)?.name ?? null),
    period,
    today,
    totals,
    fixedCosts: {
      cents: projectId === null ? fixed.totalCents : fixedFor(projectId),
      date: fixedDate
    },
    breakEven: breakEven(history, fc, projectId),
    months,
    expenseByCategory: byCategory('expense'),
    incomeByCategory: byCategory('income'),
    services,
    people,
    campaigns,
    forecast: forecastMonths,
    projects,
    unallocatedCount: projectId === null ? ledger.entries.filter((e) => e.unallocated).length : 0,
    errors: {
      ledger: ledger.errors.length,
      history: history.errors.length,
      forecast: fc.errors.length,
      fixedCosts: fixed.errors.length,
      campaigns: ranking.errors.length + campaignShareErrors
    }
  }
}

/**
 * Monatswerte für Diagramme in die Anzeigewährung umrechnen (je Zahl einzeln über
 * `toDisplay`, PE-50). Fehlt ein Kurs, kommt `null` (Diagramm entfällt, Tabelle
 * zeigt den Fehlerwert).
 */
export function monthsForDisplay(
  months: readonly MonthValues[],
  currency: string,
  rates: readonly RateEntry[]
): { month: string; incomeCents: number; expenseCents: number }[] | null {
  const result: { month: string; incomeCents: number; expenseCents: number }[] = []
  for (const m of months) {
    const income = toDisplay(m.incomeCents, currency, rates)
    const expense = toDisplay(m.expenseCents, currency, rates)
    if (!income.ok || !expense.ok) return null
    result.push({
      month: m.month,
      incomeCents: income.value.cents,
      expenseCents: expense.value.cents
    })
  }
  return result
}

/** Beträge (z. B. Kategorien) für das Ringdiagramm umrechnen; `null` ohne Kurs. */
export function amountsForDisplay(
  items: readonly KeyAmount[],
  currency: string,
  rates: readonly RateEntry[]
): KeyAmount[] | null {
  const result: KeyAmount[] = []
  for (const item of items) {
    const r = toDisplay(item.cents, currency, rates)
    if (!r.ok) return null
    result.push({ key: item.key, cents: r.value.cents })
  }
  return result
}
