import { useCallback, useId, useMemo, useState, type FormEvent } from 'react'
import { TriangleAlert } from 'lucide-react'
import { MAX_NOTE_LENGTH } from '@shared/limits'
import type { Campaign } from '@shared/schemas/campaign'
import { AllocationEditor } from '@/components/forms/AllocationEditor'
import { validateAllocationDraft, type AllocationDraft } from '@/components/forms/allocation-logic'
import { CategorySelect } from '@/components/forms/CategorySelect'
import { DateInput } from '@/components/forms/DateInput'
import { FieldMessage } from '@/components/forms/FieldMessage'
import { MoneyInput } from '@/components/forms/MoneyInput'
import { parseAmountToCents, type MoneyDraft } from '@/components/forms/money-logic'
import { StarRating } from '@/components/forms/StarRating'
import { Button } from '@/components/ui/button'
import { fieldClassName, Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCollection } from '@/hooks/useCollection'
import { useEntityMutation } from '@/hooks/useEntityMutation'
import { useI18n, useT } from '@/i18n'
import { uiDict, type UiKey } from '@/i18n/shared-keys'
import { cn } from '@/lib/utils'
import {
  campaignDraftFrom,
  campaignDraftToInput,
  emptyCampaignDraft,
  type CampaignDraft,
  type CampaignIssue
} from './campaign-logic'
import { campaignsDict, type CampaignsKey } from './i18n'

export interface CampaignFormProps {
  /** Bestehende Kampagne bearbeiten (sonst neu anlegen). */
  campaign?: Campaign
  /** Heutiges Datum "YYYY-MM-DD" für neue Kampagnen. */
  today: string
  onSaved?: (campaign: Campaign) => void
  onCancel?: () => void
}

const UI_ISSUES: Partial<Record<CampaignIssue, UiKey>> = {
  invalidDate: 'invalidDate',
  invalidAmount: 'invalidAmount',
  invalidCurrency: 'invalidCurrency',
  invalidRate: 'invalidRate'
}

/**
 * Kampagnen-Maske mit allen Feldern (F-07, PE-11): Plattform/Format aus den Listen der
 * Einstellungen, Kosten mit Kurs-Snapshot, Aufteilung (PE-49), Sterne und Notiz.
 * Zum Neuvorbelegen die Komponente mit `key` neu mounten.
 */
