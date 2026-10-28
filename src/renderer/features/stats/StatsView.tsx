import { useId, useMemo, useState, type ReactNode } from 'react'
import type { BreakEven } from '@core/forecast/forecast'
import type { RankedCampaign, RankingKey } from '@core/metrics/metrics'
import { BarChartMonthly, DonutChart } from '@/components/charts'
import {
  DataTable,
  KpiCard,
  PeriodPicker,
  isValidPeriod,
  periodFor,
  type DataColumn,
  type Period
} from '@/components/data'
import { useListLabel } from '@/components/forms/CategorySelect'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useCollection, useDisplayCurrency, useRates } from '@/hooks'
import { useFormat, useT } from '@/i18n'
import {
  LedgerWarnings,
  fixedErrorsForProject,
  ledgerErrorsForProject,
  todayIso
} from '@/components/ledger'
import { statsDict } from './i18n'
import {
  breakEvenRows,
  breakEvenSortValue,
  buildCampaignRanking,
  buildOutlook,
  buildPeriodStats,
  chartMoney,
  forecastRows,
  toCategorySlices,
  toFixedCostSlices,
  toMonthlyPoints,
  type BreakEvenRow,
  type CategoryRow,
  type FixedCostRow,
  type MonthRow,
  type ProjectRow,
  type StatsInput,
  type StatsScope
} from './stats-logic'

/** Führt eine Kern-Berechnung aus; Überlauf (RangeError) wird zu `'error'`. */
function attempt<T>(fn: () => T): T | 'error' {
  try {
    return fn()
  } catch {
    return 'error'
  }
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      {children}
    </section>
  )
}

export interface StatsViewProps {
  /** `null` = Portfolio, sonst Projekt-ID. */
  scope: StatsScope
  /** Zusätzliche Bedienelemente neben dem Zeitraum (z. B. Umschalter Portfolio/Projekt). */
  toolbar?: ReactNode
}

