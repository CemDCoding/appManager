import type { Campaign } from '@shared/schemas/campaign'
import type { UserMetric } from '@shared/schemas/userMetric'
import { toEur, type CurrencyError } from '@core/currency/currency'
import type { Result } from '@core/money/money'
import {
  activeShares,
  assertRange,
  splitOnto,
  type DateRange,
  type Ledger,
  type LedgerEntry,
  type LedgerProject
} from '@core/ledger/ledger'

/**
 * Metrics (F-07, F-11, F-13; PE-11, PE-36, PE-49, PE-52). Pure integer arithmetic (BigInt
 * where products can leave the safe range), no float for money. Rounding: half-up.
 * "No value" (division by zero, no data) is `null`; the UI shows "-".
 */

/** Integer division rounded half-up for non-negative operands; null if the divisor is 0. */
function divHalfUp(numerator: number | bigint, denominator: number): number | null {
  if (denominator === 0) return null
  const n = BigInt(numerator)
  const d = BigInt(denominator)
  return Number((2n * n + d) / (2n * d))
}

function inRange(date: string, range: DateRange): boolean {
  return date >= range.from && date <= range.to
}

// ---------------------------------------------------------------- persons (F-11, PE-36)

export interface PersonSummary {
  /** Sum of all payments to the person in range (EUR cents). */
  totalCents: number
  /** Per project (null = unallocated); first appearance order by date, then project. */
  byProject: { projectId: string | null; cents: number }[]
  /** Per month "YYYY-MM", ascending. */
  byMonth: { month: string; cents: number }[]
}

/**
 * Payments (expense entries with this `personId`) in `range` (inclusive): total, per project,
 * per month. Projects: ids ascending, `null` (unallocated) last. Throws RangeError for an
 * invalid range.
 */
export function personSummary(ledger: Ledger, personId: string, range: DateRange): PersonSummary {
  assertRange(range)
  const projects = new Map<string | null, number>()
  const months = new Map<string, number>()
  let totalCents = 0
  for (const e of ledger.entries) {
    if (e.kind !== 'expense' || e.personId !== personId || !inRange(e.date, range)) continue
    totalCents += e.eurCents
    projects.set(e.projectId, (projects.get(e.projectId) ?? 0) + e.eurCents)
    const month = e.date.slice(0, 7)
    months.set(month, (months.get(month) ?? 0) + e.eurCents)
  }
  if (!Number.isSafeInteger(totalCents)) throw new RangeError('Sum exceeds the safe integer range')
  const byProject = [...projects]
    .map(([projectId, cents]) => ({ projectId, cents }))
    .sort((a, b) =>
      a.projectId === b.projectId
        ? 0
        : a.projectId === null
          ? 1
          : b.projectId === null
            ? -1
            : a.projectId < b.projectId
              ? -1
              : 1
    )
  const byMonth = [...months]
    .map(([month, cents]) => ({ month, cents }))
    .sort((a, b) => (a.month < b.month ? -1 : 1))
  return { totalCents, byProject, byMonth }
}

// ---------------------------------------------------------------- campaigns (F-07, PE-11)

export interface CampaignKpis {
  /** Campaign cost in EUR cents (snapshot rate, PE-50). */
  costEurCents: number
  /** Cost per click in EUR cents, half-up; null without clicks. */
  cpcCents: number | null
  /** Cost per gained user in EUR cents, half-up; null without gained users. */
  costPerUserCents: number | null
  /** Click-through rate in basis points (clicks / impressions), half-up; null without impressions. */
  ctrBasisPoints: number | null
}

export function campaignKpis(campaign: Campaign): Result<CampaignKpis, CurrencyError> {
  const eur = toEur(campaign.cost, campaign.rateToEur)
  if (!eur.ok) return eur
  const cost = eur.value.cents
  return {
    ok: true,
    value: {
      costEurCents: cost,
      cpcCents: divHalfUp(cost, campaign.clicks),
      costPerUserCents: divHalfUp(cost, campaign.usersGained),
      ctrBasisPoints: divHalfUp(BigInt(campaign.clicks) * 10_000n, campaign.impressions)
    }
  }
}

/**
 * Distributes the gained users of a campaign like its cost (PE-49): same shares as on the
 * start date (active projects only), largest remainder onto whole users. No active project
 * -> one part with `projectId: null`. Sum of `users` is always `usersGained`.
 */
export function campaignUsersByProject(
  campaign: Campaign,
  projects: readonly LedgerProject[]
): { projectId: string | null; users: number }[] {
  const shares = activeShares(campaign.allocation, projects, campaign.startDate)
  return splitOnto(campaign.usersGained, shares).map((p) => ({
    projectId: p.projectId,
    users: p.cents
  }))
}

export type RankingKey = 'costPerUser' | 'rating'

export interface RankedCampaign {
  campaign: Campaign
  kpis: CampaignKpis
}

export interface CampaignRanking {
  items: RankedCampaign[]
  /** Campaigns whose cost could not be converted; not part of `items`. */
  errors: { campaignId: string; error: CurrencyError }[]
}

/**
 * Ranking of campaigns. `costPerUser`: cheapest first, campaigns without a value last.
 * `rating`: most stars first. Ties keep the input order (stable).
 */