export function CampaignForm({ campaign, today, onSaved, onCancel }: CampaignFormProps) {
  const tc = useT(campaignsDict)
  const tu = useT(uiDict)
  const t = useT()
  const { language } = useI18n()
  const id = useId()
  const { items: projects } = useCollection('projects')
  const { create, update, pending, errorText } = useEntityMutation('campaigns')

  const [draft, setDraft] = useState<CampaignDraft>(() =>
    campaign ? campaignDraftFrom(campaign, language) : emptyCampaignDraft(today)
  )
  const [issues, setIssues] = useState<CampaignIssue[]>([])

  const patch = useCallback((p: Partial<CampaignDraft>) => setDraft((d) => ({ ...d, ...p })), [])
  const setMoney = useCallback((money: MoneyDraft) => patch({ money }), [patch])
  const setAllocation = useCallback((allocation: AllocationDraft) => patch({ allocation }), [patch])

  const allocationOk = useMemo(
    () => validateAllocationDraft(draft.allocation, language).allocation !== null,
    [draft.allocation, language]
  )
  const amount = parseAmountToCents(draft.money.amountText, language)
  const has = (issue: CampaignIssue) => issues.includes(issue)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const parsed = campaignDraftToInput(draft, language)
    if (!parsed.ok) {
      setIssues(parsed.error)
      return
    }
    setIssues([])
    const res = campaign ? await update(campaign.id, parsed.value) : await create(parsed.value)
    if (res.ok) onSaved?.(res.data)
  }

  const issueText = (issue: CampaignIssue): string => {
    const ui = UI_ISSUES[issue]
    if (ui) return tu(ui)
    if (issue === 'noteTooLong') return tc('noteTooLong', { max: MAX_NOTE_LENGTH })
    return tc(issue as CampaignsKey)
  }

  const countField = (key: 'impressions' | 'clicks' | 'usersGained', label: string) => (
    <div className="grid gap-2">
      <Label htmlFor={`${id}-${key}`}>{label}</Label>
      <Input
        id={`${id}-${key}`}
        inputMode="numeric"
        value={draft[key]}
        aria-invalid={has('invalidCount') || undefined}
        onChange={(e) => patch({ [key]: e.target.value })}
      />
    </div>
  )

  return (
    <form className="grid gap-5" onSubmit={(e) => void submit(e)} noValidate>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-name`}>{tc('name')}</Label>
        <Input
          id={`${id}-name`}
          value={draft.name}
          maxLength={200}
          aria-invalid={has('nameRequired') || undefined}
          onChange={(e) => patch({ name: e.target.value })}
        />
        <FieldMessage error>{has('nameRequired') ? tc('nameRequired') : null}</FieldMessage>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label className="grid gap-2">
            {tc('platform')}
            <CategorySelect
              list="campaignPlatforms"
              aria-label={tc('platform')}
              value={draft.platform}
              onChange={(platform) => patch({ platform })}
            />
          </Label>
          <FieldMessage error>
            {has('platformRequired') ? tc('platformRequired') : null}
          </FieldMessage>
        </div>
        <div className="grid gap-2">
          <Label className="grid gap-2">
            {tc('format')}
            <CategorySelect
              list="campaignFormats"
              aria-label={tc('format')}
              value={draft.format}
              onChange={(format) => patch({ format })}
            />
          </Label>
          <FieldMessage error>{has('formatRequired') ? tc('formatRequired') : null}</FieldMessage>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${id}-start`}>{tc('startDate')}</Label>
          <DateInput
            id={`${id}-start`}
            required
            value={draft.startDate}
            invalid={has('invalidDate') || undefined}
            onValueChange={(startDate) => patch({ startDate })}
            className="w-44"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-end`}>{tc('endDate')}</Label>
          <DateInput
            id={`${id}-end`}
            required
            value={draft.endDate}
            invalid={has('invalidDate') || has('endBeforeStart') || undefined}
            onValueChange={(endDate) => patch({ endDate })}
            className="w-44"
          />
          <FieldMessage error>{has('endBeforeStart') ? tc('endBeforeStart') : null}</FieldMessage>
        </div>
      </div>

      <MoneyInput value={draft.money} onChange={setMoney} label={tc('cost')} />

      <div className="grid gap-4 sm:grid-cols-3">
        {countField('impressions', tc('impressions'))}
        {countField('clicks', tc('clicks'))}
        {countField('usersGained', tc('usersGained'))}
      </div>
      <FieldMessage error>{has('invalidCount') ? tc('invalidCount') : null}</FieldMessage>

      <div className="grid gap-2">
        <Label>{tc('rating')}</Label>
        <StarRating
          value={draft.rating}
          onChange={(rating) => patch({ rating })}
          aria-label={tc('rating')}
        />
      </div>

      <AllocationEditor
        value={draft.allocation}
        onChange={setAllocation}
        projects={projects}
        totalCents={amount.ok ? amount.value : null}
        currency={draft.money.currency}
        date={draft.startDate}
      />

      <div className="grid gap-2">
        <Label htmlFor={`${id}-note`}>{tc('note')}</Label>
        <textarea
          id={`${id}-note`}
          value={draft.note}
          rows={2}
          maxLength={MAX_NOTE_LENGTH}
          onChange={(e) => patch({ note: e.target.value })}
          className={cn(fieldClassName, 'h-auto py-2')}
        />
      </div>

      {issues.length > 0 && (
        <div
          role="alert"
          className="grid gap-1 rounded-md border border-destructive/40 p-3 text-sm"
        >
          <p className="flex items-center gap-2 font-medium text-destructive">
            <TriangleAlert aria-hidden="true" className="size-4" />
            {tc('fixErrors')}
          </p>
          <ul className="list-disc pl-6 text-destructive">
            {[...new Set(issues)].map((issue) => (
              <li key={issue}>{issueText(issue)}</li>
            ))}
          </ul>
        </div>
      )}
      <FieldMessage error>{errorText}</FieldMessage>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={pending}>
            {t('common.cancel')}
          </Button>
        )}
        <Button type="submit" disabled={pending || !allocationOk} aria-busy={pending || undefined}>
          {pending ? tu('saving') : t('common.save')}
        </Button>
      </div>
    </form>
  )
}
