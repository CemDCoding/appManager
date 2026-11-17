import { breakEven, forecast, type BreakEven, type Forecast } from '@core/forecast/forecast'
import { goalProgress, type GoalProgress } from '@core/goals/goals'
import { buildLedger, type Ledger, type LedgerInput } from '@core/ledger/ledger'
import { MAX_NAME_LENGTH } from '@shared/limits'
import { isValidDateString } from '@shared/schemas/common'
import { GOAL_KINDS, type Goal } from '@shared/schemas/goal'
import type { Project } from '@shared/schemas/project'
import type { UserMetric } from '@shared/schemas/userMetric'
import { centsToInputText, parseAmountToCents } from '@/components/forms/money-logic'
import type { Language } from '@/i18n'

export type GoalKind = Goal['kind']
export const KINDS: readonly GoalKind[] = GOAL_KINDS

/** Eingabe für `entity.create/update` eines Ziels. */
export type GoalInput = Omit<Goal, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>

/** Formularstand eines Ziels (alles Text, noch ungeprüft). */
export interface GoalDraft {
  kind: GoalKind
  /** '' = Portfolio. */
  projectId: string
  title: string
  /** Betrag (Einnahmen, Kostenlimit; EUR) oder Anzahl (Nutzer). */
  target: string
  fromDate: string
  dueDate: string
}

export type GoalIssue =
  'invalidTitle' | 'invalidTarget' | 'invalidFrom' | 'invalidDue' | 'dueBeforeFrom'

/** Braucht die Art einen Zielwert? */
export function needsTarget(kind: GoalKind): boolean {
  return kind === 'revenue' || kind === 'users' || kind === 'costLimit'
}

/** Ist der Zielwert ein Geldbetrag? */
export function isMoneyKind(kind: GoalKind): boolean {
  return kind === 'revenue' || kind === 'costLimit'
}

export function emptyGoalDraft(projectId = ''): GoalDraft {
  return { kind: 'revenue', projectId, title: '', target: '', fromDate: '', dueDate: '' }
}

export function draftFromGoal(goal: Goal, language: Language): GoalDraft {
  const target =
    goal.targetValue === undefined
      ? ''
      : isMoneyKind(goal.kind)
        ? centsToInputText(goal.targetValue, language)
        : String(goal.targetValue)
  return {
    kind: goal.kind,
    projectId: goal.projectId ?? '',
    title: goal.title,
    target,
    fromDate: goal.fromDate ?? '',
    dueDate: goal.dueDate ?? ''
  }
}

/** Prüft den Entwurf und baut die Eingabe. `done` bleibt beim Bearbeiten erhalten. */
export function validateGoalDraft(
  draft: GoalDraft,
  language: Language,
  done = false
): { ok: true; value: GoalInput } | { ok: false; issues: GoalIssue[] } {
  const issues: GoalIssue[] = []
  const title = draft.title.trim()
  if (title === '' || title.length > MAX_NAME_LENGTH) issues.push('invalidTitle')

  let targetValue: number | undefined
  if (needsTarget(draft.kind)) {
    if (isMoneyKind(draft.kind)) {
      const parsed = parseAmountToCents(draft.target, language)
      // Einnahmenziel braucht einen Zielwert > 0 (PE-75 a); Bestandsziele mit 0 bleiben
      // unverändert und werden im Kern wie bisher berechnet.
      if (parsed.ok && !(draft.kind === 'revenue' && parsed.value <= 0)) {
        targetValue = parsed.value
      }
    } else {
      const text = draft.target.trim()
      const n = /^\d{1,15}$/.test(text) ? Number(text) : NaN
      if (Number.isSafeInteger(n)) targetValue = n
    }
    if (targetValue === undefined) issues.push('invalidTarget')
  }

  if (draft.fromDate !== '' && !isValidDateString(draft.fromDate)) issues.push('invalidFrom')
  if (draft.dueDate !== '' && !isValidDateString(draft.dueDate)) issues.push('invalidDue')
  if (
    draft.fromDate !== '' &&
    draft.dueDate !== '' &&
    isValidDateString(draft.fromDate) &&
    isValidDateString(draft.dueDate) &&
    draft.dueDate < draft.fromDate
  ) {
    issues.push('dueBeforeFrom')
  }
  if (issues.length > 0) return { ok: false, issues }

  return {
    ok: true,
    value: {
      projectId: draft.projectId === '' ? null : draft.projectId,
      kind: draft.kind,
      title,
      ...(targetValue !== undefined ? { targetValue } : {}),
      ...(draft.fromDate !== '' ? { fromDate: draft.fromDate } : {}),
      ...(draft.dueDate !== '' ? { dueDate: draft.dueDate } : {}),
      done: draft.kind === 'free' ? done : false
    }
  }
}

