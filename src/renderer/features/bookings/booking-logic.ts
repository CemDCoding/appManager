import type { EntityInput } from '@shared/ipc'
import { MAX_DESCRIPTION_LENGTH } from '@shared/limits'
import {
  IdSchema,
  isValidDateString,
  KeySchema,
  LOCAL_OWNER,
  type Recurrence
} from '@shared/schemas/common'
import { ExpenseSchema, type Expense } from '@shared/schemas/expense'
import { IncomeSchema, type Income } from '@shared/schemas/income'
import {
  draftFromAllocation,
  emptyAllocationDraft,
  validateAllocationDraft,
  type AllocationDraft
} from '@/components/forms/allocation-logic'
import {
  emptyMoneyDraft,
  moneyDraftFrom,
  parseMoneyDraft,
  type MoneyDraft,
  type MoneyDraftError
} from '@/components/forms/money-logic'
import {
  draftFromRecurrence,
  emptyRecurrenceDraft,
  validateRecurrenceDraft,
  type RecurrenceDraft
} from '@/components/forms/recurrence-logic'
import type { Language } from '@/i18n/types'

/**
 * Reine Abbildung Formular-Entwurf → Entität (AP-14). Keine Rechenlogik: Beträge,
 * Kurse, Aufteilung und Wiederholung prüfen die Bausteine aus `components/forms`;
 * das fertige Objekt wird zusätzlich gegen das zod-Schema der Entität geprüft.
 */

export type BookingKind = 'oneTime' | 'recurring'

/** Kategorie, bei der eine Person zugeordnet wird (PE-48). */
export const PERSON_CATEGORY = 'staff'

/**
 * Dienstkategorien (PE-48): hier kann ein Dienst verknüpft werden. Eigene Kategorien
 * zählen nicht dazu; ein vorbelegter Dienst bleibt aber immer erhalten.
 */
export const SERVICE_CATEGORIES: readonly string[] = [
  'hosting',
  'database',
  'domain',
  'storageCdn',
  'softwareLicense',
  'aiSubscription',
  'aiCredit'
]

/** Kategorien der Schnellknöpfe (PE-48, PE-10). */
export const QUICK_CATEGORIES = {
  personPayment: PERSON_CATEGORY,
  aiCredit: 'aiCredit',
  subscription: 'aiSubscription'
} as const
export type QuickAction = keyof typeof QUICK_CATEGORIES

export function categoryHasPerson(category: string): boolean {
  return category === PERSON_CATEGORY
}

export function categoryHasService(category: string): boolean {
  return SERVICE_CATEGORIES.includes(category)
}

/**
 * Standard-Art je Kategorie: Abos wiederkehrend, KI-Guthaben als einmalige Aufladung
 * am Aufladetag (PE-10), sonst einmalig.
 */
export function defaultKindFor(category: string): BookingKind {
  return category === QUICK_CATEGORIES.subscription ? 'recurring' : 'oneTime'
}

