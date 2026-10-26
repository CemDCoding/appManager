import type { Ledger } from '@core/ledger/ledger'
import { personSummary } from '@core/metrics/metrics'
import { MAX_NAME_LENGTH, MAX_NOTE_LENGTH } from '@shared/limits'
import type { Person } from '@shared/schemas/person'

/** Eingabe für Person: nur Name, Rolle, Status, Notiz (PE-09, PE-36), keine Kontaktdaten. */
export interface PersonInput {
  name: string
  role: string
  status: 'active' | 'inactive'
  note: string
}

export type PersonIssue = 'nameRequired' | 'nameTooLong' | 'roleTooLong' | 'noteTooLong'

export type PersonResult = { ok: true; value: PersonInput } | { ok: false; error: PersonIssue[] }

export function emptyPersonInput(): PersonInput {
  return { name: '', role: '', status: 'active', note: '' }
}

export function inputFromPerson(p: Person): PersonInput {
  return { name: p.name, role: p.role, status: p.status, note: p.note }
}

/** Prüft die Eingabe (Name Pflicht, Längenlimits aus dem Schema) und trimmt Name und Rolle. */
export function validatePersonInput(input: PersonInput): PersonResult {
  const name = input.name.trim()
  const role = input.role.trim()
  const error: PersonIssue[] = []
  if (name.length === 0) error.push('nameRequired')
  else if (name.length > MAX_NAME_LENGTH) error.push('nameTooLong')
  if (role.length > MAX_NAME_LENGTH) error.push('roleTooLong')
  if (input.note.length > MAX_NOTE_LENGTH) error.push('noteTooLong')
  if (error.length > 0) return { ok: false, error }
  return { ok: true, value: { name, role, status: input.status, note: input.note } }
}

export type StatusFilter = 'all' | 'active' | 'inactive'

/** Personen nach Status filtern, nach Name sortiert (unabhängig von Groß-/Kleinschreibung). */
export function filterPersons(persons: readonly Person[], filter: StatusFilter): Person[] {
  return persons
    .filter((p) => filter === 'all' || p.status === filter)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
}

export interface DateRangeLike {
  from: string
  to: string
}

/** Zahlungszeile: ein Tag einer Ausgabe, Anteile aller Projekte zusammengefasst. */
export interface PaymentRow {
  key: string
  sourceId: string
  date: string
  eurCents: number
  /** Projekte mit Anteil (`null` = kein aktives Projekt am Tag), ohne Doppelte. */
  projectIds: (string | null)[]
}

/** Zahlungen einer Person im Zeitraum aus dem Ledger, neueste zuerst. */
export function personPayments(
  ledger: Ledger,
  personId: string,
  range: DateRangeLike
): PaymentRow[] {
  const rows = new Map<string, PaymentRow>()
  for (const e of ledger.entries) {
    if (e.kind !== 'expense' || e.personId !== personId) continue
    if (e.date < range.from || e.date > range.to) continue
    const key = `${e.sourceId}|${e.date}`
    const row = rows.get(key)
    if (row) {
      row.eurCents += e.eurCents
      if (!row.projectIds.includes(e.projectId)) row.projectIds.push(e.projectId)
    } else {
      rows.set(key, {
        key,
        sourceId: e.sourceId,
        date: e.date,
        eurCents: e.eurCents,
        projectIds: [e.projectId]
      })
    }
  }
  return [...rows.values()].sort((a, b) =>
    a.date === b.date ? (a.key < b.key ? -1 : 1) : a.date < b.date ? 1 : -1
  )
}

/** Summe je Person im Zeitraum (EUR-Cent) für die Liste. */
export function totalsByPerson(
  ledger: Ledger,
  persons: readonly Person[],
  range: DateRangeLike
): Map<string, number> {
  return new Map(persons.map((p) => [p.id, personSummary(ledger, p.id, range).totalCents]))
}

export interface ProjectPersonRow {
  /** Id der Person; kann zu einer gelöschten Person gehören (PE-35). */
  personId: string
  eurCents: number
}

/** Personen mit Zahlungen in einem Projekt (im Zeitraum), größte Summe zuerst. */
export function personsOfProject(
  ledger: Ledger,
  projectId: string,
  range: DateRangeLike
): ProjectPersonRow[] {
  const ids = new Set<string>()
  for (const e of ledger.entries) {
    if (e.kind === 'expense' && e.personId && e.projectId === projectId) ids.add(e.personId)
  }
  const rows: ProjectPersonRow[] = []
  for (const personId of ids) {
    const cents = personSummary(ledger, personId, range).byProject.find(
      (b) => b.projectId === projectId
    )?.cents
    if (cents !== undefined) rows.push({ personId, eurCents: cents })
  }
  return rows.sort((a, b) => b.eurCents - a.eurCents || (a.personId < b.personId ? -1 : 1))
}

/** Pfad zur Personenseite (ohne Import aus `app/routes`, vermeidet Importzyklen). */
export function personDetailPath(id: string): string {
  return `/people/${encodeURIComponent(id)}`
}
