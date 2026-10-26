import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { PROJECT_PHASES, type ProjectPhase } from '@shared/lists'
import type { Project } from '@shared/schemas/project'
import { ConfirmDialog, useListLabel } from '@/components/forms'
import { DataTable, type DataColumn } from '@/components/data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast-context'
import { useDisplayCurrency, useEntityMutation } from '@/hooks'
import { useT } from '@/i18n'
import { projectPhaseDict } from '@/i18n/shared-keys'
import { LedgerWarnings } from './LedgerWarnings'
import { ProjectFormDialog } from './ProjectFormDialog'
import { projectsDict } from './i18n'
import { balanceByProject, filterProjects, todayIso, withArchived } from './logic'
import { projectDetailPath } from './paths'
import { useProjectLedger } from './useProjectLedger'

/** Projektliste (F-01): Name, Plattformen, Phase, Saldo des aktuellen Jahres. */
export function ProjectsPage() {
  const tp = useT(projectsDict)
  const tc = useT()
  const tPhase = useT(projectPhaseDict)
  const platformLabel = useListLabel('projectPlatforms')
  const display = useDisplayCurrency()
  const { toast } = useToast()
  const today = todayIso()
  const year = today.slice(0, 4)
  const state = useProjectLedger({ from: `${year}-01-01`, to: `${year}-12-31` }, today)
  const { update, remove, errorText, reset } = useEntityMutation('projects', {
    messages: { IN_USE: tp('inUse') }
  })

  const [phase, setPhase] = useState<ProjectPhase | 'all'>('all')
  const [showArchived, setShowArchived] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Project | undefined>()
  const [deleting, setDeleting] = useState<Project | null>(null)

  const rows = useMemo(
    () => filterProjects(state.projects, { phase, showArchived }),
    [state.projects, phase, showArchived]
  )
  const balances = useMemo(
    () => (state.ledger ? balanceByProject(state.ledger.entries) : null),
    [state.ledger]
  )

  const openForm = (project?: Project) => {
    setEditing(project)
    setFormOpen(true)
  }

  const toggleArchive = async (project: Project) => {
    const next = !project.archived
    const result = await update(project.id, withArchived(project, next))
    toast({
      title: result.ok ? tp(next ? 'archived' : 'unarchived') : tp('saveFailed'),
      variant: result.ok ? 'default' : 'destructive'
    })
  }

  const columns: DataColumn<Project>[] = [
    {
      id: 'name',
      header: tp('colName'),
      sortValue: (p) => p.name,
      cell: (p) => (
        <span className="flex items-center gap-2">
          <Link to={projectDetailPath(p.id)} className="font-medium hover:underline">
            {p.name}
          </Link>
          {p.archived && <Badge variant="secondary">{tp('archivedBadge')}</Badge>}
        </span>
      )
    },
    {
      id: 'platforms',
      header: tp('colPlatforms'),
      cell: (p) => p.platforms.map(platformLabel).join(', ')
    },
    {
      id: 'phase',
      header: tp('colPhase'),
      sortValue: (p) => PROJECT_PHASES.indexOf(p.phase),
      cell: (p) => <Badge variant="outline">{tPhase(p.phase)}</Badge>
    },
    {
      id: 'balance',
      header: tp('colBalance', { year }),
      align: 'right',
      sortValue: (p) => balances?.get(p.id) ?? 0,
      cell: (p) => {
        if (!balances) return '–'
        const cents = balances.get(p.id) ?? 0
        return (
          <span className={cents < 0 ? 'text-destructive' : undefined}>
            {display.format(cents).text}
          </span>
        )
      }
    },
    {
      id: 'actions',
      header: tp('colActions'),
      align: 'right',
      cell: (p) => (
        <span className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => openForm(p)}>
            {tp('edit')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void toggleArchive(p)}>
            {p.archived ? tp('unarchive') : tp('archive')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              reset()
              setDeleting(p)
            }}
          >
            {tp('delete')}
          </Button>
        </span>
      )
    }
  ]

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{tp('title')}</h1>
        <Button onClick={() => openForm()}>
          <Plus aria-hidden="true" />
          {tp('newProject')}
        </Button>
      </div>

      <LedgerWarnings ledger={state.ledger} />
      {display.converted && (
        <p className="text-xs text-muted-foreground">{tp('balanceHint', { year })}</p>
      )}

      <DataTable
        rows={rows}
        getRowId={(p) => p.id}
        columns={columns}
        initialSort={{ columnId: 'name', direction: 'asc' }}
        loading={state.loading}
        error={state.errorText}
        onRetry={() => void state.reload()}
        filtered={phase !== 'all' || (!showArchived && state.projects.some((p) => p.archived))}
        empty={tp('emptyList')}
        caption={tp('title')}
        filters={
          <>
            <div className="grid gap-1">
              <Label htmlFor="projects-phase-filter">{tp('filterPhase')}</Label>
              <Select
                id="projects-phase-filter"
                value={phase}
                className="w-48"
                onValueChange={(v) => setPhase(PROJECT_PHASES.find((p) => p === v) ?? 'all')}
              >
                <option value="all">{tp('allPhases')}</option>
                {PROJECT_PHASES.map((p) => (
                  <option key={p} value={p}>
                    {tPhase(p)}
                  </option>
                ))}
              </Select>
            </div>
            <Label htmlFor="projects-show-archived" className="h-9">
              <Checkbox
                id="projects-show-archived"
                checked={showArchived}
                onCheckedChange={setShowArchived}
              />
              {tp('showArchived')}
            </Label>
          </>
        }
      />

      <ProjectFormDialog open={formOpen} onOpenChange={setFormOpen} project={editing} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        destructive
        title={tp('deleteTitle', { name: deleting?.name ?? '' })}
        description={tp('deleteText')}
        confirmLabel={tc('common.delete')}
        error={errorText}
        onConfirm={async () => {
          if (!deleting) return false
          const result = await remove(deleting.id)
          if (result.ok) toast({ title: tp('deleted') })
          return result.ok
        }}
      />
    </div>
  )
}
