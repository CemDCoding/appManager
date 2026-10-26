import { useMemo, useState } from 'react'
import { DataTable, KpiCard, PeriodPicker, isValidPeriod, periodFor } from '@/components/data'
import type { DataColumn } from '@/components/data'
import { useCollection, useDisplayCurrency } from '@/hooks'
import { useFormat, useT } from '@/i18n'
import { homeDict } from './i18n'
import { buildOverview, localIsoDate, type ProjectRow } from './overview'

/** Startseite v1: Kennzahlen und Projekte nach Saldo für einen Zeitraum (F-09, Teil). */
export function HomePage() {
  const t = useT(homeDict)
  const fmt = useFormat()
  const display = useDisplayCurrency()
  const today = useMemo(() => localIsoDate(new Date()), [])
  const [period, setPeriod] = useState(() => periodFor('month', today))

  const projects = useCollection('projects')
  const expenses = useCollection('expenses')
  const incomes = useCollection('incomes')
  const campaigns = useCollection('campaigns')
  const sources = [projects, expenses, incomes, campaigns]
  const loading = sources.some((s) => s.loading)
  const errorText = sources.find((s) => s.errorText)?.errorText ?? null
  const reload = () => {
    for (const s of sources) void s.reload()
  }

  const valid = isValidPeriod(period)
  const overview = useMemo(
    () =>
      valid && !loading && !errorText
        ? buildOverview(
            {
              projects: projects.items,
              expenses: expenses.items,
              incomes: incomes.items,
              campaigns: campaigns.items
            },
            period,
            today
          )
        : null,
    [
      valid,
      loading,
      errorText,
      projects.items,
      expenses.items,
      incomes.items,
      campaigns.items,
      period,
      today
    ]
  )

  const money = (cents: number) => display.format(cents).text
  const columns: DataColumn<ProjectRow>[] = [
    {
      id: 'project',
      header: t('project'),
      cell: (r) => r.name ?? <em>{t('unallocatedName')}</em>,
      sortValue: (r) => r.name ?? ''
    },
    {
      id: 'income',
      header: t('income'),
      cell: (r) => money(r.incomeCents),
      sortValue: (r) => r.incomeCents,
      align: 'right'
    },
    {
      id: 'expenses',
      header: t('expenses'),
      cell: (r) => money(r.expenseCents),
      sortValue: (r) => r.expenseCents,
      align: 'right'
    },
    {
      id: 'balance',
      header: t('balance'),
      cell: (r) => money(r.balanceCents),
      sortValue: (r) => r.balanceCents,
      align: 'right'
    }
  ]

  return (
    <div className="grid gap-6">
      <PeriodPicker value={period} onChange={setPeriod} />
      {!valid && (
        <p role="alert" className="text-sm text-destructive">
          {t('invalidPeriod')}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title={t('income')} eurCents={overview?.incomeCents} loading={loading} />
        <KpiCard title={t('expenses')} eurCents={overview?.expenseCents} loading={loading} />
        <KpiCard title={t('balance')} eurCents={overview?.balanceCents} loading={loading} />
        <KpiCard
          title={t('fixedCosts')}
          eurCents={overview?.fixedCostsCents}
          loading={loading}
          hint={t('fixedCostsHint', { date: fmt.date(today) })}
        />
      </div>

      {overview && overview.unallocatedCount > 0 && (
        <p role="status" className="text-sm text-destructive">
          {t('unallocatedWarning', { count: overview.unallocatedCount })}
        </p>
      )}
      {overview && overview.ledgerErrors.length > 0 && (
        <p role="alert" className="text-sm text-destructive">
          {t('ledgerErrors', { count: overview.ledgerErrors.length })}
        </p>
      )}
      {overview && overview.fixedCostErrors.length > 0 && (
        <p role="alert" className="text-sm text-destructive">
          {t('fixedCostErrors', { count: overview.fixedCostErrors.length })}
        </p>
      )}

      <section className="grid gap-2">
        <h2 className="text-lg font-semibold">{t('projectsBySaldo')}</h2>
        <DataTable
          caption={t('projectsBySaldo')}
          columns={columns}
          rows={overview?.rows ?? []}
          getRowId={(r) => r.projectId ?? 'unallocated'}
          initialSort={{ columnId: 'balance', direction: 'desc' }}
          loading={loading}
          error={errorText}
          onRetry={reload}
          empty={t('noProjects')}
        />
      </section>
    </div>
  )
}
