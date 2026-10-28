import { useMemo } from 'react'
import { DataTable, type DataColumn } from '@/components/data/DataTable'
import { StarRating } from '@/components/forms/StarRating'
import { useListLabel } from '@/components/forms/CategorySelect'
import { useCollection } from '@/hooks/useCollection'
import { useFormat, useT } from '@/i18n'
import type { ProjectTabProps } from '../ComingSoon'
import { projectCampaignShares, type ProjectCampaignShare } from './campaign-logic'
import { useCampaignFormat } from './CampaignTable'
import { campaignsDict } from './i18n'

/** Kampagnen eines Projekts mit anteiligen Kosten und Nutzern (PE-49). */
export function ProjectTab({ projectId }: ProjectTabProps) {
  const tc = useT(campaignsDict)
  const fmt = useFormat()
  const { display, money } = useCampaignFormat()
  const platformLabel = useListLabel('campaignPlatforms')
  const formatLabel = useListLabel('campaignFormats')
  const campaigns = useCollection('campaigns')
  const projects = useCollection('projects')

  const rows = useMemo(
    () => projectCampaignShares(campaigns.items, projects.items, projectId),
    [campaigns.items, projects.items, projectId]
  )
  const cur = { currency: display.currency }

  const columns: DataColumn<ProjectCampaignShare>[] = [
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
      header: tc('columnShareCost', cur),
      align: 'right',
      sortValue: (r) => r.costEurCents,
      cell: (r) =>
        r.costEurCents === null ? (
          <span className="whitespace-normal text-destructive">{tc('tabCostUnconvertible')}</span>
        ) : (
          money(r.costEurCents)
        )
    },
    {
      id: 'users',
      header: tc('columnShareUsers'),
      align: 'right',
      sortValue: (r) => r.users,
      cell: (r) => fmt.number(r.users)
    },
    {
      id: 'rating',
      header: tc('columnRating'),
      sortValue: (r) => r.campaign.rating,
      cell: (r) => <StarRating value={r.campaign.rating} readOnly />
    }
  ]

  return (
    <div className="grid gap-2">
      <p className="text-sm text-muted-foreground">{tc('tabHint')}</p>
      <DataTable
        caption={tc('tabCaption')}
        columns={columns}
        rows={rows}
        getRowId={(r) => r.campaign.id}
        loading={campaigns.loading || projects.loading}
        error={campaigns.errorText ?? projects.errorText}
        onRetry={() => {
          void campaigns.reload()
          void projects.reload()
        }}
        empty={<p className="p-4 text-sm text-muted-foreground">{tc('tabEmpty')}</p>}
      />
    </div>
  )
}
