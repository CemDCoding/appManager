import { useState, type FormEvent } from 'react'
import type { UserMetric } from '@shared/schemas/userMetric'
import { DateInput } from '@/components/forms/DateInput'
import { FieldMessage } from '@/components/forms/FieldMessage'
import { useListLabel } from '@/components/forms/CategorySelect'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useEntityMutation } from '@/hooks/useEntityMutation'
import { useT } from '@/i18n'
import { metricsDict } from './i18n'
import {
  draftFrom,
  emptyDraft,
  validateDraft,
  type SnapshotDraft,
  type SnapshotIssue
} from './logic'

export interface SnapshotDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  /** Plattformen des Projekts (Schlüssel) für die optionalen Felder. */
  platforms: readonly string[]
  /** Stichtag bearbeiten (sonst neu). */
  snapshot?: UserMetric
  today: string
}

/** Dialog „+ Stichtag“: Nutzerstand von Hand erfassen (F-13). */
export function SnapshotDialog(props: SnapshotDialogProps) {
  const t = useT(metricsDict)
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto" dismissOnBackdrop={false}>
        <DialogHeader>
          <DialogTitle>{props.snapshot ? t('editSnapshot') : t('newSnapshot')}</DialogTitle>
        </DialogHeader>
        {/* Nur bei geöffnetem Dialog gemountet, der Formularstand startet jedes Mal neu. */}
        {props.open && <SnapshotForm {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function SnapshotForm({
  onOpenChange,
  projectId,
  platforms,
  snapshot,
  today
}: SnapshotDialogProps) {
  const t = useT(metricsDict)
  const tc = useT()
  const platformLabel = useListLabel('projectPlatforms')
  const { create, update, pending, errorText } = useEntityMutation('userMetrics')
  const [draft, setDraft] = useState<SnapshotDraft>(() =>
    snapshot ? draftFrom(snapshot) : emptyDraft(today)
  )
  const [issues, setIssues] = useState<SnapshotIssue[]>([])
  const patch = (p: Partial<SnapshotDraft>) => setDraft((d) => ({ ...d, ...p }))
  const platformKeys = [...new Set([...platforms, ...Object.keys(draft.platforms)])]
  const has = (i: SnapshotIssue) => issues.includes(i)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const parsed = validateDraft(draft, projectId)
    if (!parsed.ok) {
      setIssues(parsed.issues)
      return
    }
    setIssues([])
    const res = snapshot ? await update(snapshot.id, parsed.value) : await create(parsed.value)
    if (res.ok) onOpenChange(false)
  }

  const countField = (
    key: 'usersTotal' | 'usersActive' | 'usersPaying',
    label: string,
    invalid: boolean
  ) => (
    <Label className="grid gap-1">
      {label}
      <Input
        inputMode="numeric"
        value={draft[key]}
        aria-invalid={invalid || undefined}
        onChange={(e) => patch({ [key]: e.target.value })}
      />
    </Label>
  )

  return (
    <form className="grid gap-4" onSubmit={(e) => void submit(e)} noValidate>
      <Label className="grid gap-1">
        {t('fDate')}
        <DateInput
          value={draft.date}
          onValueChange={(date) => patch({ date })}
          invalid={has('invalidDate') || undefined}
        />
      </Label>
      {countField('usersTotal', t('fTotal'), has('invalidTotal'))}
      {countField('usersActive', t('fActive'), has('invalidActive') || has('activeExceedsTotal'))}
      {countField('usersPaying', t('fPaying'), has('invalidPaying') || has('payingExceedsTotal'))}
      {platformKeys.length > 0 && (
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">{t('fPlatforms')}</legend>
          {platformKeys.map((key) => (
            <Label key={key} className="grid grid-cols-[8rem_1fr] items-center gap-2">
              {platformLabel(key)}
              <Input
                inputMode="numeric"
                value={draft.platforms[key] ?? ''}
                aria-invalid={has('invalidPlatform') || undefined}
                onChange={(e) =>
                  patch({ platforms: { ...draft.platforms, [key]: e.target.value } })
                }
              />
            </Label>
          ))}
        </fieldset>
      )}
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
