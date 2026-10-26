import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import type { BreakEven } from '@core/forecast/forecast'
import type { PdfExportInput } from '@shared/ipc'
import { BarChartMonthly, DonutChart, monthToDate } from '@/components/charts'
import { listLabel } from '@/components/forms'
import { useCollection, useDisplayCurrency, useRates, useSettings } from '@/hooks'
import { useFormat, useI18n, useT } from '@/i18n'
import { uiDict } from '@/i18n/shared-keys'
import { printDict } from './i18n'
import {
  amountsForDisplay,
  buildReportModel,
  localIsoDate,
  monthsForDisplay,
  type KeyAmount,
  type MonthValues,
  type NamedAmount,
  type ProjectComparisonRow,
  type ReportModel
} from './report-model'
import { ReportTable } from './ReportTable'
import type { RankedCampaign } from '@core/metrics/metrics'

/** Feste Diagrammgröße für A4 (Inhaltsbreite ca. 700 px bei 96 dpi). */
const CHART_SIZE = { width: 680, height: 240 } as const
const DONUT_SIZE = { width: 680, height: 220 } as const

/** Kurze Pause nach dem Commit, damit Layout und SVG-Diagramme stehen. */
const SETTLE_MS = 150

/**
 * Meldet `pdf:ready`, sobald alles gerendert ist (Schriften geladen + kurze Pause).
 * Bewusst ohne `requestAnimationFrame`: im versteckten Fenster kann es gedrosselt sein.
 */
