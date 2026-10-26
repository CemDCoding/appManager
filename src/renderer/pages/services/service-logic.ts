import { monthlyFixedCosts, type MonthlyFixedCosts } from '@core/aggregate/fixedCosts'
import type { EntityInput } from '@shared/ipc'
import { MAX_NAME_LENGTH, MAX_NOTE_LENGTH, MAX_URL_LENGTH } from '@shared/limits'
import type { Money, Rate } from '@shared/money'
import { HttpUrlSchema, type Allocation, type Recurrence } from '@shared/schemas/common'
import type { Expense } from '@shared/schemas/expense'
import type { Project } from '@shared/schemas/project'
import type { Service } from '@shared/schemas/service'

/** Zwecke eines Dienstes (F-02). Gespeichert wird der Schlüssel in `Service.purpose`. */
export const SERVICE_PURPOSES = [
  'frontend',
  'backend',
  'database',
  'hosting',
  'storage',
  'domain',
  'other'
] as const
export type ServicePurpose = (typeof SERVICE_PURPOSES)[number]

/** Zweck → Ausgabenkategorie (Schlüssel aus `DEFAULT_EXPENSE_CATEGORIES`). */
const PURPOSE_CATEGORY: Record<ServicePurpose, string> = {
  frontend: 'hosting',
  backend: 'hosting',
  database: 'database',
  hosting: 'hosting',
  storage: 'storageCdn',
  domain: 'domain',
  other: 'other'
}

export function isServicePurpose(value: string): value is ServicePurpose {
  return (SERVICE_PURPOSES as readonly string[]).includes(value)
}

/** Gruppe eines Dienstes; unbekannte oder freie Zwecke landen in „Sonstiges“. */
export function purposeGroup(purpose: string): ServicePurpose {
  return isServicePurpose(purpose) ? purpose : 'other'
}

/** Passende Ausgabenkategorie zum Zweck (PE-48, Dienstkategorien). */
export function categoryForPurpose(purpose: string): string {
  return PURPOSE_CATEGORY[purposeGroup(purpose)]
}

export interface ServiceGroup {
  purpose: ServicePurpose
  services: Service[]
}

/** Dienste nach Zweck gruppiert (feste Reihenfolge, leere Gruppen entfallen, je Gruppe nach Anbieter). */
export function groupServices(services: readonly Service[]): ServiceGroup[] {
  return SERVICE_PURPOSES.map((purpose) => ({
    purpose,
    services: services
      .filter((s) => purposeGroup(s.purpose) === purpose)
      .sort((a, b) => a.provider.localeCompare(b.provider))
  })).filter((g) => g.services.length > 0)
}

export interface ServiceDraft {
  provider: string
  purpose: string
  plan: string
  url: string
  note: string
}

export type ServiceIssue = 'providerRequired' | 'tooLong' | 'invalidUrl'

export function emptyServiceDraft(): ServiceDraft {
  return { provider: '', purpose: 'hosting', plan: '', url: '', note: '' }
}

export function draftFromService(service: Service): ServiceDraft {
  return {
    provider: service.provider,
    purpose: purposeGroup(service.purpose),
    plan: service.plan,
    url: service.url ?? '',
    note: service.note
  }
}

export type ServiceFields = Omit<EntityInput<'services'>, 'allocation'>

/** Prüft die Texte des Dialogs; nur http(s)-URLs (Abschnitt 5). */
export function validateServiceDraft(
  draft: ServiceDraft
): { ok: true; value: ServiceFields } | { ok: false; error: ServiceIssue[] } {
  const issues: ServiceIssue[] = []
  const provider = draft.provider.trim()
  if (provider === '') issues.push('providerRequired')
  const plan = draft.plan.trim()
  const url = draft.url.trim()
  if (
    provider.length > MAX_NAME_LENGTH ||
    plan.length > MAX_NAME_LENGTH ||
    draft.note.length > MAX_NOTE_LENGTH ||
    url.length > MAX_URL_LENGTH
  ) {
    issues.push('tooLong')
  }
  if (url !== '' && !HttpUrlSchema.safeParse(url).success) issues.push('invalidUrl')
  if (issues.length > 0) return { ok: false, error: issues }
  return {
    ok: true,
    value: {
      provider,
      purpose: purposeGroup(draft.purpose),
      plan,
      ...(url === '' ? {} : { url }),
      note: draft.note
    }
  }
}

/** Ausgaben, die zu einem Dienst gehören. */
export function expensesOfService(expenses: readonly Expense[], serviceId: string): Expense[] {
  return expenses.filter((e) => e.serviceId === serviceId)
}

/** Monatliche Fixkosten (PE-51) je Dienst am Stichtag; Rechnung nur über den Kern. */
export function serviceMonthlyCosts(
  services: readonly Service[],
  expenses: readonly Expense[],
  projects: readonly Project[],
  date: string
): Map<string, MonthlyFixedCosts> {
  return new Map(
    services.map((s) => [
      s.id,
      monthlyFixedCosts(expensesOfService(expenses, s.id), projects, date)
    ])
  )
}

export type CostKind = 'oneTime' | 'recurring'

export interface ServiceCostInput {
  serviceId: string
  category: string
  amount: Money
  rateToEur: Rate
  allocation: Allocation
  description: string
  kind: CostKind
  /** Buchungstag (nur einmalig). */
  date: string
  recurrence: Recurrence
}

/** Baut die Ausgabe zu einem Dienst (`serviceId`, Kategorie, Aufteilung). */
export function buildServiceExpense(input: ServiceCostInput): EntityInput<'expenses'> {
  const common = {
    category: input.category,
    amount: input.amount,
    rateToEur: input.rateToEur,
    allocation: input.allocation,
    description: input.description.trim(),
    serviceId: input.serviceId
  }
  return input.kind === 'oneTime'
    ? { ...common, kind: 'oneTime', date: input.date }
    : { ...common, kind: 'recurring', recurrence: input.recurrence }
}