/** Eingabe aus einem bestehenden Ziel mit geändertem `done` (Abhaken). */
export function withDone(goal: Goal, done: boolean): GoalInput {
  return {
    projectId: goal.projectId,
    kind: goal.kind,
    title: goal.title,
    ...(goal.targetValue !== undefined ? { targetValue: goal.targetValue } : {}),
    ...(goal.fromDate !== undefined ? { fromDate: goal.fromDate } : {}),
    ...(goal.dueDate !== undefined ? { dueDate: goal.dueDate } : {}),
    done
  }
}

export interface GoalRow {
  goal: Goal
  progress: GoalProgress
  /** Nur Break-even-Ziele: Zeitpunkt laut Verlauf/Prognose. */
  breakEven?: BreakEven
}

export interface GoalGroup {
  /** `null` = Portfolio. */
  projectId: string | null
  name: string | null
  rows: GoalRow[]
}

export interface GoalData extends LedgerInput {
  goals: readonly Goal[]
  userMetrics: readonly UserMetric[]
  projects: readonly Project[]
}

export interface GoalView {
  groups: GoalGroup[]
  ledger: Ledger
  forecast: Forecast
  /** Saldo je Monat, die letzten 6 Monate (älteste zuerst). */
  balanceSeries: number[]
}

export const SERIES_MONTHS = 6

/** Erster Tag der Monats, `back` Monate vor `today`. */
export function monthStart(today: string, back: number): string {
  const y = Number(today.slice(0, 4))
  const m = Number(today.slice(5, 7)) - 1 - back
  const year = y + Math.floor(m / 12)
  const month = ((m % 12) + 12) % 12
  return `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-01`
}

/** Frühestes Datum, ab dem die Ledger-Historie gebraucht wird (höchstens `today`). */
export function historyStart(data: GoalData, today: string): string {
  const dates: string[] = [today, monthStart(today, SERIES_MONTHS - 1)]
  for (const p of data.projects) dates.push(p.startDate)
  for (const c of data.campaigns) dates.push(c.startDate)
  for (const e of [...data.expenses, ...data.incomes]) {
    dates.push(e.kind === 'oneTime' ? e.date : e.recurrence.startDate)
  }
  for (const g of data.goals) if (g.fromDate !== undefined) dates.push(g.fromDate)
  return dates.reduce((a, b) => (b < a ? b : a))
}

/** Saldo je Monat (Einnahmen minus Ausgaben bis `today`), älteste zuerst. */
export function monthlyBalances(ledger: Ledger, today: string, months = SERIES_MONTHS): number[] {
  const keys: string[] = []
  for (let back = months - 1; back >= 0; back--) keys.push(monthStart(today, back).slice(0, 7))
  const sums = new Map(keys.map((k) => [k, 0]))
  for (const e of ledger.entries) {
    if (e.date > today) continue
    const key = e.date.slice(0, 7)
    const prev = sums.get(key)
    if (prev !== undefined) sums.set(key, prev + (e.kind === 'income' ? e.eurCents : -e.eurCents))
  }
  return keys.map((k) => sums.get(k) ?? 0)
}

/** Ziele nach Portfolio und Projekten gruppiert (Portfolio zuerst, Projekte nach Name). */
export function groupGoals(
  rows: readonly GoalRow[],
  projects: readonly Pick<Project, 'id' | 'name'>[]
): GoalGroup[] {
  const names = new Map(projects.map((p) => [p.id, p.name]))
  const byProject = new Map<string | null, GoalRow[]>()
  for (const row of rows) {
    const list = byProject.get(row.goal.projectId) ?? []
    list.push(row)
    byProject.set(row.goal.projectId, list)
  }
  const groups: GoalGroup[] = [...byProject].map(([projectId, list]) => ({
    projectId,
    name: projectId === null ? null : (names.get(projectId) ?? projectId),
    rows: list
  }))
  return groups.sort((a, b) => {
    if (a.projectId === null) return -1
    if (b.projectId === null) return 1
    return (a.name ?? '').localeCompare(b.name ?? '')
  })
}

/**
 * Fortschritt aller Ziele für `today` (nur Zusammenstellung, gerechnet wird im Kern).
 * Liefert `null`, wenn der Kern wegen unlesbarer Summen abbricht (RangeError).
 */
export function buildGoalView(data: GoalData, today: string): GoalView | null {
  try {
    const ledger = buildLedger(data, { from: historyStart(data, today), to: today })
    const fc = forecast(data, today)
    const rows: GoalRow[] = data.goals.map((goal) => {
      const progress = goalProgress(
        goal,
        { ledger, forecast: fc, userMetrics: data.userMetrics },
        today
      )
      return goal.kind === 'breakEven'
        ? { goal, progress, breakEven: breakEven(ledger, fc, goal.projectId) }
        : { goal, progress }
    })
    return {
      groups: groupGoals(rows, data.projects),
      ledger,
      forecast: fc,
      balanceSeries: monthlyBalances(ledger, today)
    }
  } catch (error) {
    if (error instanceof RangeError) return null
    throw error
  }
}
