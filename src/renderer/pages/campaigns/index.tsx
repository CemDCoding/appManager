import { useState } from 'react'
import { Plus } from 'lucide-react'
import { ConfirmDialog } from '@/components/forms/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useCollection } from '@/hooks/useCollection'
import { useEntityMutation } from '@/hooks/useEntityMutation'
import { useT } from '@/i18n'
import { localToday } from '@/features/bookings'
import { CampaignForm, CampaignTable, campaignsDict } from '@/features/campaigns'
import type { Campaign } from '@shared/schemas/campaign'

type FormState =
  { mode: 'closed' } | { mode: 'create'; seq: number } | { mode: 'edit'; campaign: Campaign }

/** Werbekampagnen (F-07): erfassen, bewerten, vergleichen. */
export function CampaignsPage() {
  const tc = useT(campaignsDict)
  const t = useT()
  const campaigns = useCollection('campaigns')
  const { remove, errorText: removeError, reset } = useEntityMutation('campaigns')
  const [form, setForm] = useState<FormState>({ mode: 'closed' })
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const close = () => setForm({ mode: 'closed' })
  const byId = (id: string) => campaigns.items.find((c) => c.id === id)

  return (
    <section className="grid gap-6" aria-label={tc('title')}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-prose text-sm text-muted-foreground">{tc('intro')}</p>
        <Button onClick={() => setForm({ mode: 'create', seq: Date.now() })}>
          <Plus aria-hidden="true" />
          {tc('add')}
        </Button>
      </header>

      <CampaignTable
        campaigns={campaigns.items}
        loading={campaigns.loading}
        error={campaigns.errorText}
        onRetry={() => void campaigns.reload()}
        onEdit={(id) => {
          const campaign = byId(id)
          if (campaign) setForm({ mode: 'edit', campaign })
        }}
        onDelete={(id) => {
          reset()
          setDeleteId(id)
        }}
      />

      <Dialog open={form.mode !== 'closed'} onOpenChange={(open) => !open && close()}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {form.mode === 'edit' ? tc('editCampaign') : tc('newCampaign')}
            </DialogTitle>
          </DialogHeader>
          {form.mode === 'edit' && (
            <CampaignForm
              key={form.campaign.id}
              campaign={form.campaign}
              today={localToday()}
              onSaved={close}
              onCancel={close}
            />
          )}
          {form.mode === 'create' && (
            <CampaignForm key={form.seq} today={localToday()} onSaved={close} onCancel={close} />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        destructive
        title={tc('deleteTitle')}
        description={tc('deleteText')}
        confirmLabel={t('common.delete')}
        error={removeError}
        onConfirm={async () => (deleteId ? (await remove(deleteId)).ok : true)}
      />
    </section>
  )
}
