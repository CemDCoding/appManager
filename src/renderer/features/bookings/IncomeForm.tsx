import { useCallback, useState, type FormEvent } from 'react'
import type { Income } from '@shared/schemas/income'
import { CategorySelect } from '@/components/forms/CategorySelect'
import { FieldMessage } from '@/components/forms/FieldMessage'
import { MoneyInput } from '@/components/forms/MoneyInput'
import type { MoneyDraft } from '@/components/forms/money-logic'
import { ProjectPicker } from '@/components/forms/ProjectPicker'
import type { RecurrenceDraft } from '@/components/forms/recurrence-logic'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useCollection } from '@/hooks/useCollection'
import { useEntityMutation } from '@/hooks/useEntityMutation'
import { useI18n, useT } from '@/i18n'
import { uiDict } from '@/i18n/shared-keys'
import {
  emptyIncomeDraft,
  incomeDraftFrom,
  incomeDraftToInput,
  localToday,
  type IncomeDraft,
  type IncomeIssue
} from './booking-logic'
import { DescriptionField, IssueList, TimingFields } from './BookingFields'
import { bookingsDict } from './i18n'

export interface IncomeFormProps {
  /** Bestehende Einnahme bearbeiten (sonst neu anlegen). */
  income?: Income
  /** Vorbelegtes Projekt. */
  projectId?: string
  onSaved?: (income: Income) => void
  onCancel?: () => void
}

/**
 * Einnahme (PE-08): genau ein Projekt, Kategorie, Betrag netto mit Kurs-Snapshot
 * (PE-05), einmalig oder wiederkehrend.
 *
 * @example
 * <IncomeForm projectId={project.id} onSaved={close} onCancel={close} />
 */
export function IncomeForm({ income, projectId, onSaved, onCancel }: IncomeFormProps) {
  const tb = useT(bookingsDict)
  const tu = useT(uiDict)
  const t = useT()
  const { language } = useI18n()
  const { items: projects } = useCollection('projects')
  const { create, update, pending, errorText } = useEntityMutation('incomes')

  const [draft, setDraft] = useState<IncomeDraft>(() => {
    const today = localToday()
    return income
      ? incomeDraftFrom(income, language, today)
      : emptyIncomeDraft(today, { projectId })
  })
  const [issues, setIssues] = useState<IncomeIssue[]>([])
  const [submitted, setSubmitted] = useState(false)

  const patch = useCallback((p: Partial<IncomeDraft>) => setDraft((d) => ({ ...d, ...p })), [])
  const setMoney = useCallback((money: MoneyDraft) => patch({ money }), [patch])
  const setRecurrence = useCallback((recurrence: RecurrenceDraft) => patch({ recurrence }), [patch])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    const parsed = incomeDraftToInput(draft, language)
    if (!parsed.ok) {
      setIssues(parsed.error)
      return
    }
    setIssues([])
    const res = income ? await update(income.id, parsed.value) : await create(parsed.value)
    if (res.ok) onSaved?.(res.data)
  }

  return (
    <form className="grid gap-5" onSubmit={(e) => void submit(e)} noValidate>
      <div className="grid gap-2">
        <Label className="grid gap-2">
          {tb('project')}
          <ProjectPicker
            projects={projects}
            aria-label={tb('project')}
            value={draft.projectId}
            onChange={(id) => patch({ projectId: id })}
            allowEmpty
          />
        </Label>
        <FieldMessage error>
          {submitted && draft.projectId === '' ? tb('projectRequired') : null}
        </FieldMessage>
      </div>

      <div className="grid gap-2">
        <Label className="grid gap-2">
          {tb('category')}
          <CategorySelect
            list="incomeCategories"
            aria-label={tb('category')}
            value={draft.category}
            onChange={(c) => patch({ category: c })}
          />
        </Label>
        <FieldMessage error>
          {submitted && draft.category === '' ? tb('categoryRequired') : null}
        </FieldMessage>
      </div>

      <MoneyInput value={draft.money} onChange={setMoney} label={tb('netAmount')} />

      <TimingFields
        kind={draft.kind}
        onKindChange={(k) => patch({ kind: k })}
        date={draft.date}
        onDateChange={(date) => patch({ date })}
        recurrence={draft.recurrence}
        onRecurrenceChange={setRecurrence}
        currency={draft.money.currency}
        showDateError={submitted && issues.includes('invalidDate')}
      />

      <DescriptionField
        value={draft.description}
        onChange={(description) => patch({ description })}
      />

      <IssueList issues={issues} />
      <FieldMessage error>{errorText}</FieldMessage>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={pending}>
            {t('common.cancel')}
          </Button>
        )}
        <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
          {pending ? tu('saving') : t('common.save')}
        </Button>
      </div>
    </form>
  )
}
