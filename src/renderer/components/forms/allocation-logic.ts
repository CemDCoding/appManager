import { resolveProjects, splitCents } from '@core/allocation/allocation'
import { isActive } from '@core/projects/activePeriod'
import type { Result } from '@core/money/money'
import { AllocationSchema, type Allocation } from '@shared/schemas/common'
import type { Project } from '@shared/schemas/project'
import type { Language } from '@/i18n'
import { centsToInputText, parseAmountToCents } from './money-logic'

/** 100 % in Basispunkten. */
export const FULL_PERCENT_BP = 10_000

/**
 * Eingabezustand von `AllocationEditor`. Prozente bleiben Text, bis gespeichert wird;
 * erst {@link validateAllocationDraft} erzeugt die `Allocation` für die Daten.
 */
export interface AllocationDraft {
  mode: Allocation['mode']
  split: Allocation['split']
  /** Ausgewählte Projekte in Auswahlreihenfolge (nur bei `selected`). */
  projectIds: string[]
  /** Prozent-Text je Projekt-ID (nur bei `percent`). */
  percentTexts: Record<string, string>
}

export type AllocationIssue = 'noProjectSelected' | 'invalidPercent' | 'percentSumInvalid'

export interface AllocationValidation {
  /** Fertige Aufteilung oder `null`, solange es Probleme gibt (Speichern blockieren). */
  allocation: Allocation | null
  issues: AllocationIssue[]
  /** Summe der gültigen Prozente in Basispunkten (nur bei `selected` + `percent`). */
  percentSumBasisPoints: number | null
}

export type PreviewError = 'invalidAllocation' | 'invalidAmount' | 'unassignable' | 'invalidDate'

export interface PreviewShare {
  projectId: string
  cents: number
}

/** Standard: gleichmäßig auf alle aktiven Projekte. */
export function emptyAllocationDraft(): AllocationDraft {
  return { mode: 'all', split: 'equal', projectIds: [], percentTexts: {} }
}

/** Basispunkte → Prozent-Text ("3334" → "33,34" bzw. "33.34"). */
export function basisPointsToText(bp: number, language: Language): string {
  return centsToInputText(bp, language)
}

/** Prozent-Text → Basispunkte (0–10 000, höchstens 2 Nachkommastellen). */
export function parsePercentToBasisPoints(
  text: string,
  language: Language
): Result<number, 'invalidPercent'> {
  // Prozent mit 2 Nachkommastellen hat dieselbe Form wie ein Betrag in Cent.
  const r = parseAmountToCents(text, language)
  if (!r.ok || r.value > FULL_PERCENT_BP) return { ok: false, error: 'invalidPercent' }
  return { ok: true, value: r.value }
}

/** Gespeicherte Aufteilung → Entwurf (Bearbeiten). */
export function draftFromAllocation(allocation: Allocation, language: Language): AllocationDraft {
  return {
    mode: allocation.mode,
    split: allocation.split,
    projectIds: allocation.shares.map((s) => s.projectId),
    percentTexts:
      allocation.split === 'percent'
        ? Object.fromEntries(
            allocation.shares.map((s) => [
              s.projectId,
              basisPointsToText(s.percentBasisPoints, language)
            ])
          )
        : {}
  }
}

/**
 * Gleichmäßige Prozente für die Auswahl (Summe genau 100 %, Restpunkte nach
 * Größter-Rest über `splitCents`), z. B. 3 Projekte → 33,34 / 33,33 / 33,33.
 */
export function equalPercentTexts(
  projectIds: readonly string[],
  language: Language
): Record<string, string> {
  if (projectIds.length === 0) return {}
  const parts = splitCents(
    FULL_PERCENT_BP,
    projectIds.map(() => 1)
  )
  if (!parts.ok) return {}
  return Object.fromEntries(
    projectIds.map((id, i) => [id, basisPointsToText(parts.value[i] ?? 0, language)])
  )
}

/** Modus wechseln (`all` hat immer `equal`, Schema-Regel). */
export function setAllocationMode(
  draft: AllocationDraft,
  mode: Allocation['mode']
): AllocationDraft {
  return mode === 'all' ? { ...draft, mode, split: 'equal' } : { ...draft, mode }
}

