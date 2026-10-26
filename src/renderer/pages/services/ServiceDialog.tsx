import { useMemo, useState } from 'react'
import type { Project } from '@shared/schemas/project'
import type { Service } from '@shared/schemas/service'
import {
  AllocationEditor,
  FieldMessage,
  draftFromAllocation,
  emptyAllocationDraft,
  validateAllocationDraft,
  type AllocationDraft
} from '@/components/forms'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useI18n, useT } from '@/i18n'
import { useEntityMutation } from '@/hooks'
import { PURPOSE_KEYS, servicesDict, type ServicesKey } from './i18n'
import {
  SERVICE_PURPOSES,
  draftFromService,
  emptyServiceDraft,
  validateServiceDraft,
  type ServiceDraft,
  type ServiceIssue
} from './service-logic'

const ISSUE_KEYS: Record<ServiceIssue, ServicesKey> = {
  providerRequired: 'issueProviderRequired',
  tooLong: 'issueTooLong',
  invalidUrl: 'issueInvalidUrl'
}

export interface ServiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Zu bearbeitender Dienst; `null` = neu anlegen. */
  service: Service | null
  projects: readonly Project[]
  today: string
}

/** Dialog zum Anlegen und Bearbeiten eines Dienstes inklusive Aufteilung. */
export function ServiceDialog({
  open,
  onOpenChange,
  service,
  projects,
  today
}: ServiceDialogProps) {
  const tc = useT()
  const tp = useT(servicesDict)
  const { language } = useI18n()
  const { create, update, pending, errorText } = useEntityMutation('services')
  const [draft, setDraft] = useState<ServiceDraft>(() =>
    service ? draftFromService(service) : emptyServiceDraft()
  )
  const [allocation, setAllocation] = useState<AllocationDraft>(() =>
    service ? draftFromAllocation(service.allocation, language) : emptyAllocationDraft()
  )
  const [submitted, setSubmitted] = useState(false)

  const fields = useMemo(() => validateServiceDraft(draft), [draft])
  const allocationResult = useMemo(
    () => validateAllocationDraft(allocation, language),
    [allocation, language]
  )
  const issues = fields.ok ? [] : fields.error
  const set = (patch: Partial<ServiceDraft>) => setDraft((d) => ({ ...d, ...patch }))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (!fields.ok || !allocationResult.allocation) return
    const data = { ...fields.value, allocation: allocationResult.allocation }
    const result = service ? await update(service.id, data) : await create(data)
    if (result.ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={(e) => void submit(e)} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{service ? tp('edit') : tp('add')}</DialogTitle>
            <DialogDescription>{tp('intro')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="svc-provider">{tp('formProvider')}</Label>
            <Input
              id="svc-provider"
              value={draft.provider}
              onChange={(e) => set({ provider: e.target.value })}
              aria-invalid={submitted && issues.includes('providerRequired') ? true : undefined}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="svc-purpose">{tp('formPurpose')}</Label>
            <Select
              id="svc-purpose"
              value={draft.purpose}
              onValueChange={(purpose) => set({ purpose })}
            >
              {SERVICE_PURPOSES.map((p) => (
                <option key={p} value={p}>
                  {tp(PURPOSE_KEYS[p])}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="svc-plan">{tp('formPlan')}</Label>
            <Input
              id="svc-plan"
              value={draft.plan}
              onChange={(e) => set({ plan: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="svc-url">{tp('formUrl')}</Label>
            <Input
              id="svc-url"
              type="url"
              inputMode="url"
              value={draft.url}
              onChange={(e) => set({ url: e.target.value })}
              aria-invalid={submitted && issues.includes('invalidUrl') ? true : undefined}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="svc-note">{tp('formNote')}</Label>
            <Input
              id="svc-note"
              value={draft.note}
              onChange={(e) => set({ note: e.target.value })}
            />
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">{tp('formAllocation')}</legend>
            <AllocationEditor
              value={allocation}
              onChange={setAllocation}
              projects={projects}
              totalCents={null}
              currency="EUR"
              date={today}
            />
          </fieldset>
          {submitted &&
            issues.map((i) => (
              <FieldMessage key={i} error>
                {tp(ISSUE_KEYS[i])}
              </FieldMessage>
            ))}
          {submitted && !allocationResult.allocation && (
            <FieldMessage error>{tp('issueAllocation')}</FieldMessage>
          )}
          <FieldMessage error>{errorText}</FieldMessage>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tc('common.cancel')}
            </Button>
            <Button type="submit" disabled={pending}>
              {tc('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
