import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { aggregate } from '@core/aggregate/aggregate'
import type { LedgerEntry } from '@core/ledger/ledger'
import type { Project } from '@shared/schemas/project'
import { DataTable, KpiCard, PeriodPicker, periodFor, type DataColumn } from '@/components/data'
import { useListLabel } from '@/components/forms'
import { LedgerWarnings, todayIso, useProjectLedger } from '@/components/ledger'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast-context'
import { useDisplayCurrency } from '@/hooks'
import { useFormat, useT } from '@/i18n'
import { projectPhaseDict } from '@/i18n/shared-keys'
import { ProjectTab as CampaignsTab } from '@/features/campaigns/ProjectTab'
import { ProjectTab as MetricsTab } from '@/features/metrics/ProjectTab'
import { ProjectTab as PeopleTab } from '@/features/people/ProjectTab'
import { ProjectTab as StatsTab } from '@/features/stats/ProjectTab'
import { projectsDict } from './i18n'
import { isHttpUrl, projectBookings, projectServiceRows, type ServiceRow } from './logic'

/** Detailseite `/projects/:id` mit Reitern (AP-12). */
export function ProjectDetailPage() {
  const { id = '' } = useParams()
  const tp = useT(projectsDict)
  const today = todayIso()
  const [period, setPeriod] = useState(() => periodFor('year', today))
  const state = useProjectLedger(period, today)
  const project = state.projects.find((p) => p.id === id)

  if (state.loading) return <p className="text-sm text-muted-foreground">…</p>
  if (state.errorText) {
    return (
      <p role="alert" className="text-destructive">
        {state.errorText}
      </p>
    )
  }
  if (!project) {
    return (
      <div className="grid gap-3">
        <p>{tp('notFound')}</p>
        <Link to="/projects" className="text-primary hover:underline">
          {tp('back')}
        </Link>
      </div>
    )
  }

  return (
    <DetailBody
      project={project}
      period={period}
      onPeriod={setPeriod}
      today={today}
      state={state}
    />
  )
}

type State = ReturnType<typeof useProjectLedger>