/** Alle Statistik-Abschnitte (PE-16) für Portfolio oder ein Projekt. Rechnet nur im Kern. */
export function StatsView({ scope, toolbar }: StatsViewProps) {
  const t = useT(statsDict)
  const fmt = useFormat()
  const display = useDisplayCurrency()
  const { rates } = useRates()
  const categoryLabel = useListLabel('expenseCategories')
  const platformLabel = useListLabel('campaignPlatforms')
  const rankId = useId()
  // Bei jedem Rendern (also auch nach jedem Laden) frisch, damit eine Sitzung über
  // Mitternacht nicht mit dem Vortag rechnet. Die Memos hängen am Text, nicht am Objekt.
  const today = todayIso()
  const [period, setPeriod] = useState<Period>(() => periodFor('year', today))
  const [rankBy, setRankBy] = useState<RankingKey>('costPerUser')

  const projects = useCollection('projects')
  const expenses = useCollection('expenses')
  const incomes = useCollection('incomes')
  const campaigns = useCollection('campaigns')
  const sources = [projects, expenses, incomes, campaigns]
  const loading = sources.some((s) => s.loading)
  const errorText = sources.find((s) => s.errorText)?.errorText ?? null
  const ready = !loading && errorText === null
  const valid = isValidPeriod(period)
  const reload = () => {
    for (const s of sources) void s.reload()
  }

  const input: StatsInput = useMemo(
    () => ({
      projects: projects.items,
      expenses: expenses.items,
      incomes: incomes.items,
      campaigns: campaigns.items
    }),
    [projects.items, expenses.items, incomes.items, campaigns.items]
  )

  const stats = useMemo(
    () =>
      ready && valid
        ? attempt(() => buildPeriodStats(input, { from: period.from, to: period.to }, today, scope))
        : null,
    [ready, valid, input, period.from, period.to, today, scope]
  )
  // Historie und Prognose hängen nur von Daten und heute ab, nicht vom Zeitraum.
  const outlook = useMemo(
    () => (ready ? attempt(() => buildOutlook(input, today)) : null),
    [ready, input, today]
  )
  const okStats = stats === 'error' ? null : stats
  const okOutlook = outlook === 'error' ? null : outlook

  // Projektansicht: nur nicht umrechenbare Buchungen, die dieses Projekt betreffen.
  const warnings = useMemo(() => {
    if (!okStats) return { ledger: null, fixedCosts: null }
    if (scope === null) return { ledger: okStats.ledger, fixedCosts: okStats.fixedCosts }
    return {
      ledger: { errors: ledgerErrorsForProject(okStats.ledger.errors, input, scope) },
      fixedCosts: {
        errors: fixedErrorsForProject(
          okStats.fixedCosts.errors,
          input,
          okStats.fixedCostDate,
          scope
        )
      }
    }
  }, [okStats, input, scope])

  const ranking = useMemo(
    () =>
      okStats
        ? buildCampaignRanking(
            input.campaigns,
            okStats.ledger,
            { from: period.from, to: period.to },
            scope,
            rankBy
          )
        : null,
    [okStats, input.campaigns, period.from, period.to, scope, rankBy]
  )
  const forecastMonths = useMemo(
    () => (okOutlook ? forecastRows(okOutlook.forecast, scope) : []),
    [okOutlook, scope]
  )
  const breakEvens = useMemo(
    () => (okOutlook ? attempt(() => breakEvenRows(okOutlook, input.projects, scope)) : null),
    [okOutlook, input.projects, scope]
  )

  const money = useMemo(() => chartMoney(display.currency, rates), [display.currency, rates])
  const monthlyPoints = useMemo(
    () => toMonthlyPoints(okStats?.months ?? [], money.convert),
    [okStats, money]
  )
  const categorySlices = useMemo(
    () => toCategorySlices(okStats?.categories ?? [], categoryLabel, money.convert),
    [okStats, categoryLabel, money]
  )
  const fixedSlices = useMemo(
    () => toFixedCostSlices(okStats?.fixedByProject ?? [], t('unallocated'), money.convert),
    [okStats, t, money]
  )
  const forecastPoints = useMemo(
    () => toMonthlyPoints(forecastMonths, money.convert),
    [forecastMonths, money]
  )

  // Spalten nur neu bauen, wenn sich Sprache, Format oder Anzeigewährung ändern.
  const {
    monthColumns,
    categoryColumns,
    projectColumns,
    fixedColumns,
    campaignColumns,
    breakEvenColumns
  } = useMemo(() => {
    const cash = (cents: number) => display.format(cents).text
    const monthLabel = (m: string) => fmt.date(`${m}-01`, { month: 'long', year: 'numeric' })
    const projectName = (name: string | null) => name ?? <em>{t('unallocated')}</em>
    const breakEvenText = (r: BreakEven) =>
      r === 'notInSight'
        ? t('notInSight')
        : 'reachedAt' in r
          ? t('reachedAt', { month: monthLabel(r.reachedAt) })
          : t('expectedAt', { month: monthLabel(r.expectedAt) })

    const monthColumns: DataColumn<MonthRow>[] = [
      {
        id: 'month',
        header: t('colMonth'),
        cell: (r) => monthLabel(r.month),
        sortValue: (r) => r.month
      },
      moneyColumn('income', t('colIncome'), (r) => r.incomeCents, cash),
      moneyColumn('expenses', t('colExpenses'), (r) => r.expenseCents, cash),
      moneyColumn('balance', t('colBalance'), (r) => r.balanceCents, cash)
    ]
    const categoryColumns: DataColumn<CategoryRow>[] = [
      {
        id: 'category',
        header: t('colCategory'),
        cell: (r) => categoryLabel(r.key),
        sortValue: (r) => categoryLabel(r.key)
      },
      moneyColumn('expenses', t('colExpenses'), (r) => r.cents, cash)
    ]
    const projectColumns: DataColumn<ProjectRow>[] = [
      {
        id: 'project',
        header: t('colProject'),
        cell: (r) => projectName(r.name),
        sortValue: (r) => r.name ?? ''
      },
      moneyColumn('income', t('colIncome'), (r) => r.incomeCents, cash),
      moneyColumn('expenses', t('colExpenses'), (r) => r.expenseCents, cash),
      moneyColumn('balance', t('colBalance'), (r) => r.balanceCents, cash)
    ]
    const fixedColumns: DataColumn<FixedCostRow>[] = [
      {
        id: 'project',
        header: t('colProject'),
        cell: (r) => projectName(r.name),
        sortValue: (r) => r.name ?? ''
      },
      moneyColumn('fixed', t('colFixed'), (r) => r.cents, cash)
    ]
    const dash = '–'
    const optionalMoney = (c: number | null) => (c === null ? dash : cash(c))
    const campaignColumns: DataColumn<RankedCampaign>[] = [
      { id: 'name', header: t('colCampaign'), cell: (r) => r.campaign.name },
      { id: 'platform', header: t('colPlatform'), cell: (r) => platformLabel(r.campaign.platform) },
      { id: 'start', header: t('colStart'), cell: (r) => fmt.date(r.campaign.startDate) },
      { id: 'cost', header: t('colCost'), align: 'right', cell: (r) => cash(r.kpis.costEurCents) },
      {
        id: 'users',
        header: t('colUsers'),
        align: 'right',
        cell: (r) => fmt.number(r.campaign.usersGained)
      },
      {
        id: 'costPerUser',
        header: t('colCostPerUser'),
        align: 'right',
        cell: (r) => optionalMoney(r.kpis.costPerUserCents)
      },
      {
        id: 'cpc',
        header: t('colCpc'),
        align: 'right',
        cell: (r) => optionalMoney(r.kpis.cpcCents)
      },
      {
        id: 'ctr',
        header: t('colCtr'),
        align: 'right',
        cell: (r) =>
          r.kpis.ctrBasisPoints === null ? dash : fmt.percent(r.kpis.ctrBasisPoints / 10000, 2)
      },
      {
        id: 'rating',
        header: t('colRating'),
        align: 'right',
        cell: (r) => fmt.number(r.campaign.rating)
      }
    ]
    const breakEvenColumns: DataColumn<BreakEvenRow>[] = [
      {
        id: 'project',
        header: t('colProject'),
        cell: (r) => (r.name === null ? <strong>{t('portfolioTotal')}</strong> : r.name)
      },
      {
        id: 'breakEven',
        header: t('colBreakEven'),
        cell: (r) => breakEvenText(r.result),
        sortValue: (r) => breakEvenSortValue(r.result)
      }
    ]
    return {
      monthColumns,
      categoryColumns,
      projectColumns,
      fixedColumns,
      campaignColumns,
      breakEvenColumns
    }
  }, [t, fmt, display, categoryLabel, platformLabel])

  const computeFailed = stats === 'error' || outlook === 'error' || breakEvens === 'error'
  const forecastErrors = okOutlook?.forecast.errors.length ?? 0
  const historyErrors = okOutlook?.history.errors.length ?? 0
  const campaignErrors = ranking?.errors.length ?? 0
  const tableState = { loading, error: errorText, onRetry: reload }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end gap-4">
        {toolbar}
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>

      {!valid && (
        <p role="alert" className="text-sm text-destructive">
          {t('invalidPeriod')}
        </p>
      )}
      {computeFailed && (
        <p role="alert" className="text-sm text-destructive">
          {t('computeError')}
        </p>
      )}
      <LedgerWarnings ledger={warnings.ledger} fixedCosts={warnings.fixedCosts} />
      {(historyErrors > 0 || forecastErrors > 0 || campaignErrors > 0) && (
        <div role="alert" className="grid gap-1 rounded-md border border-destructive p-3 text-sm">
          {historyErrors > 0 && <p>{t('historyErrors', { count: historyErrors })}</p>}
          {forecastErrors > 0 && <p>{t('forecastErrors', { count: forecastErrors })}</p>}
          {campaignErrors > 0 && <p>{t('campaignErrors', { count: campaignErrors })}</p>}
        </div>
      )}
      {okStats && okStats.unallocatedCount > 0 && (
        <p role="status" className="text-sm text-destructive">
          {t('unallocatedWarning', { count: okStats.unallocatedCount })}
        </p>
      )}
      {money.fallback && (
        <p role="status" className="text-sm text-muted-foreground">
          {t('chartFallback', { currency: display.currency })}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          testId="kpi-income"
          title={t('income')}
          eurCents={okStats?.totals.incomeCents}
          loading={loading}
        />
        <KpiCard
          testId="kpi-expenses"
          title={t('expenses')}
          eurCents={okStats?.totals.expenseCents}
          loading={loading}
        />
        <KpiCard
          testId="kpi-balance"
          title={t('balance')}
          eurCents={okStats?.totals.balanceCents}
          loading={loading}
        />
        <KpiCard
          testId="kpi-fixed-costs"
          title={t('fixedCosts')}
          eurCents={okStats?.fixedCostsCents}
          loading={loading}
          hint={
            okStats ? t('fixedCostsHint', { date: fmt.date(okStats.fixedCostDate) }) : undefined
          }
        />
      </div>

      <Section title={t('monthly')}>
        <BarChartMonthly title={t('monthly')} data={monthlyPoints} currency={money.currency} />
        <DataTable
          caption={t('monthly')}
          columns={monthColumns}
          rows={okStats?.months ?? []}
          getRowId={(r) => r.month}
          empty={t('empty')}
          {...tableState}
        />
      </Section>

      <Section title={t('byCategory')}>
        <DonutChart title={t('byCategory')} data={categorySlices} currency={money.currency} />
        <DataTable
          caption={t('byCategory')}
          columns={categoryColumns}
          rows={okStats?.categories ?? []}
          getRowId={(r) => r.key}
          empty={t('empty')}
          {...tableState}
        />
      </Section>

      {scope === null && (
        <Section title={t('projectRanking')}>
          <DataTable
            caption={t('projectRanking')}
            columns={projectColumns}
            rows={okStats?.projectRanking ?? []}
            getRowId={(r) => r.projectId ?? '__unallocated'}
            empty={t('noProjects')}
            {...tableState}
          />
        </Section>
      )}

      <Section
        title={t('fixedByProject')}
        hint={
          okStats ? t('fixedByProjectHint', { date: fmt.date(okStats.fixedCostDate) }) : undefined
        }
      >
        {scope === null && (
          <DonutChart title={t('fixedByProject')} data={fixedSlices} currency={money.currency} />
        )}
        <DataTable
          caption={t('fixedByProject')}
          columns={fixedColumns}
          rows={okStats?.fixedByProject ?? []}
          getRowId={(r) => r.projectId ?? '__unallocated'}
          empty={t('noProjects')}
          {...tableState}
        />
      </Section>

      <Section
        title={t('campaignRanking')}
        hint={scope === null ? undefined : t('campaignProjectHint')}
      >
        <div className="grid max-w-sm gap-1">
          <Label htmlFor={rankId}>{t('rankBy')}</Label>
          <Select
            id={rankId}
            value={rankBy}
            onValueChange={(v) => setRankBy(v === 'rating' ? 'rating' : 'costPerUser')}
          >
            <option value="costPerUser">{t('rankCostPerUser')}</option>
            <option value="rating">{t('rankRating')}</option>
          </Select>
        </div>
        <DataTable
          caption={t('campaignRanking')}
          columns={campaignColumns}
          rows={ranking?.items ?? []}
          getRowId={(r) => r.campaign.id}
          empty={t('noCampaigns')}
          {...tableState}
        />
      </Section>

      <Section
        title={t('forecast')}
        hint={
          okOutlook
            ? t('forecastHint', {
                from: fmt.date(okOutlook.forecast.from),
                to: fmt.date(okOutlook.forecast.to)
              })
            : undefined
        }
      >
        <BarChartMonthly title={t('forecast')} data={forecastPoints} currency={money.currency} />
        <DataTable
          caption={t('forecast')}
          columns={monthColumns}
          rows={forecastMonths}
          getRowId={(r) => r.month}
          empty={t('empty')}
          {...tableState}
        />
      </Section>

      <Section title={t('breakEven')} hint={t('breakEvenHint')}>
        <DataTable
          caption={t('breakEven')}
          columns={breakEvenColumns}
          rows={breakEvens === 'error' || breakEvens === null ? [] : breakEvens}
          getRowId={(r) => r.projectId ?? '__portfolio'}
          empty={t('noProjects')}
          {...tableState}
        />
      </Section>
    </div>
  )
}

function moneyColumn<T>(
  id: string,
  header: string,
  value: (row: T) => number,
  cash: (cents: number) => string
): DataColumn<T> {
  return { id, header, align: 'right', cell: (r) => cash(value(r)), sortValue: value }
}
