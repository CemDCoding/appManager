import { useState, type FormEvent } from 'react'
import type { Goal } from '@shared/schemas/goal'
import type { Project } from '@shared/schemas/project'
import { DateInput } from '@/components/forms/DateInput'
import { FieldMessage } from '@/components/forms/FieldMessage'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useEntityMutation } from '@/hooks/useEntityMutation'
import { useI18n, useT } from '@/i18n'
import {
  KINDS,
  draftFromGoal,
  emptyGoalDraft,
  isMoneyKind,
  needsTarget,
  validateGoalDraft,
  type GoalDraft,
  type GoalIssue
} from './goal-logic'
import { goalsDict, type GoalsKey } from './i18n'

export interface GoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projects: readonly Pick<Project, 'id' | 'name' | 'archived'>[]
  /** Ziel bearbeiten (sonst neu). */
  goal?: Goal
}

const KIND_KEY: Record<Goal['kind'], GoalsKey> = {
  revenue: 'kindRevenue',
  breakEven: 'kindBreakEven',
  users: 'kindUsers',
  costLimit: 'kindCostLimit',
  free: 'kindFree'
}

/** Dialog „Ziel anlegen/bearbeiten“ (F-12). */
export function GoalDialog(props: GoalDialogProps) {
  const t = useT(goalsDict)
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto" dismissOnBackdrop={false}>
        <DialogHeader>
          <DialogTitle>{props.goal ? t('editGoal') : t('newGoal')}</DialogTitle>
        </DialogHeader>
        {/* Nur bei geöffnetem Dialog gemountet, der Formularstand startet jedes Mal neu. */}
        {props.open && <GoalForm {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function GoalForm({ onOpenChange, projects, goal }: GoalDialogProps) {
  const t = useT(goalsDict)
  const tc = useT()
  const { language } = useI18n()
  const { create, update, pending, errorText } = useEntityMutation('goals')
  const [draft, setDraft] = useState<GoalDraft>(() =>
    goal ? draftFromGoal(goal, language) : emptyGoalDraft()
  )
  const [issues, setIssues] = useState<GoalIssue[]>([])
  const patch = (p: Partial<GoalDraft>) => setDraft((d) => ({ ...d, ...p }))
  const has = (i: GoalIssue) => issues.includes(i)
  const visible = projects.filter((p) => !p.archived || p.id === draft.projectId)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const parsed = validateGoalDraft(draft, language, goal?.done ?? false)
    if (!parsed.ok) {
      setIssues(parsed.issues)
      return
    }
    setIssues([])
    const res = goal ? await update(goal.id, parsed.value) : await create(parsed.value)
    if (res.ok) onOpenChange(false)
  }

  return (
    <form className="grid gap-4" onSubmit={(e) => void submit(e)} noValidate>
      <Label className="grid gap-1">
        {t('fKind')}
        <Select
          value={draft.kind}
          onValueChange={(kind) => patch({ kind: kind as GoalDraft['kind'] })}
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {t(KIND_KEY[k])}
            </option>
          ))}
        </Select>
      </Label>
      <Label className="grid gap-1">
        {t('fProject')}
        <Select value={draft.projectId} onValueChange={(projectId) => patch({ projectId })}>
          <option value="">{t('portfolio')}</option>
          {visible.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Label>
      <Label className="grid gap-1">
        {t('fTitle')}
        <Input
          value={draft.title}
          aria-invalid={has('invalidTitle') || undefined}
          onChange={(e) => patch({ title: e.target.value })}
        />
      </Label>
      {needsTarget(draft.kind) && (
        <Label className="grid gap-1">
          {isMoneyKind(draft.kind) ? (
            <span>
              {t('fTargetMoney')}{' '}
              <span className="text-xs text-muted-foreground">({t('fTargetMoneyHint')})</span>
            </span>
          ) : (
            t('fTargetUsers')
          )}
          <Input
            inputMode={isMoneyKind(draft.kind) ? 'decimal' : 'numeric'}
            value={draft.target}
            aria-invalid={has('invalidTarget') || undefined}
            onChange={(e) => patch({ target: e.target.value })}
          />
        </Label>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Label className="grid gap-1">
          {t('fFrom')}
          <DateInput
            value={draft.fromDate}
            onValueChange={(fromDate) => patch({ fromDate })}
            invalid={has('invalidFrom') || has('dueBeforeFrom') || undefined}
          />
        </Label>
        <Label className="grid gap-1">
          {t('fDue')}
          <DateInput
            value={draft.dueDate}
            onValueChange={(dueDate) => patch({ dueDate })}
            invalid={has('invalidDue') || has('dueBeforeFrom') || undefined}
          />
        </Label>
      </div>
      {issues.map((issue) => (
        <FieldMessage key={issue} error>
          {t(issue)}
        </FieldMessage>
      ))}
      <FieldMessage error>{errorText}</FieldMessage>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={pending}
        >
          {tc('common.cancel')}
        </Button>
        <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
          {tc('common.save')}
        </Button>
      </div>
    </form>
  )
}
