import { aggregate } from '@core/aggregate/aggregate'
import { activeShares, type LedgerEntry } from '@core/ledger/ledger'
import { MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH, MAX_URL_LENGTH } from '@shared/limits'
import type { ProjectPhase } from '@shared/lists'
import { isValidDateString } from '@shared/schemas/common'
import type { Project } from '@shared/schemas/project'
import type { Service } from '@shared/schemas/service'

/** Maximale Anzahl Links je Projekt (wie im Schema). */
export const MAX_LINKS = 50

/** Eingabe für `entity.create/update` eines Projekts. */
export type ProjectInput = Omit<Project, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>

/** Formularstand eines Projekts (alles Text, noch ungeprüft). */
export interface ProjectForm {
  name: string
  description: string
  platforms: string[]
  phase: ProjectPhase
  startDate: string
  endDate: string
  links: { label: string; url: string }[]
}

export type FieldError =
  'required' | 'tooLong' | 'invalidDate' | 'endBeforeStart' | 'invalidUrl' | 'tooMany'

export interface FormErrors {
  name?: FieldError
  description?: FieldError
  startDate?: FieldError
  endDate?: FieldError
  links?: FieldError
  /** Fehler je Link (gleicher Index wie `links`). */
  linkRows: { label?: FieldError; url?: FieldError }[]
}

/** Heutiges Datum (lokal) als "YYYY-MM-DD". */
export function todayIso(now: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function emptyForm(today: string): ProjectForm {
  return {
    name: '',
    description: '',
    platforms: [],
    phase: 'idea',
    startDate: today,
    endDate: '',
    links: []
  }
}

export function formFromProject(project: Project): ProjectForm {
  return {
    name: project.name,
    description: project.description,
    platforms: [...project.platforms],
    phase: project.phase,
    startDate: project.startDate,
    endDate: project.endDate ?? '',
    links: project.links.map((l) => ({ ...l }))
  }
}

/** Nur http(s)-URLs sind erlaubt (Abschnitt 5). */
export function isHttpUrl(value: string): boolean {
  if (value.length === 0 || value.length > MAX_URL_LENGTH) return false
  try {
    const u = new URL(value)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

/**
 * Enddatum nach einem Phasenwechsel: Wechsel auf „Eingestellt“ ohne Enddatum schlägt
 * heute vor (PE-34); alles andere lässt das Enddatum unverändert.
 */
export function suggestEndDate(
  previous: ProjectPhase,
  next: ProjectPhase,
  currentEnd: string,
  today: string
): string {
  if (next === 'discontinued' && previous !== 'discontinued' && currentEnd === '') return today
  return currentEnd
}

/** Prüft das Formular (gleiche Regeln wie `ProjectSchema`). */
export function validateForm(form: ProjectForm): { ok: boolean; errors: FormErrors } {
  const errors: FormErrors = { linkRows: [] }
  const name = form.name.trim()
  if (name === '') errors.name = 'required'
  else if (name.length > MAX_NAME_LENGTH) errors.name = 'tooLong'
  if (form.description.length > MAX_DESCRIPTION_LENGTH) errors.description = 'tooLong'

  if (form.startDate === '') errors.startDate = 'required'
  else if (!isValidDateString(form.startDate)) errors.startDate = 'invalidDate'

  if (form.endDate !== '') {
    if (!isValidDateString(form.endDate)) errors.endDate = 'invalidDate'
    else if (!errors.startDate && form.endDate < form.startDate) errors.endDate = 'endBeforeStart'
  }

  if (form.links.length > MAX_LINKS) errors.links = 'tooMany'
  let rowError = false
  errors.linkRows = form.links.map((link) => {
    const row: FormErrors['linkRows'][number] = {}
    if (link.label.length > MAX_NAME_LENGTH) row.label = 'tooLong'
    const url = link.url.trim()
    if (url === '') row.url = 'required'
    else if (!isHttpUrl(url)) row.url = 'invalidUrl'
    if (row.label || row.url) rowError = true
    return row
  })

  const ok =
    !errors.name &&
    !errors.description &&
    !errors.startDate &&
    !errors.endDate &&
    !errors.links &&
    !rowError
  return { ok, errors }
}

/** Eingabe für `entity.create/update`. Nur nach erfolgreicher Prüfung verwenden. */
export function toProjectInput(form: ProjectForm, archived: boolean): ProjectInput {
  const input: ProjectInput = {
    name: form.name.trim(),
    description: form.description,
    platforms: [...new Set(form.platforms)],
    phase: form.phase,
    startDate: form.startDate,
    links: form.links.map((l) => ({ label: l.label.trim(), url: l.url.trim() })),
    archived
  }
  if (form.endDate !== '') input.endDate = form.endDate
  return input
}

/** Eingabe, die nur das Archiv-Flag eines Projekts ändert. */
export function withArchived(project: Project, archived: boolean): ProjectInput {
  return toProjectInput(formFromProject(project), archived)
}

export interface ProjectFilter {
  phase: ProjectPhase | 'all'
  showArchived: boolean
}

export function filterProjects(projects: readonly Project[], filter: ProjectFilter): Project[] {
  return projects.filter(
    (p) =>
      (filter.showArchived || !p.archived) && (filter.phase === 'all' || p.phase === filter.phase)
  )
}

/** Saldo je Projekt-ID (EUR-Cent) aus Journal-Einträgen (Aggregation im Kern). */
export function balanceByProject(entries: readonly LedgerEntry[]): Map<string, number> {
  const result = aggregate(entries, { groupBy: 'project' })
  const map = new Map<string, number>()
  for (const g of result.groups) if (g.key !== null) map.set(g.key, g.balanceCents)
  return map
}

export interface ServiceRow {
  service: Service
  /** Anteil des Projekts an den Dienstkosten heute (0–1), `null` ohne Anteil heute. */
  share: number | null
  /** Kosten des Projekts im Zeitraum (EUR-Cent). */
  costCents: number
}

/**
 * Dienste, die ein Projekt nutzen: Anteil heute (Aufteilungsregel PE-06/PE-50 aus dem
 * Kern) und Kosten im Zeitraum aus den Journal-Einträgen. Dienste ohne Anteil und ohne
 * Kosten erscheinen nicht.
 */
export function projectServiceRows(
  services: readonly Service[],
  projects: readonly Project[],
  projectId: string,
  entries: readonly LedgerEntry[],
  today: string
): ServiceRow[] {
  const costs = new Map<string, number>()
  for (const e of entries) {
    if (e.projectId !== projectId || e.kind !== 'expense' || e.serviceId === undefined) continue
    costs.set(e.serviceId, (costs.get(e.serviceId) ?? 0) + e.eurCents)
  }
  const rows: ServiceRow[] = []
  for (const service of services) {
    const shares = activeShares(service.allocation, projects, today)
    const total = shares.reduce((sum, s) => sum + s.weight, 0)
    const own = shares.find((s) => s.projectId === projectId)
    const share = own && total > 0 ? own.weight / total : null
    const costCents = costs.get(service.id) ?? 0
    if (share === null && costCents === 0) continue
    rows.push({ service, share, costCents })
  }
  return rows.sort((a, b) => a.service.provider.localeCompare(b.service.provider))
}

/** Journal-Einträge eines Projekts, neueste zuerst (stabil nach Quelle). */
export function projectBookings(entries: readonly LedgerEntry[], projectId: string): LedgerEntry[] {
  return entries
    .filter((e) => e.projectId === projectId)
    .sort((a, b) =>
      a.date === b.date ? a.sourceId.localeCompare(b.sourceId) : a.date < b.date ? 1 : -1
    )
}
