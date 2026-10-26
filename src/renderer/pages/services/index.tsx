import { useMemo, useState } from 'react'
import type { Service } from '@shared/schemas/service'
import { DataTable, type DataColumn } from '@/components/data'
import { ConfirmDialog, FieldMessage } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useCollection, useDisplayCurrency, useEntityMutation } from '@/hooks'
import { useT } from '@/i18n'
import { PURPOSE_KEYS, servicesDict } from './i18n'
import { ServiceCostDialog } from './ServiceCostDialog'
import { ServiceCostsDialog } from './ServiceCostsDialog'
import { ServiceDialog } from './ServiceDialog'
import { expensesOfService, groupServices, serviceMonthlyCosts } from './service-logic'

/** Heutiges Datum als "YYYY-MM-DD" (lokale Zeit). */
function todayIso(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Dienste (F-02): Liste nach Zweck, Dialoge für Anlegen, Kosten und Löschen (PE-35). */
export function ServicesPage() {
  const tc = useT()
  const tp = useT(servicesDict)
  const display = useDisplayCurrency()
  const services = useCollection('services')
  const expenses = useCollection('expenses')
  const projects = useCollection('projects')
  const { remove, errorText, reset } = useEntityMutation('services', { invalidates: ['expenses'] })

  const today = useMemo(() => todayIso(), [])
  const [editing, setEditing] = useState<Service | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [costsFor, setCostsFor] = useState<string | null>(null)
  const [addCostFor, setAddCostFor] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Service | null>(null)
  const [cascade, setCascade] = useState(false)

  const monthly = useMemo(
    () => serviceMonthlyCosts(services.items, expenses.items, projects.items, today),
    [services.items, expenses.items, projects.items, today]
  )
  const groups = useMemo(() => groupServices(services.items), [services.items])
  const names = useMemo(() => new Map(projects.items.map((p) => [p.id, p.name])), [projects.items])
  const errorCount = [...monthly.values()].reduce((n, m) => n + m.errors.length, 0)
  const costsService = services.items.find((s) => s.id === costsFor) ?? null
  const addCostService = services.items.find((s) => s.id === addCostFor) ?? null
  const deletingCosts = deleting ? expensesOfService(expenses.items, deleting.id).length : 0

  const projectsText = (s: Service): string =>
    s.allocation.mode === 'all'
      ? tp('allActive')
      : s.allocation.shares.map((sh) => names.get(sh.projectId) ?? sh.projectId).join(', ') ||
        tp('noProjects')

  const columns: DataColumn<Service>[] = [
    {
      id: 'provider',
      header: tp('colProvider'),
      cell: (s) => (
        <button
          type="button"
          className="font-medium underline-offset-4 hover:underline"
          onClick={() => setCostsFor(s.id)}
        >
          {s.provider}
        </button>
      ),
      sortValue: (s) => s.provider
    },
    { id: 'plan', header: tp('colPlan'), cell: (s) => s.plan, sortValue: (s) => s.plan },
    { id: 'projects', header: tp('colProjects'), cell: projectsText },
    {
      id: 'costs',
      header: tp('colCostsMonth'),
      align: 'right',
      cell: (s) => display.format(monthly.get(s.id)?.totalCents ?? 0).text,
      sortValue: (s) => monthly.get(s.id)?.totalCents ?? 0
    },
    {
      id: 'actions',
      header: tp('colActions'),
      align: 'right',
      cell: (s) => (
        <span className="inline-flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditing(s)
              setFormOpen(true)
            }}
          >
            {tp('editShort')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              reset()
              setCascade(false)
              setDeleting(s)
            }}
          >
            {tc('common.delete')}
          </Button>
        </span>
      )
    }
  ]

  return (
    <div className="grid gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{tp('title')}</h1>
          <p className="text-sm text-muted-foreground">{tp('intro')}</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          {tp('add')}
        </Button>
      </header>
      <FieldMessage>{tp('costsHint')}</FieldMessage>
      {errorCount > 0 && (
        <FieldMessage error>{tp('costErrors', { count: errorCount })}</FieldMessage>
      )}
      {groups.length === 0 ? (
        <DataTable
          columns={columns}
          rows={[]}
          getRowId={(s: Service) => s.id}
          loading={services.loading}
          error={services.errorText}
          onRetry={() => void services.reload()}
          empty={<p className="p-4 text-sm text-muted-foreground">{tp('empty')}</p>}
        />
      ) : (
        groups.map((g) => (
          <section key={g.purpose} aria-labelledby={`grp-${g.purpose}`} className="grid gap-2">
            <h2 id={`grp-${g.purpose}`} className="text-lg font-medium">
              {tp(PURPOSE_KEYS[g.purpose])}
            </h2>
            <DataTable
              columns={columns}
              rows={g.services}
              getRowId={(s) => s.id}
              initialSort={{ columnId: 'provider', direction: 'asc' }}
              caption={tp(PURPOSE_KEYS[g.purpose])}
            />
          </section>
        ))
      )}

      {formOpen && (
        <ServiceDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          service={editing}
          projects={projects.items}
          today={today}
        />
      )}
      {costsService && (
        <ServiceCostsDialog
          open
          onOpenChange={(o) => !o && setCostsFor(null)}
          service={costsService}
          expenses={expensesOfService(expenses.items, costsService.id)}
          projects={projects.items}
          monthly={monthly.get(costsService.id)}
          onAddCost={() => setAddCostFor(costsService.id)}
        />
      )}
      {addCostService && (
        <ServiceCostDialog
          open
          onOpenChange={(o) => !o && setAddCostFor(null)}
          service={addCostService}
          projects={projects.items}
          today={today}
        />
      )}
      {deleting && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setDeleting(null)}
          destructive
          title={tp('deleteTitle', { name: deleting.provider })}
          description={
            deletingCosts > 0
              ? tp('deleteDescription', { count: deletingCosts })
              : tp('deleteDescriptionNone')
          }
          confirmLabel={tc('common.delete')}
          error={errorText}
          onConfirm={async () => {
            const res = await remove(deleting.id, { cascade })
            if (res.ok) setDeleting(null)
            return res.ok
          }}
        >
          {deletingCosts > 0 && (
            <RadioGroup
              value={cascade ? 'cascade' : 'keep'}
              onValueChange={(v) => setCascade(v === 'cascade')}
              aria-label={tp('deleteOptions')}
              className="grid gap-2"
            >
              <Label>
                <RadioGroupItem value="keep" /> {tp('deleteKeep')}
              </Label>
              <Label>
                <RadioGroupItem value="cascade" /> {tp('deleteCascade')}
              </Label>
            </RadioGroup>
          )}
        </ConfirmDialog>
      )}
    </div>
  )
}
