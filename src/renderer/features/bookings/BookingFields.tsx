import { useId } from 'react'
import { TriangleAlert } from 'lucide-react'
import { MAX_DESCRIPTION_LENGTH } from '@shared/limits'
import { DateInput } from '@/components/forms/DateInput'
import { FieldMessage } from '@/components/forms/FieldMessage'
import { RecurrenceEditor } from '@/components/forms/RecurrenceEditor'
import type { RecurrenceDraft } from '@/components/forms/recurrence-logic'
import { fieldClassName } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useT, type TranslateFn } from '@/i18n'
import { uiDict, type UiKey } from '@/i18n/shared-keys'
import { cn } from '@/lib/utils'
import type { BookingKind, ExpenseIssue, IncomeIssue } from './booking-logic'
import { bookingsDict, type BookingsKey } from './i18n'

/** Einmalig/wiederkehrend mit Datum bzw. Wiederholung (PE-07). */
export function TimingFields({
  kind,
  onKindChange,
  date,
  onDateChange,
  recurrence,
  onRecurrenceChange,
  currency,
  dateHint,
  showDateError
}: {
  kind: BookingKind
  onKindChange: (kind: BookingKind) => void
  date: string
  onDateChange: (date: string) => void
  recurrence: RecurrenceDraft
  onRecurrenceChange: (value: RecurrenceDraft) => void
  currency: string
  dateHint?: string
  showDateError: boolean
}) {
  const tb = useT(bookingsDict)
  const tu = useT(uiDict)
  const id = useId()
  return (
    <>
      <RadioGroup
        aria-label={tb('kind')}
        value={kind}
        onValueChange={(v) => onKindChange(v === 'recurring' ? 'recurring' : 'oneTime')}
        className="flex flex-wrap gap-4"
      >
        <Label>
          <RadioGroupItem value="oneTime" /> {tb('kindOneTime')}
        </Label>
        <Label>
          <RadioGroupItem value="recurring" /> {tb('kindRecurring')}
        </Label>
      </RadioGroup>
      {kind === 'oneTime' ? (
        <div className="grid gap-2">
          <Label htmlFor={`${id}-date`}>
            {tb('date')}
            {dateHint ? ` (${dateHint})` : ''}
          </Label>
          <DateInput
            id={`${id}-date`}
            required
            value={date}
            invalid={showDateError || undefined}
            onValueChange={onDateChange}
            className="w-44"
          />
          <FieldMessage error>{showDateError ? tu('invalidDate') : null}</FieldMessage>
        </div>
      ) : (
        <RecurrenceEditor value={recurrence} onChange={onRecurrenceChange} currency={currency} />
      )}
    </>
  )
}

/** Mehrzeilige Beschreibung mit Längenlimit (§5). */
export function DescriptionField({
  value,
  onChange
}: {
  value: string
  onChange: (value: string) => void
}) {
  const tb = useT(bookingsDict)
  const id = useId()
  const tooLong = value.trim().length > MAX_DESCRIPTION_LENGTH
  return (
    <div className="grid gap-2">
      <Label htmlFor={`${id}-desc`}>{tb('description')}</Label>
      <textarea
        id={`${id}-desc`}
        value={value}
        rows={2}
        maxLength={MAX_DESCRIPTION_LENGTH}
        aria-invalid={tooLong || undefined}
        onChange={(e) => onChange(e.target.value)}
        className={cn(fieldClassName, 'h-auto py-2')}
      />
      <FieldMessage error>
        {tooLong ? tb('descriptionTooLong', { max: MAX_DESCRIPTION_LENGTH }) : null}
      </FieldMessage>
    </div>
  )
}

const UI_ISSUES: Partial<Record<ExpenseIssue | IncomeIssue, UiKey>> = {
  invalidDate: 'invalidDate',
  invalidAmount: 'invalidAmount',
  invalidCurrency: 'invalidCurrency',
  invalidRate: 'invalidRate'
}

const BOOKING_ISSUES: Partial<Record<ExpenseIssue | IncomeIssue, BookingsKey>> = {
  categoryRequired: 'categoryRequired',
  recurrenceInvalid: 'recurrenceInvalid',
  allocationInvalid: 'allocationInvalid',
  invalidPerson: 'invalidPerson',
  invalidService: 'invalidService',
  projectRequired: 'projectRequired',
  schemaInvalid: 'schemaInvalid'
}

/** Übersetzter Text eines Formularproblems. */
export function issueText(
  issue: ExpenseIssue | IncomeIssue,
  tb: TranslateFn<BookingsKey>,
  tu: TranslateFn<UiKey>
): string {
  if (issue === 'descriptionTooLong') {
    return tb('descriptionTooLong', { max: MAX_DESCRIPTION_LENGTH })
  }
  const ui = UI_ISSUES[issue]
  if (ui) return tu(ui)
  return tb(BOOKING_ISSUES[issue] ?? 'schemaInvalid')
}

/** Liste der Probleme nach einem Speicherversuch. */
export function IssueList({ issues }: { issues: readonly (ExpenseIssue | IncomeIssue)[] }) {
  const tb = useT(bookingsDict)
  const tu = useT(uiDict)
  if (issues.length === 0) return null
  return (
    <div role="alert" className="grid gap-1 rounded-md border border-destructive/40 p-3 text-sm">
      <p className="flex items-center gap-2 font-medium text-destructive">
        <TriangleAlert aria-hidden="true" className="size-4" />
        {tb('fixErrors')}
      </p>
      <ul className="list-disc pl-6 text-destructive">
        {[...new Set(issues)].map((issue) => (
          <li key={issue}>{issueText(issue, tb, tu)}</li>
        ))}
      </ul>
    </div>
  )
}
