import { useCallback, useId, useMemo, useState, type FormEvent } from 'react'
import type { Expense } from '@shared/schemas/expense'
import { AllocationEditor } from '@/components/forms/AllocationEditor'
import { validateAllocationDraft, type AllocationDraft } from '@/components/forms/allocation-logic'
import { CategorySelect } from '@/components/forms/CategorySelect'
import { FieldMessage } from '@/components/forms/FieldMessage'
import { MoneyInput } from '@/components/forms/MoneyInput'
import { parseAmountToCents, type MoneyDraft } from '@/components/forms/money-logic'
import type { RecurrenceDraft } from '@/components/forms/recurrence-logic'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useCollection } from '@/hooks/useCollection'
import { useEntityMutation } from '@/hooks/useEntityMutation'
import { useI18n, useT } from '@/i18n'
import { uiDict } from '@/i18n/shared-keys'
import {
  categoryHasPerson,
  categoryHasService,
  emptyExpenseDraft,
  expenseDraftFrom,
  expenseDraftToInput,
  isSelectableExpenseCategory,
  localToday,
  QUICK_CATEGORIES,
  referenceDate,
  type BookingKind,
  type ExpenseDraft,
  type ExpenseIssue
} from './booking-logic'
import { DescriptionField, IssueList, TimingFields } from './BookingFields'
import { bookingsDict } from './i18n'

export interface ExpenseFormProps {
  /** Bestehende Ausgabe bearbeiten (sonst neu anlegen). */
  expense?: Expense
  /** Vorbelegung der Kategorie (z. B. `staff` für „+ Personenzahlung“). */
  category?: string
  /** Vorbelegte Person (Personenprofil, AP-17). */
  personId?: string
  /** Vorbelegter Dienst (Dienstseite). */
  serviceId?: string
  /** Vorbelegte Art; Standard aus der Kategorie (Abo wiederkehrend, sonst einmalig). */
  kind?: BookingKind
  /** Nach erfolgreichem Speichern. */
  onSaved?: (expense: Expense) => void
  onCancel?: () => void
}

/**
 * Eine Ausgaben-Maske für alle Kategorien (PE-48): einmalig oder wiederkehrend,
 * Betrag mit Kurs-Snapshot (PE-05), Aufteilung (PE-06), Person bei
 * „Mitarbeiter/Freelancer“, Dienst bei Dienstkategorien. KI-Guthaben = einmalige
 * Ausgabe am Aufladetag (PE-10). Neu laden der Vorbelegung: Komponente mit `key` neu mounten.
 *
 * @example
 * <ExpenseForm category="staff" personId={person.id} onSaved={close} onCancel={close} />
 */
