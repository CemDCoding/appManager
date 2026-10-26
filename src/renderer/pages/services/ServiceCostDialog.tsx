import { useMemo, useState } from 'react'
import type { Project } from '@shared/schemas/project'
import type { Service } from '@shared/schemas/service'
import {
  AllocationEditor,
  CategorySelect,
  DateInput,
  FieldMessage,
  MoneyInput,
  RecurrenceEditor,
  draftFromAllocation,
  emptyMoneyDraft,
  emptyRecurrenceDraft,
  parseMoneyDraft,
  validateAllocationDraft,
  validateRecurrenceDraft,
  type AllocationDraft,
  type MoneyDraft,
  type RecurrenceDraft
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useI18n, useT } from '@/i18n'
import { useEntityMutation } from '@/hooks'
import { servicesDict } from './i18n'
import { buildServiceExpense, categoryForPurpose, type CostKind } from './service-logic'

export interface ServiceCostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  service: Service
  projects: readonly Project[]
  today: string
}

/**
 * Legt eine Ausgabe mit `serviceId`, passender Kategorie und der Aufteilung des Dienstes
 * an (einmalig oder wiederkehrend). Eigenes Formular, bis die gemeinsame Ausgaben-Maske
 * (AP-14) vorliegt.
 */
export function ServiceCostDialog({
  open,
  onOpenChange,
  service,
  projects,
  today
}: ServiceCostDialogProps) {
  const tc = useT()
  const tp = useT(servicesDict)
  const { language } = useI18n()
  const { create, pending, errorText } = useEntityMutation('expenses')
  const [kind, setKind] = useState<CostKind>('recurring')
  const [category, setCategory] = useState(() => categoryForPurpose(service.purpose))
  const [description, setDescription] = useState(service.plan)
  const [money, setMoney] = useState<MoneyDraft>(() => emptyMoneyDraft())
  const [date, setDate] = useState(today)
  const [recurrence, setRecurrence] = useState<RecurrenceDraft>(() => emptyRecurrenceDraft(today))
  const [allocation, setAllocation] = useState<AllocationDraft>(() =>
    draftFromAllocation(service.allocation, language)
  )
  const [submitted, setSubmitted] = useState(false)

  const parsedMoney = useMemo(() => parseMoneyDraft(money, language), [money, language])
  const allocationResult = useMemo(
    () => validateAllocationDraft(allocation, language),
    [allocation, language]
  )
  const recurrenceResult = useMemo(
    () => validateRecurrenceDraft(recurrence, language),
    [recurrence, language]
  )
  const totalCents = parsedMoney.ok ? parsedMoney.value.amount.cents : null
  const effectiveDate = kind === 'oneTime' ? date : recurrence.startDate
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(date)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (!parsedMoney.ok || !allocationResult.allocation || category === '') return
    if (kind === 'oneTime' && !dateValid) return
    if (kind === 'recurring' && !recurrenceResult.ok) return
    const result = await create(
      buildServiceExpense({
        serviceId: service.id,
        category,
        amount: parsedMoney.value.amount,
        rateToEur: parsedMoney.value.rateToEur,
        allocation: allocationResult.allocation,
        description: description || service.provider,
        kind,
        date,
        recurrence: recurrenceResult.ok
          ? recurrenceResult.value
          : { interval: 'monthly', startDate: today, priceChanges: [] }
      })
    )
    if (result.ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={(e) => void submit(e)} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{tp('costTitle', { name: service.provider })}</DialogTitle>
            <DialogDescription>{tp('costAllocationHint')}</DialogDescription>
          </DialogHeader>
          <RadioGroup
            value={kind}
            onValueChange={(v) => setKind(v as CostKind)}
            aria-label={tp('costKind')}
            className="flex gap-4"
          >
            <Label>
              <RadioGroupItem value="recurring" /> {tp('kindRecurring')}
            </Label>
            <Label>
              <RadioGroupItem value="oneTime" /> {tp('kindOneTime')}
            </Label>
          </RadioGroup>
          <div className="grid gap-1.5">
            <Label>{tp('costCategory')}</Label>
            <CategorySelect list="expenseCategories" value={category} onChange={setCategory} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cost-desc">{tp('costDescription')}</Label>
            <Input
              id="cost-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <MoneyInput value={money} onChange={setMoney} />
          {submitted && !parsedMoney.ok && (
            <FieldMessage error>{tp('costMoneyInvalid')}</FieldMessage>
          )}
          {kind === 'oneTime' ? (
            <div className="grid gap-1.5">
              <Label htmlFor="cost-date">{tp('costDate')}</Label>
              <DateInput id="cost-date" value={date} onValueChange={setDate} required />
              {submitted && !dateValid && (
                <FieldMessage error>{tp('costDateInvalid')}</FieldMessage>
              )}
            </div>
          ) : (
            <>
              <RecurrenceEditor
                value={recurrence}
                onChange={setRecurrence}
                currency={money.currency}
              />
              {submitted && !recurrenceResult.ok && (
                <FieldMessage error>{tp('costRecurrenceInvalid')}</FieldMessage>
              )}
            </>
          )}
          <AllocationEditor
            value={allocation}
            onChange={setAllocation}
            projects={projects}
            totalCents={totalCents}
            currency={money.currency}
            date={dateValid || kind === 'recurring' ? effectiveDate : today}
          />
          {submitted && !allocationResult.allocation && (
            <FieldMessage error>{tp('issueAllocation')}</FieldMessage>
          )}
          <FieldMessage error>{errorText}</FieldMessage>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tc('common.cancel')}
            </Button>
            <Button type="submit" disabled={pending}>
              {tp('costSave')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