export function campaignRanking(campaigns: readonly Campaign[], by: RankingKey): CampaignRanking {
  const items: RankedCampaign[] = []
  const errors: CampaignRanking['errors'] = []
  for (const campaign of campaigns) {
    const kpis = campaignKpis(campaign)
    if (kpis.ok) items.push({ campaign, kpis: kpis.value })
    else errors.push({ campaignId: campaign.id, error: kpis.error })
  }
  if (by === 'rating') {
    items.sort((a, b) => b.campaign.rating - a.campaign.rating)
  } else {
    items.sort((a, b) => {
      const x = a.kpis.costPerUserCents
      const y = b.kpis.costPerUserCents
      if (x === y) return 0
      if (x === null) return 1
      if (y === null) return -1
      return x - y
    })
  }
  return { items, errors }
}

// ---------------------------------------------------------------- users (F-13, PE-38, PE-52)

export interface UserMetrics {
  /** Latest state at or before `range.to` (portfolio: sum of each project's latest); null without data. */
  latest: {
    date: string
    usersTotal: number
    usersActive: number
    usersPaying: number
  } | null
  /** Growth of `usersTotal` in the range; null without data. May be negative. */
  growth: number | null
  /** Expenses in range (EUR cents, incl. campaigns; portfolio incl. unallocated). */
  expenseCents: number
  /** Incomes in range (EUR cents). */
  incomeCents: number
  /** Expenses / growth, half-up; null if growth is not positive or there is no data. */
  costPerUserCents: number | null
  /** Incomes / paying users at the latest snapshot, half-up; null without paying users. */
  incomePerPayingUserCents: number | null
  /** Users gained by campaigns starting in range (for a project: its share, PE-49). */
  campaignUsers: number
  /** campaignUsers / growth in basis points, half-up; null if growth is not positive. */
  campaignShareBasisPoints: number | null
}

interface ProjectState {
  latest: UserMetric
  baseline: UserMetric
}

/** Per project: latest snapshot <= to, baseline = latest before `from`, else first in range. */
function projectState(list: readonly UserMetric[], range: DateRange): ProjectState | null {
  const sorted = [...list].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  const upTo = sorted.filter((s) => s.date <= range.to)
  if (upTo.length === 0) return null
  const before = upTo.filter((s) => s.date < range.from)
  const latest = upTo[upTo.length - 1]
  const baseline = before.length > 0 ? before[before.length - 1] : upTo[0]
  return { latest, baseline }
}

/**
 * User metrics per PE-52 for `range`, for one project or (without `projectId`) the whole
 * portfolio. Definitions: cost per user = expenses / growth; income per paying user =
 * incomes / paying users at the latest snapshot; campaign share = campaign users / growth.
 * Growth = latest total minus the total before the range (the latest snapshot earlier than
 * `from`, else the first snapshot in the range). `projects` are needed to split campaign
 * users onto a project. Throws RangeError for an invalid range.
 */
export function userMetrics(
  snapshots: readonly UserMetric[],
  ledger: Ledger,
  campaigns: readonly Campaign[],
  projectId: string | undefined,
  range: DateRange,
  projects: readonly LedgerProject[]
): UserMetrics {
  assertRange(range)
  const byProject = new Map<string, UserMetric[]>()
  for (const s of snapshots) {
    if (projectId !== undefined && s.projectId !== projectId) continue
    byProject.set(s.projectId, [...(byProject.get(s.projectId) ?? []), s])
  }
  const states = [...byProject.values()]
    .map((list) => projectState(list, range))
    .filter((s): s is ProjectState => s !== null)

  let latest: UserMetrics['latest'] = null
  let growth: number | null = null
  if (states.length > 0) {
    latest = {
      date: states.map((s) => s.latest.date).reduce((a, b) => (a > b ? a : b)),
      usersTotal: states.reduce((a, s) => a + s.latest.usersTotal, 0),
      usersActive: states.reduce((a, s) => a + s.latest.usersActive, 0),
      usersPaying: states.reduce((a, s) => a + s.latest.usersPaying, 0)
    }
    growth = states.reduce((a, s) => a + s.latest.usersTotal - s.baseline.usersTotal, 0)
  }

  const matches = (e: LedgerEntry): boolean =>
    inRange(e.date, range) && (projectId === undefined || e.projectId === projectId)
  let expenseCents = 0
  let incomeCents = 0
  for (const e of ledger.entries) {
    if (!matches(e)) continue
    if (e.kind === 'expense') expenseCents += e.eurCents
    else incomeCents += e.eurCents
  }

  let campaignUsers = 0
  for (const c of campaigns) {
    if (!inRange(c.startDate, range)) continue
    if (projectId === undefined) campaignUsers += c.usersGained
    else {
      campaignUsers += campaignUsersByProject(c, projects)
        .filter((p) => p.projectId === projectId)
        .reduce((a, p) => a + p.users, 0)
    }
  }

  const grown = growth !== null && growth > 0 ? growth : null
  return {
    latest,
    growth,
    expenseCents,
    incomeCents,
    costPerUserCents: grown === null ? null : divHalfUp(expenseCents, grown),
    incomePerPayingUserCents: latest === null ? null : divHalfUp(incomeCents, latest.usersPaying),
    campaignUsers,
    campaignShareBasisPoints:
      grown === null ? null : divHalfUp(BigInt(campaignUsers) * 10_000n, grown)
  }
}
