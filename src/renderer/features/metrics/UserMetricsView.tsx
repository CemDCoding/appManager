import { useMemo, useState } from 'react'
import { userMetrics } from '@core/metrics/metrics'
import type { UserMetric } from '@shared/schemas/userMetric'
import { LineChartSeries } from '@/components/charts'
import { DataTable, KpiCard, PeriodPicker, periodFor, type DataColumn } from '@/components/data'
import { ConfirmDialog } from '@/components/forms/ConfirmDialog'
import { useListLabel } from '@/components/forms/CategorySelect'
import { Button } from '@/components/ui/button'
import { useCollection } from '@/hooks/useCollection'
import { useEntityMutation } from '@/hooks/useEntityMutation'
import { useFormat, useT } from '@/i18n'
import { LedgerWarnings } from '@/pages/projects/LedgerWarnings'
import { todayIso } from '@/pages/projects/logic'
import { useProjectLedger } from '@/pages/projects/useProjectLedger'
import { metricsDict } from './i18n'
import { chartSeries, projectSnapshots } from './logic'
import { SnapshotDialog } from './SnapshotDialog'

/** Nutzerzahlen eines Projekts: Stichtage, Verlauf, Kennzahlen (F-13, PE-38, PE-52). */
export function UserMetricsView({ projectId }: { projectId: string }) {
  const t = useT(metricsDict)
  const fmt = useFormat()
  const platformLabel = useListLabel('projectPlatforms')
  const today = todayIso()
  const [period, setPeriod] = useState(() => periodFor('year', today))
  const state = useProjectLedger(period, today)
  const snapshotsState = useCollection('userMetrics')
  const campaigns = useCollection('campaigns')
  const { remove, errorText: removeError, reset } = useEntityMutation('userMetrics')
  const [dialog, setDialog] = useState<{ open: boolean; snapshot?: UserMetric }>({ open: false })
  const [deleting, setDeleting] = useState<UserMetric | null>(null)

  const project = state.projects.find((p) => p.id === projectId)
  const rows = useMemo(
    () => projectSnapshots(snapshotsState.items, projectId),
    [snapshotsState.items, projectId]
  )

  const metrics = useMemo(() => {
    if (!state.ledger || campaigns.loading || campaigns.errorText) return null
    try {
      return userMetrics(
        snapshotsState.items,
        state.ledger,
        campaigns.items,
        projectId,
        { from: period.from, to: period.to },
        state.projects
      )
    } catch {
      return null
    }
  }, [
    snapshotsState.items,
    state.ledger,
    state.projects,
    campaigns.items,
    campaigns.loading,
    campaigns.errorText,
    projectId,
    period.from,
    period.to
  ])

  const series = useMemo(
    () =>
      chartSeries(rows, {
        total: t('seriesTotal'),
        active: t('seriesActive'),
        paying: t('seriesPaying')
      }),
    [rows, t]
  )

  const loading = state.loading || snapshotsState.loading
  const loadError = state.errorText ?? snapshotsState.errorText ?? campaigns.errorText
  if (loadError) {
    return (
      <p role="alert" className="text-destructive">
        {loadError}
      </p>
    )
  }

  const columns: DataColumn<UserMetric>[] = [
    {
      id: 'date',
      header: t('colDate'),
      sortValue: (m) => m.date,
      cell: (m) => fmt.date(m.date)
    },
    {
      id: 'total',
      header: t('colTotal'),
      align: 'right',
      sortValue: (m) => m.usersTotal,
      cell: (m) => fmt.number(m.usersTotal)
    },
    {
      id: 'active',
      header: t('colActive'),
      align: 'right',
      sortValue: (m) => m.usersActive,
      cell: (m) => fmt.number(m.usersActive)
    },
    {
      id: 'paying',
      header: t('colPaying'),
      align: 'right',
      sortValue: (m) => m.usersPaying,
      cell: (m) => fmt.number(m.usersPaying)
    },
    {
      id: 'platforms',
      header: t('colPlatforms'),
      cell: (m) =>
        m.perPlatform && m.perPlatform.length > 0
          ? m.perPlatform
              .map((p) => `${platformLabel(p.platform)}: ${fmt.number(p.users)}`)
              .join(', ')
          : '–'
    },
    {
      id: 'actions',
      header: t('colActions'),
      align: 'right',
      cell: (m) => (
        <span className="inline-flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialog({ open: true, snapshot: m })}
          >
            {t('edit')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              reset()
              setDeleting(m)
            }}
          >
            {t('remove')}
          </Button>
        </span>
      )
    }
  ]

  const latest = metrics?.latest ?? null
  const dash = '–'
  const waiting = loading || (metrics === null && state.ledger === null)

  return (
    <div className="grid gap-4">
      <PeriodPicker value={period} onChange={setPeriod} />
      <LedgerWarnings ledger={state.ledger} />
      {state.ledger === null && !loading && (
        <p role="alert" className="text-sm text-destructive">
          {t('invalidPeriod')}
        </p>
      )}
      {state.ledger !== null && metrics === null && !loading && (
        <p role="alert" className="text-sm text-destructive">
          {t('metricsError')}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          title={t('kpiLatest')}
          value={latest ? fmt.number(latest.usersTotal) : dash}
          loading={waiting}
          hint={
            latest
              ? t('kpiLatestHint', {
                  date: fmt.date(latest.date),
                  active: fmt.number(latest.usersActive),
                  paying: fmt.number(latest.usersPaying)
                })
              : undefined
          }
        />
        <KpiCard
          title={t('kpiGrowth')}
          value={metrics?.growth != null ? fmt.number(metrics.growth) : dash}
          loading={waiting}
        />
        {metrics?.costPerUserCents != null ? (
          <KpiCard
            title={t('kpiCostPerUser')}
            eurCents={metrics.costPerUserCents}
            hint={t('kpiCostPerUserHint')}
          />
        ) : (
          <KpiCard
            title={t('kpiCostPerUser')}
            value={dash}
            loading={waiting}
            hint={t('kpiCostPerUserHint')}
          />
        )}
        {metrics?.incomePerPayingUserCents != null ? (
          <KpiCard
            title={t('kpiIncomePerPaying')}
            eurCents={metrics.incomePerPayingUserCents}
            hint={t('kpiIncomePerPayingHint')}
          />
        ) : (
          <KpiCard
            title={t('kpiIncomePerPaying')}
            value={dash}
            loading={waiting}
            hint={t('kpiIncomePerPayingHint')}
          />
        )}
        <KpiCard
          title={t('kpiCampaignShare')}
          value={
            metrics?.campaignShareBasisPoints != null
              ? fmt.percent(metrics.campaignShareBasisPoints / 10000, 2)
              : dash
          }
          loading={waiting}
          hint={t('kpiCampaignShareHint', { count: fmt.number(metrics?.campaignUsers ?? 0) })}
        />
      </div>

      <LineChartSeries title={t('chartTitle')} series={series} valueKind="number" xKind="date" />

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t('snapshots')}</h2>
          <Button onClick={() => setDialog({ open: true })}>{t('addSnapshot')}</Button>
        </div>
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(m) => m.id}
          loading={loading}
          empty={t('empty')}
          caption={t('snapshots')}
        />
      </div>

      <SnapshotDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        projectId={projectId}
        platforms={project?.platforms ?? []}
        snapshot={dialog.snapshot}
        today={today}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        destructive
        title={t('deleteTitle')}
        description={deleting ? t('deleteText', { date: fmt.date(deleting.date) }) : undefined}
        confirmLabel={t('remove')}
        error={removeError}
        onConfirm={async () => {
          if (!deleting) return
          const res = await remove(deleting.id)
          if (!res.ok) return false
          setDeleting(null)
        }}
      />
    </div>
  )
}