/** Heutiges Datum in Ortszeit als "YYYY-MM-DD" (nur UI, nie im Rechenkern). */
export function localToday(now: Date = new Date()): string {
  const y = String(now.getFullYear()).padStart(4, '0')
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ---------------------------------------------------------------------------
// Gemeinsame Teile
// ---------------------------------------------------------------------------

interface BookingDraftBase {
  kind: BookingKind
  category: string
  /** Buchungstag bei `oneTime`. */
  date: string
  /** Wiederholung bei `recurring` (Grundbetrag kommt aus `money`). */
  recurrence: RecurrenceDraft
  money: MoneyDraft
  description: string
}

export type CommonIssue =
  | 'categoryRequired'
  | 'invalidDate'
  | MoneyDraftError
  | 'recurrenceInvalid'
  | 'descriptionTooLong'
  | 'schemaInvalid'

type TimingOk = { kind: 'oneTime'; date: string } | { kind: 'recurring'; recurrence: Recurrence }

interface CommonParsed {
  category: string
  amount: EntityInput<'expenses'>['amount']
  rateToEur: string
  description: string
  timing: TimingOk
}

function parseCommon(
  draft: BookingDraftBase,
  language: Language,
  issues: string[]
): CommonParsed | null {
  if (!KeySchema.safeParse(draft.category).success || draft.category === '') {
    issues.push('categoryRequired')
  }
  const money = parseMoneyDraft(draft.money, language)
  if (!money.ok) issues.push(money.error)

  let timing: TimingOk | null = null
  if (draft.kind === 'oneTime') {
    if (isValidDateString(draft.date)) timing = { kind: 'oneTime', date: draft.date }
    else issues.push('invalidDate')
  } else {
    const rec = validateRecurrenceDraft(draft.recurrence, language)
    if (rec.ok) timing = { kind: 'recurring', recurrence: rec.value }
    else issues.push('recurrenceInvalid')
  }

  const description = draft.description.trim()
  if (description.length > MAX_DESCRIPTION_LENGTH) issues.push('descriptionTooLong')

  if (issues.length > 0 || !money.ok || timing === null) return null
  return {
    category: draft.category,
    amount: money.value.amount,
    rateToEur: money.value.rateToEur,
    description,
    timing
  }
}

/** Stichtag für Aufteilungs-Vorschau: Buchungstag bzw. Start der Wiederholung. */
export function referenceDate(
  draft: Pick<BookingDraftBase, 'kind' | 'date' | 'recurrence'>
): string {
  return draft.kind === 'oneTime' ? draft.date : draft.recurrence.startDate
}

/** Platzhalter für die Schema-Prüfung (die echten Basisfelder setzt der Main-Prozess). */
const PROBE_BASE = {
  id: '00000000-0000-4000-8000-000000000000',
  ownerId: LOCAL_OWNER,
  createdAt: '1970-01-01T00:00:00.000Z',
  updatedAt: '1970-01-01T00:00:00.000Z'
}

export type FormResult<T, I extends string> = { ok: true; value: T } | { ok: false; error: I[] }

// ---------------------------------------------------------------------------
// Ausgaben
// ---------------------------------------------------------------------------

export interface ExpenseDraft extends BookingDraftBase {
  allocation: AllocationDraft
  /** '' = keine Person. */
  personId: string
  /** '' = kein Dienst. */
  serviceId: string
}

export type ExpenseIssue = CommonIssue | 'allocationInvalid' | 'invalidPerson' | 'invalidService'

export interface ExpensePrefill {
  category?: string
  personId?: string
  serviceId?: string
  kind?: BookingKind
}

/** Neuer Ausgaben-Entwurf, optional vorbelegt (Schnellknöpfe, Personenprofil, Dienste). */
export function emptyExpenseDraft(today: string, prefill: ExpensePrefill = {}): ExpenseDraft {
  const category = prefill.category ?? ''
  return {
    kind: prefill.kind ?? defaultKindFor(category),
    category,
    date: today,
    recurrence: emptyRecurrenceDraft(today),
    money: emptyMoneyDraft(),
    description: '',
    allocation: emptyAllocationDraft(),
    personId: prefill.personId ?? '',
    serviceId: prefill.serviceId ?? ''
  }
}

/** Gespeicherte Ausgabe → Entwurf (Kurs-Snapshot bleibt, PE-05). */
export function expenseDraftFrom(
  expense: Expense,
  language: Language,
  today: string
): ExpenseDraft {
  return {
    kind: expense.kind,
    category: expense.category,
    date: expense.kind === 'oneTime' ? expense.date : today,
    recurrence:
      expense.kind === 'recurring'
        ? draftFromRecurrence(expense.recurrence, language)
        : emptyRecurrenceDraft(expense.date),
    money: moneyDraftFrom(expense.amount, expense.rateToEur, language),
    description: expense.description,
    allocation: draftFromAllocation(expense.allocation, language),
    personId: expense.personId ?? '',
    serviceId: expense.serviceId ?? ''
  }
}

/**
 * Person nur bei „Mitarbeiter/Freelancer“; Dienst bei Dienstkategorien oder wenn er
 * schon gesetzt war (z. B. Vorbelegung aus der Dienstseite).
 */
function linkFields(
  draft: ExpenseDraft,
  issues: string[]
): { personId?: string; serviceId?: string } {
  const out: { personId?: string; serviceId?: string } = {}
  if (categoryHasPerson(draft.category) && draft.personId !== '') {
    if (IdSchema.safeParse(draft.personId).success) out.personId = draft.personId
    else issues.push('invalidPerson')
  }
  if (draft.serviceId !== '') {
    if (IdSchema.safeParse(draft.serviceId).success) out.serviceId = draft.serviceId
    else issues.push('invalidService')
  }
  return out
}

/**
 * Entwurf → Eingabe für `entity.create/update('expenses', …)`. Liefert alle Probleme
 * auf einmal; `allocationInvalid`, solange `validateAllocationDraft` `null` liefert.
 */
export function expenseDraftToInput(
  draft: ExpenseDraft,
  language: Language
): FormResult<EntityInput<'expenses'>, ExpenseIssue> {
  const issues: string[] = []
  const common = parseCommon(draft, language, issues)
  const { allocation } = validateAllocationDraft(draft.allocation, language)
  if (allocation === null) issues.push('allocationInvalid')
  const links = linkFields(draft, issues)
  if (issues.length > 0 || common === null || allocation === null) {
    return { ok: false, error: issues as ExpenseIssue[] }
  }
  const base = {
    category: common.category,
    amount: common.amount,
    rateToEur: common.rateToEur,
    allocation,
    description: common.description,
    ...links
  }
  const input: EntityInput<'expenses'> =
    common.timing.kind === 'oneTime'
      ? { ...base, kind: 'oneTime', date: common.timing.date }
      : { ...base, kind: 'recurring', recurrence: common.timing.recurrence }
  if (!ExpenseSchema.safeParse({ ...PROBE_BASE, ...input }).success) {
    return { ok: false, error: ['schemaInvalid'] }
  }
  return { ok: true, value: input }
}

// ---------------------------------------------------------------------------
// Einnahmen
// ---------------------------------------------------------------------------

export interface IncomeDraft extends BookingDraftBase {
  /** Genau ein Projekt (PE-08); '' = noch keins gewählt. */
  projectId: string
}

export type IncomeIssue = CommonIssue | 'projectRequired'

export function emptyIncomeDraft(today: string, prefill: { projectId?: string } = {}): IncomeDraft {
  return {
    kind: 'oneTime',
    category: '',
    date: today,
    recurrence: emptyRecurrenceDraft(today),
    money: emptyMoneyDraft(),
    description: '',
    projectId: prefill.projectId ?? ''
  }
}

export function incomeDraftFrom(income: Income, language: Language, today: string): IncomeDraft {
  return {
    kind: income.kind,
    category: income.category,
    date: income.kind === 'oneTime' ? income.date : today,
    recurrence:
      income.kind === 'recurring'
        ? draftFromRecurrence(income.recurrence, language)
        : emptyRecurrenceDraft(income.date),
    money: moneyDraftFrom(income.amount, income.rateToEur, language),
    description: income.description,
    projectId: income.projectId
  }
}

/** Entwurf → Eingabe für `entity.create/update('incomes', …)`; Betrag ist netto. */
export function incomeDraftToInput(
  draft: IncomeDraft,
  language: Language
): FormResult<EntityInput<'incomes'>, IncomeIssue> {
  const issues: string[] = []
  const common = parseCommon(draft, language, issues)
  if (!IdSchema.safeParse(draft.projectId).success) issues.push('projectRequired')
  if (issues.length > 0 || common === null) return { ok: false, error: issues as IncomeIssue[] }
  const base = {
    category: common.category,
    amount: common.amount,
    rateToEur: common.rateToEur,
    projectId: draft.projectId,
    description: common.description
  }
  const input: EntityInput<'incomes'> =
    common.timing.kind === 'oneTime'
      ? { ...base, kind: 'oneTime', date: common.timing.date }
      : { ...base, kind: 'recurring', recurrence: common.timing.recurrence }
  if (!IncomeSchema.safeParse({ ...PROBE_BASE, ...input }).success) {
    return { ok: false, error: ['schemaInvalid'] }
  }
  return { ok: true, value: input }
}
