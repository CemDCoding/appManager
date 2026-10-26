import { isValidDateString, RecurrenceSchema, type Recurrence } from '@shared/schemas/common'
import type { Language } from '@/i18n'
import { centsToInputText, parseAmountToCents } from './money-logic'

/** Eingabezustand von `RecurrenceEditor`; Beträge der Preisänderungen als Text. */
export interface RecurrenceDraft {
  interval: Recurrence['interval']
  startDate: string
  /** Leer = kein Ende. */
  endDate: string
  priceChanges: { fromDate: string; amountText: string }[]
}

export type RecurrenceIssue =
  | { field: 'startDate'; code: 'invalidDate' }
  | { field: 'endDate'; code: 'invalidDate' | 'endBeforeStart' }
  | {
      field: 'priceChange'
      index: number
      code: 'invalidDate' | 'invalidAmount' | 'priceChangeBeforeStart' | 'priceChangeDuplicate'
    }

/** Ergebnis von {@link validateRecurrenceDraft}: fertige Wiederholung oder Probleme je Feld. */
export type RecurrenceValidation =
  { ok: true; value: Recurrence } | { ok: false; error: RecurrenceIssue[] }

export const RECURRENCE_INTERVALS: readonly Recurrence['interval'][] = [
  'daily',
  'weekly',
  'monthly',
  'yearly'
]

/** Neuer Entwurf: monatlich ab `startDate` (Datum vom Aufrufer, der Kern kennt kein „heute“). */
export function emptyRecurrenceDraft(startDate: string): RecurrenceDraft {
  return { interval: 'monthly', startDate, endDate: '', priceChanges: [] }
}

/** Gespeicherte Wiederholung → Entwurf (Bearbeiten). */
export function draftFromRecurrence(recurrence: Recurrence, language: Language): RecurrenceDraft {
  return {
    interval: recurrence.interval,
    startDate: recurrence.startDate,
    endDate: recurrence.endDate ?? '',
    priceChanges: recurrence.priceChanges.map((p) => ({
      fromDate: p.fromDate,
      amountText: centsToInputText(p.cents, language)
    }))
  }
}

/**
 * Prüft den Entwurf und erzeugt die `Recurrence` (Preisänderungen nach Datum sortiert).
 * Fehler kommen je Feld zurück, damit der Editor sie an der richtigen Stelle zeigt.
 */
export function validateRecurrenceDraft(
  draft: RecurrenceDraft,
  language: Language
): RecurrenceValidation {
  const issues: RecurrenceIssue[] = []
  const startOk = isValidDateString(draft.startDate)
  if (!startOk) issues.push({ field: 'startDate', code: 'invalidDate' })
  const end = draft.endDate.trim()
  if (end !== '') {
    if (!isValidDateString(end)) issues.push({ field: 'endDate', code: 'invalidDate' })
    else if (startOk && end < draft.startDate)
      issues.push({ field: 'endDate', code: 'endBeforeStart' })
  }

  const seen = new Set<string>()
  const priceChanges: Recurrence['priceChanges'] = []
  draft.priceChanges.forEach((p, index) => {
    if (!isValidDateString(p.fromDate)) {
      issues.push({ field: 'priceChange', index, code: 'invalidDate' })
    } else if (startOk && p.fromDate < draft.startDate) {
      issues.push({ field: 'priceChange', index, code: 'priceChangeBeforeStart' })
    } else if (seen.has(p.fromDate)) {
      issues.push({ field: 'priceChange', index, code: 'priceChangeDuplicate' })
    }
    seen.add(p.fromDate)
    const cents = parseAmountToCents(p.amountText, language)
    if (!cents.ok) issues.push({ field: 'priceChange', index, code: 'invalidAmount' })
    else priceChanges.push({ fromDate: p.fromDate, cents: cents.value })
  })

  if (issues.length > 0) return { ok: false, error: issues }
  const candidate: Recurrence = {
    interval: draft.interval,
    startDate: draft.startDate,
    ...(end !== '' ? { endDate: end } : {}),
    priceChanges: [...priceChanges].sort((a, b) => (a.fromDate < b.fromDate ? -1 : 1))
  }
  const parsed = RecurrenceSchema.safeParse(candidate)
  if (!parsed.success) return { ok: false, error: [{ field: 'startDate', code: 'invalidDate' }] }
  return { ok: true, value: parsed.data }
}