function useSignalReady(ready: boolean): void {
  const sent = useRef(false)
  useEffect(() => {
    if (!ready || sent.current) return
    let cancelled = false
    // Bericht immer hell drucken (das Theme gilt nur für das App-Fenster).
    document.documentElement.classList.remove('dark')
    document.documentElement.style.colorScheme = 'light'
    const timer = setTimeout(() => {
      void document.fonts.ready.then(() => {
        if (cancelled || sent.current) return
        sent.current = true
        void window.api.pdf.ready()
      })
    }, SETTLE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [ready])
}

/** Bericht für Portfolio oder ein Projekt; Daten aus `window.api`, Zahlen aus dem Kern. */
export function PrintReport({ input }: { input: PdfExportInput }) {
  const t = useT(printDict)
  const projects = useCollection('projects')
  const expenses = useCollection('expenses')
  const incomes = useCollection('incomes')
  const campaigns = useCollection('campaigns')
  const services = useCollection('services')
  const persons = useCollection('persons')
  const rates = useRates()
  const settings = useSettings()
  const sources = [projects, expenses, incomes, campaigns, services, persons]
  const loading = sources.some((s) => s.loading) || rates.loading || settings.loading
  const loadError =
    sources.some((s) => s.errorText !== null) ||
    rates.errorText !== null ||
    settings.errorText !== null
  const today = useMemo(() => localIsoDate(new Date()), [])

  const result = useMemo((): { model: ReportModel } | { error: 'project' | 'calc' } | null => {
    if (loading || loadError) return null
    if (input.scope === 'project' && !projects.items.some((p) => p.id === input.projectId)) {
      return { error: 'project' }
    }
    try {
      return {
        model: buildReportModel(
          {
            projects: projects.items,
            expenses: expenses.items,
            incomes: incomes.items,
            campaigns: campaigns.items,
            services: services.items,
            people: persons.items
          },
          input,
          today
        )
      }
    } catch {
      return { error: 'calc' }
    }
  }, [
    loading,
    loadError,
    input,
    projects.items,
    expenses.items,
    incomes.items,
    campaigns.items,
    services.items,
    persons.items,
    today
  ])

  const model = result && 'model' in result ? result.model : null
  // Nur ein vollständiger Bericht wird gemeldet; sonst läuft im Main das Zeitlimit ab.
  useSignalReady(model !== null)

  if (loadError) return <Message text={t('loadError')} />
  if (result === null) return <Message text={t('loading')} />
  if ('error' in result) {
    return <Message text={t(result.error === 'project' ? 'projectMissing' : 'calcError')} />
  }
  return <Report model={result.model} input={input} />
}

function Message({ text }: { text: string }) {
  return (
    <main className="p-8">
      <p role="status">{text}</p>
    </main>
  )
}

function Report({ model, input }: { model: ReportModel; input: PdfExportInput }) {
  const t = useT(printDict)
  const tu = useT(uiDict)
  const fmt = useFormat()
  const { language } = useI18n()
  const display = useDisplayCurrency()
  const { rates } = useRates()
  const { settings } = useSettings()
  const money = (eurCents: number) => display.format(eurCents).text
  const monthLabel = (month: string) =>
    fmt.date(monthToDate(month), { month: 'long', year: 'numeric' })
  const categoryLabel = (kind: 'expense' | 'income', key: string) =>
    kind === 'expense'
      ? listLabel('expenseCategories', key, settings?.expenseCategories, language)
      : listLabel('incomeCategories', key, settings?.incomeCategories, language)
  const breakEvenText = (be: BreakEven | null): string => {
    if (be === null) return t('dash')
    if (be === 'notInSight') return t('breakEvenNotInSight')
    if ('reachedAt' in be) return t('breakEvenReached', { month: monthLabel(be.reachedAt) })
    return t('breakEvenExpected', { month: monthLabel(be.expectedAt) })
  }
  const nullable = (eurCents: number | null) => (eurCents === null ? t('dash') : money(eurCents))

  const currency = display.currency
  const chartMonths = monthsForDisplay(model.months, currency, rates)
  const chartForecast = monthsForDisplay(model.forecast, currency, rates)
  const chartCategories = amountsForDisplay(model.expenseByCategory, currency, rates)
  const chartMissing = t('chartUnavailable', { currency })

  const title =
    model.scope === 'portfolio'
      ? t('titlePortfolio')
      : t('titleProject', { name: model.projectName ?? t('dash') })

  const monthColumns = [
    { header: t('month'), cell: (r: MonthValues) => monthLabel(r.month) },
    { header: t('income'), cell: (r: MonthValues) => money(r.incomeCents), align: 'right' },
    { header: t('expenses'), cell: (r: MonthValues) => money(r.expenseCents), align: 'right' },
    { header: t('balance'), cell: (r: MonthValues) => money(r.balanceCents), align: 'right' }
  ] as const
  const categoryColumns = (kind: 'expense' | 'income') =>
    [
      { header: t('category'), cell: (r: KeyAmount) => categoryLabel(kind, r.key) },
      { header: t('amount'), cell: (r: KeyAmount) => money(r.cents), align: 'right' }
    ] as const
  const namedColumns = (header: string, deleted: string) =>
    [
      {
        header,
        cell: (r: NamedAmount) => r.name ?? <em>{deleted}</em>
      },
      { header: t('amount'), cell: (r: NamedAmount) => money(r.cents), align: 'right' }
    ] as const
  const campaignColumns = [
    { header: t('campaign'), cell: (r: RankedCampaign) => r.campaign.name },
    {
      header: t('platform'),
      cell: (r: RankedCampaign) =>
        listLabel('campaignPlatforms', r.campaign.platform, settings?.campaignPlatforms, language)
    },
    {
      header: t('campaignCost'),
      cell: (r: RankedCampaign) => money(r.kpis.costEurCents),
      align: 'right'
    },
    {
      header: t('cpc'),
      cell: (r: RankedCampaign) => nullable(r.kpis.cpcCents),
      align: 'right'
    },
    {
      header: t('costPerUser'),
      cell: (r: RankedCampaign) => nullable(r.kpis.costPerUserCents),
      align: 'right'
    },
    {
      header: t('ctr'),
      cell: (r: RankedCampaign) =>
        r.kpis.ctrBasisPoints === null ? t('dash') : fmt.percent(r.kpis.ctrBasisPoints / 10_000, 2),
      align: 'right'
    },
    {
      header: t('usersGained'),
      cell: (r: RankedCampaign) => fmt.number(r.campaign.usersGained),
      align: 'right'
    },
    { header: t('rating'), cell: (r: RankedCampaign) => String(r.campaign.rating), align: 'right' }
  ] as const
  const projectColumns = [
    {
      header: t('project'),
      cell: (r: ProjectComparisonRow) => r.name ?? <em>{t('unallocatedName')}</em>
    },
    {
      header: t('income'),
      cell: (r: ProjectComparisonRow) => money(r.incomeCents),
      align: 'right'
    },
    {
      header: t('expenses'),
      cell: (r: ProjectComparisonRow) => money(r.expenseCents),
      align: 'right'
    },
    {
      header: t('balance'),
      cell: (r: ProjectComparisonRow) => money(r.balanceCents),
      align: 'right'
    },
    {
      header: t('fixedCosts'),
      cell: (r: ProjectComparisonRow) => money(r.fixedCostsCents),
      align: 'right'
    },
    {
      header: t('breakEven'),
      cell: (r: ProjectComparisonRow) => breakEvenText(r.breakEven),
      align: 'right'
    }
  ] as const

  const totalsFooter = [
    t('total'),
    money(model.totals.incomeCents),
    money(model.totals.expenseCents),
    money(model.totals.balanceCents)
  ]
  const warnings: string[] = []
  if (model.errors.ledger > 0) warnings.push(t('ledgerErrors', { count: model.errors.ledger }))
  if (model.errors.history > 0) warnings.push(t('historyErrors', { count: model.errors.history }))
  if (model.errors.forecast > 0)
    warnings.push(t('forecastErrors', { count: model.errors.forecast }))
  if (model.errors.fixedCosts > 0)
    warnings.push(t('fixedErrors', { count: model.errors.fixedCosts }))
  if (model.errors.campaigns > 0)
    warnings.push(t('campaignErrors', { count: model.errors.campaigns }))
  if (model.unallocatedCount > 0)
    warnings.push(t('unallocatedWarning', { count: model.unallocatedCount }))
  if (display.missingRate) warnings.push(tu('displayMissingRate', { currency }))

  return (
    <main className="mx-auto grid max-w-[720px] gap-6 bg-background p-2 text-foreground print:p-0">
      <header className="grid gap-1 border-b border-foreground/40 pb-3">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm">
          {t('periodLine', { from: fmt.date(model.period.from), to: fmt.date(model.period.to) })}
        </p>
        <p className="text-xs text-muted-foreground">
          {t('createdLine', { date: fmt.date(model.today) })} ·{' '}
          {t('currencyLine', { currency: input.displayCurrency })}
          {display.converted ? ` · ${tu('convertedHint', { currency })}` : ''}
        </p>
      </header>

      {warnings.length > 0 && (
        <section
          role="alert"
          className="grid gap-1 rounded-md border border-destructive p-3 text-xs break-inside-avoid"
        >
          <h2 className="font-semibold">{t('warnings')}</h2>
          {warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </section>
      )}

      <Section title={t('kpis')}>
        <dl className="grid grid-cols-5 gap-2 text-xs">
          <Kpi label={t('income')} value={money(model.totals.incomeCents)} />
          <Kpi label={t('expenses')} value={money(model.totals.expenseCents)} />
          <Kpi label={t('balance')} value={money(model.totals.balanceCents)} />
          <Kpi
            label={t('fixedCosts')}
            value={money(model.fixedCosts.cents)}
            hint={t('fixedCostsHint', { date: fmt.date(model.fixedCosts.date) })}
          />
          <Kpi label={t('breakEven')} value={breakEvenText(model.breakEven)} />
        </dl>
      </Section>

      <Section title={t('monthly')}>
        {chartMonths ? (
          <BarChartMonthly
            title={t('monthly')}
            data={chartMonths}
            currency={currency}
            size={CHART_SIZE}
            static
          />
        ) : (
          <p className="text-xs text-destructive">{chartMissing}</p>
        )}
        <ReportTable
          caption={t('monthly')}
          columns={monthColumns}
          rows={model.months}
          rowKey={(r) => r.month}
          footer={totalsFooter}
          empty={t('none')}
        />
      </Section>

      <Section title={t('incomesByCategory')}>
        <ReportTable
          caption={t('incomesByCategory')}
          columns={categoryColumns('income')}
          rows={model.incomeByCategory}
          rowKey={(r) => r.key}
          footer={[t('total'), money(model.totals.incomeCents)]}
          empty={t('none')}
        />
      </Section>

      <Section title={t('expensesByCategory')}>
        {chartCategories ? (
          chartCategories.length > 0 && (
            <DonutChart
              title={t('expensesByCategory')}
              data={chartCategories.map((c) => ({
                key: c.key,
                label: categoryLabel('expense', c.key),
                cents: c.cents
              }))}
              currency={currency}
              size={DONUT_SIZE}
              static
            />
          )
        ) : (
          <p className="text-xs text-destructive">{chartMissing}</p>
        )}
        <ReportTable
          caption={t('expensesByCategory')}
          columns={categoryColumns('expense')}
          rows={model.expenseByCategory}
          rowKey={(r) => r.key}
          footer={[t('total'), money(model.totals.expenseCents)]}
          empty={t('none')}
        />
      </Section>

      {model.scope === 'portfolio' && (
        <Section title={t('projectsComparison')}>
          <ReportTable
            caption={t('projectsComparison')}
            columns={projectColumns}
            rows={model.projects}
            rowKey={(r) => r.projectId ?? 'unallocated'}
            empty={t('none')}
          />
        </Section>
      )}

      {model.scope === 'project' && (
        <>
          <Section title={t('services')}>
            <ReportTable
              caption={t('services')}
              columns={namedColumns(t('service'), t('deletedService'))}
              rows={model.services}
              rowKey={(r) => r.id}
              empty={t('none')}
            />
          </Section>
          <Section title={t('people')}>
            <ReportTable
              caption={t('people')}
              columns={namedColumns(t('person'), t('deletedPerson'))}
              rows={model.people}
              rowKey={(r) => r.id}
              empty={t('none')}
            />
          </Section>
        </>
      )}

      <Section title={t('campaigns')} note={t('campaignNote')}>
        <ReportTable
          caption={t('campaigns')}
          columns={campaignColumns}
          rows={model.campaigns}
          rowKey={(r) => r.campaign.id}
          empty={t('none')}
        />
      </Section>

      <Section title={t('forecast')} note={t('forecastNote')}>
        {chartForecast ? (
          <BarChartMonthly
            title={t('forecast')}
            data={chartForecast}
            currency={currency}
            size={CHART_SIZE}
            static
          />
        ) : (
          <p className="text-xs text-destructive">{chartMissing}</p>
        )}
        <ReportTable
          caption={t('forecast')}
          columns={monthColumns}
          rows={model.forecast}
          rowKey={(r) => r.month}
          empty={t('none')}
        />
      </Section>
    </main>
  )
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      <h2 className="break-after-avoid text-base font-semibold">{title}</h2>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
      {children}
    </section>
  )
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="break-inside-avoid rounded-md border border-border p-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums">{value}</dd>
      {hint && <dd className="text-muted-foreground">{hint}</dd>}
    </div>
  )
}