/** Teilung wechseln; bei `percent` werden gleichmäßige Prozente vorbelegt. */
export function setAllocationSplit(
  draft: AllocationDraft,
  split: Allocation['split'],
  language: Language
): AllocationDraft {
  if (split === 'percent') {
    return { ...draft, split, percentTexts: equalPercentTexts(draft.projectIds, language) }
  }
  return { ...draft, split }
}

/** Projekte setzen; bei `percent` werden die Prozente neu gleichmäßig verteilt. */
export function setAllocationProjects(
  draft: AllocationDraft,
  projectIds: readonly string[],
  language: Language
): AllocationDraft {
  const ids = [...new Set(projectIds)]
  return {
    ...draft,
    projectIds: ids,
    percentTexts: draft.split === 'percent' ? equalPercentTexts(ids, language) : draft.percentTexts
  }
}

/** Prozent eines Projekts setzen (Text wie getippt). */
export function setAllocationPercent(
  draft: AllocationDraft,
  projectId: string,
  text: string
): AllocationDraft {
  return { ...draft, percentTexts: { ...draft.percentTexts, [projectId]: text } }
}

/**
 * Prüft den Entwurf. Prozente müssen zusammen genau 100 % ergeben, sonst ist
 * `allocation` `null` und das Speichern muss blockiert werden (Akzeptanzkriterium).
 * Das Ergebnis wird zusätzlich gegen `AllocationSchema` geprüft.
 */
export function validateAllocationDraft(
  draft: AllocationDraft,
  language: Language
): AllocationValidation {
  if (draft.mode === 'all') {
    const allocation: Allocation = { mode: 'all', split: 'equal', shares: [] }
    return { allocation, issues: [], percentSumBasisPoints: null }
  }
  const issues: AllocationIssue[] = []
  if (draft.projectIds.length === 0) issues.push('noProjectSelected')

  let percentSum: number | null = null
  const shares: Allocation['shares'] = []
  if (draft.split === 'percent') {
    percentSum = 0
    let invalid = false
    for (const projectId of draft.projectIds) {
      const r = parsePercentToBasisPoints(draft.percentTexts[projectId] ?? '', language)
      if (!r.ok) {
        invalid = true
        continue
      }
      percentSum += r.value
      shares.push({ projectId, percentBasisPoints: r.value })
    }
    if (invalid) issues.push('invalidPercent')
    else if (draft.projectIds.length > 0 && percentSum !== FULL_PERCENT_BP)
      issues.push('percentSumInvalid')
  } else {
    for (const projectId of draft.projectIds) shares.push({ projectId, percentBasisPoints: 0 })
  }

  if (issues.length > 0) return { allocation: null, issues, percentSumBasisPoints: percentSum }
  const parsed = AllocationSchema.safeParse({ mode: 'selected', split: draft.split, shares })
  if (!parsed.success) {
    return { allocation: null, issues: ['percentSumInvalid'], percentSumBasisPoints: percentSum }
  }
  return { allocation: parsed.data, issues: [], percentSumBasisPoints: percentSum }
}

/**
 * Live-Vorschau der Cent-Aufteilung: nur Kern-Funktionen (`resolveProjects` mit
 * `isActive` am Stichtag, dann `splitCents`, Größter-Rest, PE-28).
 * Beispiel: 10 000 Cent auf 3 Projekte gleich → 3 334 / 3 333 / 3 333.
 */
export function allocationPreview(
  allocation: Allocation | null,
  projects: readonly Pick<Project, 'id' | 'startDate' | 'endDate'>[],
  totalCents: number | null,
  date: string
): Result<PreviewShare[], PreviewError> {
  if (!allocation) return { ok: false, error: 'invalidAllocation' }
  if (totalCents === null || !Number.isSafeInteger(totalCents) || totalCents < 0) {
    return { ok: false, error: 'invalidAmount' }
  }
  let resolved: ReturnType<typeof resolveProjects>
  try {
    resolved = resolveProjects(allocation, projects, date, isActive)
  } catch {
    return { ok: false, error: 'invalidDate' }
  }
  if (!resolved.ok) return resolved
  const split = splitCents(
    totalCents,
    resolved.value.map((s) => s.weight)
  )
  if (!split.ok) return { ok: false, error: 'invalidAllocation' }
  return {
    ok: true,
    value: resolved.value.map((s, i) => ({ projectId: s.projectId, cents: split.value[i] ?? 0 }))
  }
}