export function ExpenseForm({
  expense,
  category,
  personId,
  serviceId,
  kind,
  onSaved,
  onCancel
}: ExpenseFormProps) {
  const tb = useT(bookingsDict)
  const tu = useT(uiDict)
  const t = useT()
  const { language } = useI18n()
  const id = useId()
  const { items: projects } = useCollection('projects')
  const { items: persons } = useCollection('persons')
  const { items: services } = useCollection('services')
  const { create, update, pending, errorText } = useEntityMutation('expenses')

  const [draft, setDraft] = useState<ExpenseDraft>(() => {
    const today = localToday()
    return expense
      ? expenseDraftFrom(expense, language, today)
      : emptyExpenseDraft(today, { category, personId, serviceId, kind })
  })
  const [issues, setIssues] = useState<ExpenseIssue[]>([])
  const [submitted, setSubmitted] = useState(false)

  const patch = useCallback((p: Partial<ExpenseDraft>) => setDraft((d) => ({ ...d, ...p })), [])
  const setMoney = useCallback((money: MoneyDraft) => patch({ money }), [patch])
  const setAllocation = useCallback((allocation: AllocationDraft) => patch({ allocation }), [patch])
  const setRecurrence = useCallback((recurrence: RecurrenceDraft) => patch({ recurrence }), [patch])

  const allocationOk = useMemo(
    () => validateAllocationDraft(draft.allocation, language).allocation !== null,
    [draft.allocation, language]
  )
  const amount = parseAmountToCents(draft.money.amountText, language)
  const showPerson = categoryHasPerson(draft.category)
  const showService = categoryHasService(draft.category) || draft.serviceId !== ''

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    const parsed = expenseDraftToInput(draft, language)
    if (!parsed.ok) {
      setIssues(parsed.error)
      return
    }
    setIssues([])
    const res = expense ? await update(expense.id, parsed.value) : await create(parsed.value)
    if (res.ok) onSaved?.(res.data)
  }

  const personOptions = useMemo(() => {
    const list = persons.map((p) => ({
      id: p.id,
      label: p.status === 'inactive' ? `${p.name} (${tb('inactivePerson')})` : p.name,
      disabled: p.status === 'inactive' && p.id !== draft.personId
    }))
    if (draft.personId !== '' && !persons.some((p) => p.id === draft.personId)) {
      list.push({ id: draft.personId, label: tb('deletedPerson'), disabled: false })
    }
    return list
  }, [persons, draft.personId, tb])

  const serviceOptions = useMemo(() => {
    const list = services.map((s) => ({
      id: s.id,
      label: s.plan ? `${s.provider} – ${s.plan}` : s.provider
    }))
    if (draft.serviceId !== '' && !services.some((s) => s.id === draft.serviceId)) {
      list.push({ id: draft.serviceId, label: tb('deletedService') })
    }
    return list
  }, [services, draft.serviceId, tb])

  const dateHint =
    draft.category === QUICK_CATEGORIES.aiCredit && draft.kind === 'oneTime'
      ? tb('dateAiCreditHint')
      : undefined

  return (
    <form className="grid gap-5" onSubmit={(e) => void submit(e)} noValidate>
      <div className="grid gap-2">
        <Label className="grid gap-2">
          {tb('category')}
          <CategorySelect
            list="expenseCategories"
            filter={isSelectableExpenseCategory}
            aria-label={tb('category')}
            value={draft.category}
            onChange={(c) => patch({ category: c })}
          />
        </Label>
        <FieldMessage error>
          {submitted && draft.category === '' ? tb('categoryRequired') : null}
        </FieldMessage>
      </div>

      {showPerson && (
        <div className="grid gap-2">
          <Label htmlFor={`${id}-person`}>{tb('person')}</Label>
          <Select
            id={`${id}-person`}
            value={draft.personId}
            onValueChange={(v) => patch({ personId: v })}
          >
            <option value="">{tb('noPerson')}</option>
            {personOptions.map((p) => (
              <option key={p.id} value={p.id} disabled={p.disabled}>
                {p.label}
              </option>
            ))}
          </Select>
        </div>
      )}

      {showService && (
        <div className="grid gap-2">
          <Label htmlFor={`${id}-service`}>{tb('service')}</Label>
          <Select
            id={`${id}-service`}
            value={draft.serviceId}
            onValueChange={(v) => patch({ serviceId: v })}
          >
            <option value="">{tb('noService')}</option>
            {serviceOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      )}

      <MoneyInput value={draft.money} onChange={setMoney} />

      <TimingFields
        kind={draft.kind}
        onKindChange={(k) => patch({ kind: k })}
        date={draft.date}
        onDateChange={(date) => patch({ date })}
        recurrence={draft.recurrence}
        onRecurrenceChange={setRecurrence}
        currency={draft.money.currency}
        dateHint={dateHint}
        showDateError={submitted && issues.includes('invalidDate')}
      />

      <AllocationEditor
        value={draft.allocation}
        onChange={setAllocation}
        projects={projects}
        totalCents={amount.ok ? amount.value : null}
        currency={draft.money.currency}
        date={referenceDate(draft)}
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
        <Button type="submit" disabled={pending || !allocationOk} aria-busy={pending || undefined}>
          {pending ? tu('saving') : t('common.save')}
        </Button>
      </div>
    </form>
  )
}
