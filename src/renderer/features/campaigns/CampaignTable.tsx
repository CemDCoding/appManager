import { useMemo } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { campaignRanking } from '@core/metrics/metrics'
import type { Campaign } from '@shared/schemas/campaign'
import { DataTable, type DataColumn } from '@/components/data/DataTable'
import { StarRating } from '@/components/forms/StarRating'
import { useListLabel } from '@/components/forms/CategorySelect'
import { Button } from '@/components/ui/button'
import { useFormat, useT } from '@/i18n'
import { uiDict } from '@/i18n/shared-keys'
import { useDisplayCurrency } from '@/state/DisplayCurrencyProvider'
import { campaignsDict, type CampaignsKey } from './i18n'

const ERROR_KEYS: Record<string, CampaignsKey> = {
  missingRate: 'errorMissingRate',
  invalidRate: 'errorInvalidRate',
  invalidAmount: 'errorInvalidAmount',
  overflow: 'errorOverflow'
}

export interface CampaignTableProps {
  campaigns: readonly Campaign[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  loading: boolean
  error: string | null
  onRetry: () => void
}

/** Anzeige von Cent-Kennzahlen: `null` (Division durch 0) als „–“. */
export function useCampaignFormat() {
  const fmt = useFormat()
  const display = useDisplayCurrency()
  return {
    display,
    money: (cents: number | null) => (cents === null ? '–' : display.format(cents).text),
    ctr: (basisPoints: number | null) =>
      basisPoints === null ? '–' : fmt.percent(basisPoints / 10_000, 2)
  }
}

/**
 * Kampagnenliste mit Kennzahlen aus `campaignRanking` (Kern). Nicht umrechenbare
 * Kampagnen stehen sichtbar unter der Tabelle.
 */
export function CampaignTable({
  campaigns,
  onEdit,
  onDelete,
  loading,
  error,
  onRetry
}: CampaignTableProps) {
  const tc = useT(campaignsDict)
  const tu = useT(uiDict)
  const fmt = useFormat()
  const { display, money, ctr } = useCampaignFormat()
  const platformLabel = useListLabel('campaignPlatforms')
  const formatLabel = useListLabel('campaignFormats')

  const ranking = useMemo(() => campaignRanking(campaigns, 'costPerUser'), [campaigns])
  const names = useMemo(() => new Map(campaigns.map((c) => [c.id, c.name])), [campaigns])
  const cur = { currency: display.currency }

  const columns: DataColumn<(typeof ranking.items)[number]>[] = [
    {
      id: 'name',
      header: tc('columnName'),
      sortValue: (r) => r.campaign.name,
      cell: (r) => <span className="whitespace-normal">{r.campaign.name}</span>
    },
    {
      id: 'platform',
      header: tc('columnPlatform'),
      sortValue: (r) => platformLabel(r.campaign.platform),
      cell: (r) => platformLabel(r.campaign.platform)
    },
    {
      id: 'format',
      header: tc('columnFormat'),
      sortValue: (r) => formatLabel(r.campaign.format),
      cell: (r) => formatLabel(r.campaign.format)
    },
    {
      id: 'period',
      header: tc('columnPeriod'),
      sortValue: (r) => r.campaign.startDate,
      cell: (r) => `${fmt.date(r.campaign.startDate)} – ${fmt.date(r.campaign.endDate)}`
    },
    {
      id: 'cost',
      header: tc('columnCost', cur),
      align: 'right',
      sortValue: (r) => r.kpis.costEurCents,
      cell: (r) => money(r.kpis.costEurCents)
    },
    {
      id: 'clicks',
      header: tc('columnClicks'),
      align: 'right',
      sortValue: (r) => r.campaign.clicks,
      cell: (r) => fmt.number(r.campaign.clicks)
    },
    {
      id: 'users',
      header: tc('columnUsers'),
      align: 'right',
      sortValue: (r) => r.campaign.usersGained,
      cell: (r) => fmt.number(r.campaign.usersGained)
    },
    {
      id: 'cpc',
      header: tc('columnCpc', cur),
      align: 'right',
      sortValue: (r) => r.kpis.cpcCents,
      cell: (r) => money(r.kpis.cpcCents)
    },
    {
      id: 'costPerUser',
      header: tc('columnCostPerUser', cur),
      align: 'right',
      sortValue: (r) => r.kpis.costPerUserCents,
      cell: (r) => money(r.kpis.costPerUserCents)
    },
    {
      id: 'ctr',
      header: tc('columnCtr'),
      align: 'right',
      sortValue: (r) => r.kpis.ctrBasisPoints,
      cell: (r) => ctr(r.kpis.ctrBasisPoints)
    },
    {
      id: 'rating',
      header: tc('columnRating'),
      sortValue: (r) => r.campaign.rating,
      cell: (r) => <StarRating value={r.campaign.rating} readOnly />
    },
    {
      id: 'actions',
      header: tc('columnActions'),
      align: 'right',
      cell: (r) => (
        <span className="inline-flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={tc('editEntry')}
            title={tc('editEntry')}
            onClick={(e) => {
              e.stopPropagation()
              onEdit(r.campaign.id)
            }}
          >
            <Pencil aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={tc('deleteEntry')}
            title={tc('deleteEntry')}
            onClick={(e) => {
              e.stopPropagation()
              onDelete(r.campaign.id)
            }}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </span>
      )
    }
  ]

  return (
    <div className="grid gap-2">
      <DataTable
        caption={tc('caption')}
        columns={columns}
        rows={ranking.items}
        getRowId={(r) => r.campaign.id}
        loading={loading}
        error={error}
        onRetry={onRetry}
        onRowClick={(r) => onEdit(r.campaign.id)}
        empty={<p className="p-4 text-sm text-muted-foreground">{tc('empty')}</p>}
      />
      {ranking.errors.length > 0 && (
        <ul role="alert" className="list-disc pl-6 text-sm text-destructive">
          {ranking.errors.map((e) => (
            <li key={e.campaignId}>
              {tc('unconvertible', {
                name: names.get(e.campaignId) ?? e.campaignId,
                reason: tc(ERROR_KEYS[e.error] ?? 'errorInvalidAmount')
              })}
              <Button
                variant="link"
                className="h-auto p-0 pl-2"
                onClick={() => onEdit(e.campaignId)}
              >
                {tc('editEntry')}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {display.converted && (
        <p className="text-xs text-muted-foreground">
          {display.missingRate
            ? tu('displayMissingRate', { currency: display.currency })
            : tu('convertedHint', { currency: display.currency })}
        </p>
      )}
    </div>
  )
}