function DetailBody({
  project,
  period,
  onPeriod,
  today,
  state
}: {
  project: Project
  period: ReturnType<typeof periodFor>
  onPeriod: (p: ReturnType<typeof periodFor>) => void
  today: string
  state: State
}) {
  const tp = useT(projectsDict)
  const tPhase = useT(projectPhaseDict)
  const [tab, setTab] = useState('overview')
  const entries = state.ledger?.entries ?? []

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {tp('back')}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <Badge variant="outline">{tPhase(project.phase)}</Badge>
          {project.archived && <Badge variant="secondary">{tp('archivedBadge')}</Badge>}
        </div>
      </div>

      <PeriodPicker value={period} onChange={onPeriod} />
      <LedgerWarnings ledger={state.ledger} fixedCosts={state.fixedCosts} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label={tp('tabsLabel')}>
          <TabsTrigger value="overview">{tp('tabOverview')}</TabsTrigger>
          <TabsTrigger value="services">{tp('tabServices')}</TabsTrigger>
          <TabsTrigger value="bookings">{tp('tabBookings')}</TabsTrigger>
          <TabsTrigger value="people">{tp('tabPeople')}</TabsTrigger>
          <TabsTrigger value="campaigns">{tp('tabCampaigns')}</TabsTrigger>
          <TabsTrigger value="users">{tp('tabUsers')}</TabsTrigger>
          <TabsTrigger value="stats">{tp('tabStats')}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <OverviewTab project={project} entries={entries} state={state} />
        </TabsContent>
        <TabsContent value="services">
          <ServicesTab project={project} entries={entries} state={state} today={today} />
        </TabsContent>
        <TabsContent value="bookings">
          <BookingsTab project={project} entries={entries} state={state} />
        </TabsContent>
        <TabsContent value="people">
          <PeopleTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="campaigns">
          <CampaignsTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="users">
          <MetricsTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="stats">
          <StatsTab projectId={project.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function OverviewTab({
  project,
  entries,
  state
}: {
  project: Project
  entries: readonly LedgerEntry[]
  state: State
}) {
  const tp = useT(projectsDict)
  const fmt = useFormat()
  const platformLabel = useListLabel('projectPlatforms')
  const { toast } = useToast()
  const total = useMemo(
    () => aggregate(entries, { groupBy: 'project', filter: { projectIds: [project.id] } }).total,
    [entries, project.id]
  )
  const fixed = state.fixedCosts?.byProject.find((p) => p.projectId === project.id)?.cents ?? 0
  const ready = state.ledger !== null

  const openLink = async (url: string) => {
    if (!isHttpUrl(url)) return
    let ok = false
    try {
      ok = (await window.api.shell.openExternal(url)).ok
    } catch {
      ok = false
    }
    if (!ok) toast({ title: tp('openFailed'), variant: 'destructive' })
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title={tp('kpiIncome')}
          eurCents={total.incomeCents}
          loading={!ready}
          hint={tp('periodHint')}
        />
        <KpiCard
          title={tp('kpiExpense')}
          eurCents={total.expenseCents}
          loading={!ready}
          hint={tp('periodHint')}
        />
        <KpiCard
          title={tp('kpiBalance')}
          eurCents={total.balanceCents}
          loading={!ready}
          hint={tp('periodHint')}
        />
        <KpiCard title={tp('kpiFixed')} eurCents={fixed} hint={tp('kpiFixedHint')} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{tp('details')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          {project.description && <p className="whitespace-pre-wrap">{project.description}</p>}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-muted-foreground">{tp('fPlatforms')}</dt>
            <dd>{project.platforms.map(platformLabel).join(', ') || '–'}</dd>
            <dt className="text-muted-foreground">{tp('start')}</dt>
            <dd>{fmt.date(project.startDate)}</dd>
            <dt className="text-muted-foreground">{tp('end')}</dt>
            <dd>{project.endDate ? fmt.date(project.endDate) : '–'}</dd>
          </dl>
          <div className="flex flex-wrap gap-2">
            {project.links.length === 0 && (
              <span className="text-muted-foreground">{tp('noLinks')}</span>
            )}
            {project.links.map((link, index) => {
              const label = link.label || link.url
              return (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  disabled={!isHttpUrl(link.url)}
                  title={tp('openLink', { label })}
                  onClick={() => void openLink(link.url)}
                >
                  <ExternalLink aria-hidden="true" />
                  {label}
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ServicesTab({
  project,
  entries,
  state,
  today
}: {
  project: Project
  entries: readonly LedgerEntry[]
  state: State
  today: string
}) {
  const tp = useT(projectsDict)
  const fmt = useFormat()
  const display = useDisplayCurrency()
  const rows = useMemo(
    () => projectServiceRows(state.services, state.projects, project.id, entries, today),
    [state.services, state.projects, project.id, entries, today]
  )
  const columns: DataColumn<ServiceRow>[] = [
    {
      id: 'provider',
      header: tp('svcProvider'),
      sortValue: (r) => r.service.provider,
      cell: (r) => r.service.provider
    },
    { id: 'purpose', header: tp('svcPurpose'), cell: (r) => r.service.purpose },
    { id: 'plan', header: tp('svcPlan'), cell: (r) => r.service.plan },
    {
      id: 'share',
      header: tp('svcShare'),
      align: 'right',
      sortValue: (r) => r.share ?? 0,
      cell: (r) => (r.share === null ? '–' : fmt.percent(r.share, 2))
    },
    {
      id: 'cost',
      header: tp('svcCost'),
      align: 'right',
      sortValue: (r) => r.costCents,
      cell: (r) => display.format(r.costCents).text
    }
  ]
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(r) => r.service.id}
      empty={tp('svcEmpty')}
      caption={tp('tabServices')}
    />
  )
}

function BookingsTab({
  project,
  entries,
  state
}: {
  project: Project
  entries: readonly LedgerEntry[]
  state: State
}) {
  const tp = useT(projectsDict)
  const fmt = useFormat()
  const display = useDisplayCurrency()
  const expenseLabel = useListLabel('expenseCategories')
  const incomeLabel = useListLabel('incomeCategories')
  const rows = useMemo(() => projectBookings(entries, project.id), [entries, project.id])
  const serviceName = (e: LedgerEntry): string | undefined =>
    e.serviceId ? state.services.find((s) => s.id === e.serviceId)?.provider : undefined

  const columns: DataColumn<LedgerEntry>[] = [
    {
      id: 'date',
      header: tp('bkDate'),
      sortValue: (e) => e.date,
      cell: (e) => fmt.date(e.date)
    },
    {
      id: 'kind',
      header: tp('bkKind'),
      sortValue: (e) => e.kind,
      cell: (e) => (e.kind === 'income' ? tp('kindIncome') : tp('kindExpense'))
    },
    {
      id: 'category',
      header: tp('bkCategory'),
      sortValue: (e) => e.category,
      cell: (e) => (e.kind === 'income' ? incomeLabel(e.category) : expenseLabel(e.category))
    },
    {
      id: 'origin',
      header: tp('bkOrigin'),
      cell: (e) => {
        const base =
          e.sourceType === 'campaign'
            ? tp('sourceCampaign')
            : e.sourceType === 'income'
              ? tp('sourceIncome')
              : tp('sourceExpense')
        const name = serviceName(e)
        return name ? `${base} · ${tp('sourceService', { name })}` : base
      }
    },
    {
      id: 'amount',
      header: tp('bkAmount'),
      align: 'right',
      sortValue: (e) => (e.kind === 'income' ? e.eurCents : -e.eurCents),
      cell: (e) => {
        const text = display.format(e.kind === 'income' ? e.eurCents : -e.eurCents).text
        return e.original.currency === 'EUR' ? (
          text
        ) : (
          <span title={`${tp('bkOriginal')}: ${fmt.money(e.original.cents, e.original.currency)}`}>
            {text}
          </span>
        )
      }
    }
  ]
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(e) => `${e.sourceType}:${e.sourceId}:${e.date}:${e.projectId}`}
      loading={state.ledger === null}
      empty={tp('bkEmpty')}
      caption={tp('tabBookings')}
    />
  )
}
