import { useMemo, useState } from 'react'
import type { Goal } from '@shared/schemas/goal'
import { Sparkline } from '@/components/charts'
import { ConfirmDialog } from '@/components/forms/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { useCollection } from '@/hooks/useCollection'
import { useEntityMutation } from '@/hooks/useEntityMutation'
import { useDisplayCurrency } from '@/state/DisplayCurrencyProvider'
import { useFormat, useT } from '@/i18n'
import { LedgerWarnings } from '@/pages/projects/LedgerWarnings'
import { buildGoalView, withDone, type GoalRow } from './goal-logic'
import { GoalDialog } from './GoalDialog'
import { goalsDict, type GoalsKey } from './i18n'

const STATUS_KEY: Record<GoalRow['progress']['status'], GoalsKey> = {
  open: 'statusOpen',
  achieved: 'statusAchieved',
  missed: 'statusMissed'
}
const STATUS_VARIANT = {
  open: 'secondary',
  achieved: 'default',
  missed: 'destructive'
} as const

/** Ziele der Startseite: Fortschritt je Portfolio/Projekt, Anlegen, Bearbeiten, Abhaken (F-12). */
export function GoalsSection({ today }: { today: string }) {
  const t = useT(goalsDict)
  const tc = useT()
  const goals = useCollection('goals')
  const projects = useCollection('projects')
  const expenses = useCollection('expenses')
  const incomes = useCollection('incomes')
  const campaigns = useCollection('campaigns')
  const userMetrics = useCollection('userMetrics')
  const sources = [goals, projects, expenses, incomes, campaigns, userMetrics]
  const loading = sources.some((s) => s.loading)
  const errorText = sources.find((s) => s.errorText)?.errorText ?? null
  const { update, remove, errorText: mutationError, reset } = useEntityMutation('goals')
  const [dialog, setDialog] = useState<{ open: boolean; goal?: Goal }>({ open: false })
  const [deleting, setDeleting] = useState<Goal | null>(null)

  const view = useMemo(
    () =>
      loading || errorText
        ? null
        : buildGoalView(
            {
              goals: goals.items,
              projects: projects.items,
              expenses: expenses.items,
              incomes: incomes.items,
              campaigns: campaigns.items,
              userMetrics: userMetrics.items
            },
            today
          ),
    [
      loading,
      errorText,
      goals.items,
      projects.items,
      expenses.items,
      incomes.items,
      campaigns.items,
      userMetrics.items,
      today
    ]
  )
  const failed = !loading && !errorText && view === null

  return (
    <section className="grid gap-3" aria-labelledby="goals-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="goals-heading" className="text-lg font-semibold">
          {t('title')}
        </h2>
        <div className="flex items-center gap-3">
          {view && (
            <span title={t('balanceTrendTitle')}>
              <Sparkline values={view.balanceSeries} label={t('balanceTrend')} />
            </span>
          )}
          <Button
            size="sm"
            onClick={() => {
              reset()
              setDialog({ open: true })
            }}
          >
            {t('add')}
          </Button>
        </div>
      </div>

      {errorText && (
        <p role="alert" className="text-sm text-destructive">
          {errorText}
        </p>
      )}
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          {t('computeFailed')}
        </p>
      )}
      {view && <LedgerWarnings ledger={view.ledger} />}
      {view && view.forecast.errors.length > 0 && (
        <p role="alert" className="text-sm text-destructive">
          {t('forecastErrors', { count: view.forecast.errors.length })}
        </p>
      )}
      {mutationError && !dialog.open && (
        <p role="alert" className="text-sm text-destructive">
          {mutationError}
        </p>
      )}
      {view && view.groups.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      )}

      {view?.groups.map((group) => (
        <div key={group.projectId ?? 'portfolio'} className="grid gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            {group.name ?? t('portfolio')}
          </h3>
          <ul className="grid gap-2">
            {group.rows.map((row) => (
              <li key={row.goal.id} className="rounded-md border p-3">
                <GoalItem
                  row={row}
                  onEdit={() => {
                    reset()
                    setDialog({ open: true, goal: row.goal })
                  }}
                  onDelete={() => {
                    reset()
                    setDeleting(row.goal)
                  }}
                  onToggle={(done) => void update(row.goal.id, withDone(row.goal, done))}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}

      <GoalDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        projects={projects.items}
        goal={dialog.goal}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        destructive
        title={t('deleteTitle', { title: deleting?.title ?? '' })}
        description={t('deleteText')}
        confirmLabel={tc('common.delete')}
        error={mutationError}
        onConfirm={async () => (deleting ? (await remove(deleting.id)).ok : true)}
      />
    </section>
  )
}

interface GoalItemProps {
  row: GoalRow
  onEdit: () => void
  onDelete: () => void
  onToggle: (done: boolean) => void
}

function GoalItem({ row, onEdit, onDelete, onToggle }: GoalItemProps) {
  const t = useT(goalsDict)
  const tc = useT()
  const fmt = useFormat()
  const display = useDisplayCurrency()
  const { goal, progress } = row
  const money = (cents: number) => display.format(cents).text
  const costLimit = goal.kind === 'costLimit'

  let detail: string
  switch (goal.kind) {
    case 'revenue':
      detail = t('progressOf', { value: money(progress.value), target: money(progress.target) })
      break
    case 'users':
      detail = t('progressOf', {
        value: fmt.number(progress.value),
        target: fmt.number(progress.target)
      })
      break
    case 'costLimit':
      detail = t('usedOf', { value: money(progress.value), target: money(progress.target) })
      break
    case 'breakEven':
      detail = t('breakEvenAmounts', {
        value: money(progress.value),
        target: money(progress.target)
      })
      break
    case 'free':
      detail = ''
      break
  }

  let breakEvenText: string | null = null
  if (row.breakEven !== undefined) {
    const be = row.breakEven
    breakEvenText =
      typeof be === 'string'
        ? t('breakEvenNotInSight')
        : 'reachedAt' in be
          ? t('breakEvenReached', {
              month: fmt.date(`${be.reachedAt}-01`, { month: 'long', year: 'numeric' })
            })
          : t('breakEvenExpected', {
              month: fmt.date(`${be.expectedAt}-01`, { month: 'long', year: 'numeric' })
            })
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {goal.kind === 'free' && (
            <Checkbox
              aria-label={t('markDone', { title: goal.title })}
              checked={goal.done}
              onCheckedChange={onToggle}
            />
          )}
          <span className="font-medium">{goal.title}</span>
          <Badge variant={STATUS_VARIANT[progress.status]}>{t(STATUS_KEY[progress.status])}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-2 text-xs text-muted-foreground">
            {goal.dueDate ? t('due', { date: fmt.date(goal.dueDate) }) : t('noDue')}
          </span>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            {tc('common.edit')}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            {tc('common.delete')}
          </Button>
        </div>
      </div>
      {goal.kind !== 'free' && (
        <>
          <Progress
            value={progress.ratio / 100}
            aria-label={
              costLimit
                ? t('usedPercent', { percent: fmt.percent(progress.ratio / 10_000) })
                : goal.title
            }
          />
          <p className="text-xs text-muted-foreground">
            {detail}
            {costLimit &&
              ` (${t('usedPercent', { percent: fmt.percent(progress.ratio / 10_000) })})`}
            {!costLimit && ` (${fmt.percent(progress.ratio / 10_000)})`}
            {breakEvenText && ` · ${breakEvenText}`}
          </p>
        </>
      )}
    </div>
  )
}
