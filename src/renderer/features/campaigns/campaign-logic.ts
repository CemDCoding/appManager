import type { EntityInput } from '@shared/ipc'
import { MAX_NOTE_LENGTH } from '@shared/limits'
import { isValidDateString, KeySchema, LOCAL_OWNER } from '@shared/schemas/common'
import { CampaignSchema, type Campaign } from '@shared/schemas/campaign'
import { buildLedger } from '@core/ledger/ledger'
import { campaignUsersByProject } from '@core/metrics/metrics'
import type { Project } from '@shared/schemas/project'
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
import type { Language } from '@/i18n/types'

/**
 * Reine Abbildung Formular-Entwurf → Kampagne (AP-18). Keine Kennzahlen-Rechnung:
 * CPC, Kosten/Nutzer, CTR und Aufteilung kommen ausschließlich aus `@core/metrics`
 * bzw. `@core/ledger`.
 */

export interface CampaignDraft {
  name: string
  platform: string
  format: string
  startDate: string
  endDate: string
  money: MoneyDraft
  allocation: AllocationDraft
  /** Zähler als Text; leer = 0. */
  impressions: string
  clicks: string
  usersGained: string
  rating: number
  note: string
}

export type CampaignIssue =
  | 'nameRequired'
  | 'platformRequired'
  | 'formatRequired'
  | 'invalidDate'
  | 'endBeforeStart'
  | 'invalidCount'
  | MoneyDraftError
  | 'allocationInvalid'
  | 'noteTooLong'
  | 'schemaInvalid'

export type CampaignFormResult =
  { ok: true; value: EntityInput<'campaigns'> } | { ok: false; error: CampaignIssue[] }

export function emptyCampaignDraft(today: string): CampaignDraft {
  return {
    name: '',
    platform: '',
    format: '',
    startDate: today,
    endDate: today,
    money: emptyMoneyDraft(),
    allocation: emptyAllocationDraft(),
    impressions: '',
    clicks: '',
    usersGained: '',
    rating: 0,
    note: ''
  }
}

export function campaignDraftFrom(campaign: Campaign, language: Language): CampaignDraft {
  return {
    name: campaign.name,
    platform: campaign.platform,
    format: campaign.format,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    money: moneyDraftFrom(campaign.cost, campaign.rateToEur, language),
    allocation: draftFromAllocation(campaign.allocation, language),
    impressions: String(campaign.impressions),
    clicks: String(campaign.clicks),
    usersGained: String(campaign.usersGained),
    rating: campaign.rating,
    note: campaign.note
  }
}

/** Ganzzahl ≥ 0 aus Text (nur Ziffern); leer = 0; sonst `null`. */
export function parseCount(text: string): number | null {
  const trimmed = text.trim()
  if (trimmed === '') return 0
  if (!/^\d{1,15}$/.test(trimmed)) return null
  return Number(trimmed)
}

const PROBE_BASE = {
  id: '00000000-0000-4000-8000-000000000000',
  ownerId: LOCAL_OWNER,
  createdAt: '1970-01-01T00:00:00.000Z',
  updatedAt: '1970-01-01T00:00:00.000Z'
}

/** Entwurf → Eingabe für `entity.create/update('campaigns', …)`; liefert alle Probleme auf einmal. */
export function campaignDraftToInput(draft: CampaignDraft, language: Language): CampaignFormResult {
  const issues: CampaignIssue[] = []
  const name = draft.name.trim()
  if (name === '') issues.push('nameRequired')
  if (draft.platform === '' || !KeySchema.safeParse(draft.platform).success) {
    issues.push('platformRequired')
  }
  if (draft.format === '' || !KeySchema.safeParse(draft.format).success) {
    issues.push('formatRequired')
  }
  const startOk = isValidDateString(draft.startDate)
  const endOk = isValidDateString(draft.endDate)
  if (!startOk || !endOk) issues.push('invalidDate')
  else if (draft.endDate < draft.startDate) issues.push('endBeforeStart')

  const money = parseMoneyDraft(draft.money, language)
  if (!money.ok) issues.push(money.error)

  const impressions = parseCount(draft.impressions)
  const clicks = parseCount(draft.clicks)
  const usersGained = parseCount(draft.usersGained)
  if (impressions === null || clicks === null || usersGained === null) issues.push('invalidCount')

  const { allocation } = validateAllocationDraft(draft.allocation, language)
  if (allocation === null) issues.push('allocationInvalid')

  const note = draft.note.trim()
  if (note.length > MAX_NOTE_LENGTH) issues.push('noteTooLong')

  if (
    issues.length > 0 ||
    !money.ok ||
    allocation === null ||
    impressions === null ||
    clicks === null ||
    usersGained === null
  ) {
    return { ok: false, error: issues }
  }
  const input: EntityInput<'campaigns'> = {
    name,
    platform: draft.platform,
    format: draft.format,
    startDate: draft.startDate,
    endDate: draft.endDate,
    cost: money.value.amount,
    rateToEur: money.value.rateToEur,
    allocation,
    impressions,
    clicks,
    usersGained,
    rating: draft.rating,
    note
  }
  if (!CampaignSchema.safeParse({ ...PROBE_BASE, ...input }).success) {
    return { ok: false, error: ['schemaInvalid'] }
  }
  return { ok: true, value: input }
}

/** Anteil einer Kampagne an einem Projekt (PE-49): Kosten aus dem Ledger, Nutzer aus dem Kern. */
export interface ProjectCampaignShare {
  campaign: Campaign
  /** Anteilige Kosten in EUR-Cent; `null`, wenn nicht umrechenbar. */
  costEurCents: number | null
  users: number
}

/**
 * Kampagnen, die dem Projekt Kosten oder Nutzer zuweisen (am Startdatum aktive Anteile),
 * mit anteiligen Kosten (`buildLedger`) und Nutzern (`campaignUsersByProject`).
 */
export function projectCampaignShares(
  campaigns: readonly Campaign[],
  projects: readonly Project[],
  projectId: string
): ProjectCampaignShare[] {
  const result: ProjectCampaignShare[] = []
  for (const campaign of campaigns) {
    const users = campaignUsersByProject(campaign, projects).find((p) => p.projectId === projectId)
    const ledger = buildLedger(
      { projects, expenses: [], incomes: [], campaigns: [campaign] },
      { from: campaign.startDate, to: campaign.startDate }
    )
    const entry = ledger.entries.find((e) => e.projectId === projectId)
    if (!users && !entry) continue
    result.push({
      campaign,
      costEurCents: entry ? entry.eurCents : ledger.errors.length > 0 ? null : 0,
      users: users?.users ?? 0
    })
  }
  return result
}
