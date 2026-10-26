import type { UserMetric } from '@shared/schemas/userMetric'
import { isValidDateString } from '@shared/schemas/common'

/** Eingabe für `entity.create/update` eines Stichtags. */
export type SnapshotInput = Omit<UserMetric, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>

/** Formularstand eines Stichtags (alles Text, noch ungeprüft). */
export interface SnapshotDraft {
  date: string
  usersTotal: string
  usersActive: string
  usersPaying: string
  /** Optional je Plattform (Schlüssel → Text); leere Felder zählen nicht. */
  platforms: Record<string, string>
}

export type SnapshotIssue =
  | 'invalidDate'
  | 'invalidTotal'
  | 'invalidActive'
  | 'invalidPaying'
  | 'invalidPlatform'
  | 'activeExceedsTotal'
  | 'payingExceedsTotal'

export function emptyDraft(date: string): SnapshotDraft {
  return { date, usersTotal: '', usersActive: '', usersPaying: '', platforms: {} }
}

export function draftFrom(m: UserMetric): SnapshotDraft {
  return {
    date: m.date,
    usersTotal: String(m.usersTotal),
    usersActive: String(m.usersActive),
    usersPaying: String(m.usersPaying),
    platforms: Object.fromEntries((m.perPlatform ?? []).map((p) => [p.platform, String(p.users)]))
  }
}

/** Ganze Zahl >= 0 aus Text; sonst `null`. */
export function parseCount(text: string): number | null {
  const trimmed = text.trim()
  if (!/^\d{1,15}$/.test(trimmed)) return null
  const value = Number(trimmed)
  return Number.isSafeInteger(value) ? value : null
}

/** Prüft den Entwurf (aktiv <= gesamt, zahlend <= gesamt) und baut die Eingabe. */
export function validateDraft(
  draft: SnapshotDraft,
  projectId: string
): { ok: true; value: SnapshotInput } | { ok: false; issues: SnapshotIssue[] } {
  const issues: SnapshotIssue[] = []
  if (!isValidDateString(draft.date)) issues.push('invalidDate')
  const total = parseCount(draft.usersTotal)
  const active = parseCount(draft.usersActive)
  const paying = parseCount(draft.usersPaying)
  if (total === null) issues.push('invalidTotal')
  if (active === null) issues.push('invalidActive')
  if (paying === null) issues.push('invalidPaying')
  if (total !== null && active !== null && active > total) issues.push('activeExceedsTotal')
  if (total !== null && paying !== null && paying > total) issues.push('payingExceedsTotal')
  const perPlatform: { platform: string; users: number }[] = []
  for (const [platform, text] of Object.entries(draft.platforms)) {
    if (text.trim() === '') continue
    const users = parseCount(text)
    if (users === null) {
      if (!issues.includes('invalidPlatform')) issues.push('invalidPlatform')
    } else perPlatform.push({ platform, users })
  }
  if (issues.length > 0 || total === null || active === null || paying === null) {
    return { ok: false, issues }
  }
  return {
    ok: true,
    value: {
      projectId,
      date: draft.date,
      usersTotal: total,
      usersActive: active,
      usersPaying: paying,
      ...(perPlatform.length > 0 ? { perPlatform } : {})
    }
  }
}

/** Stichtage eines Projekts, neueste zuerst. */
export function projectSnapshots(all: readonly UserMetric[], projectId: string): UserMetric[] {
  return all
    .filter((m) => m.projectId === projectId)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

/** Reihen für das Liniendiagramm (aufsteigend nach Datum). */
export function chartSeries(
  snapshots: readonly UserMetric[],
  labels: { total: string; active: string; paying: string }
) {
  const sorted = [...snapshots].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  const line = (id: string, label: string, pick: (m: UserMetric) => number) => ({
    id,
    label,
    points: sorted.map((m) => ({ x: m.date, value: pick(m) }))
  })
  return [
    line('total', labels.total, (m) => m.usersTotal),
    line('active', labels.active, (m) => m.usersActive),
    line('paying', labels.paying, (m) => m.usersPaying)
  ]
}
