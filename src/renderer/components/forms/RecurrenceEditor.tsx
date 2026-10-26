import { useId, useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useI18n, useT } from '@/i18n'
import { intervalDict, uiDict, type UiKey } from '@/i18n/shared-keys'
import { cn } from '@/lib/utils'
import { DateInput } from './DateInput'
import { FieldMessage } from './FieldMessage'
import {
  RECURRENCE_INTERVALS,
  validateRecurrenceDraft,
  type RecurrenceDraft,
  type RecurrenceIssue
} from './recurrence-logic'

export interface RecurrenceEditorProps {
  value: RecurrenceDraft
  onChange: (value: RecurrenceDraft) => void
  /** Währung des Grundbetrags; Preisänderungen gelten in derselben Währung. */
  currency: string
  disabled?: boolean
  className?: string
}

const ISSUE_TEXT: Record<RecurrenceIssue['code'], UiKey> = {
  invalidDate: 'invalidDate',
  endBeforeStart: 'endBeforeStart',
  invalidAmount: 'invalidAmount',
  priceChangeBeforeStart: 'priceChangeBeforeStart',
  priceChangeDuplicate: 'priceChangeDuplicate'
}

/**
 * Wiederholung (PE-07, PE-29): Intervall, Start, optionales Ende und Preisänderungen
 * „ab Datum neuer Betrag“. Der Grundbetrag kommt aus dem `MoneyInput` des Formulars.
 * Beim Speichern `validateRecurrenceDraft(value, language)` aufrufen.
 *
 * @example
 * const [rec, setRec] = useState(() => emptyRecurrenceDraft(today))
 * <RecurrenceEditor value={rec} onChange={setRec} currency={money.currency} />
 */
export function RecurrenceEditor({
  value,
  onChange,
  currency,
  disabled,
  className
}: RecurrenceEditorProps) {
  const t = useT(uiDict)
  const ti = useT(intervalDict)
  const { language } = useI18n()
  const id = useId()

  const issues = useMemo(() => {
    const r = validateRecurrenceDraft(value, language)
    return r.ok ? [] : r.error
  }, [value, language])
  const issueFor = (field: 'startDate' | 'endDate'): string | null => {
    const found = issues.find((i) => i.field === field)
    return found ? t(ISSUE_TEXT[found.code]) : null
  }
  // Leere Pflichtdaten erst beim Speichern als Fehler anzeigen, nicht beim Tippen.
  const shown = (text: string | null, raw: string) => (raw === '' ? null : text)

  const updateChange = (index: number, patch: Partial<RecurrenceDraft['priceChanges'][number]>) =>
    onChange({
      ...value,
      priceChanges: value.priceChanges.map((p, i) => (i === index ? { ...p, ...patch } : p))
    })

  const startError = shown(issueFor('startDate'), value.startDate)
  const endError = shown(issueFor('endDate'), value.endDate)

  return (
    <fieldset className={cn('grid gap-4', className)} disabled={disabled}>
      <legend className="mb-2 text-sm font-medium">{t('recurrence')}</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor={`${id}-interval`}>{t('interval')}</Label>
          <Select
            id={`${id}-interval`}
            value={value.interval}
            onValueChange={(v) => {
              const interval = RECURRENCE_INTERVALS.find((i) => i === v)
              if (interval) onChange({ ...value, interval })
            }}
          >
            {RECURRENCE_INTERVALS.map((i) => (
              <option key={i} value={i}>
                {ti(i)}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-start`}>{t('startDate')}</Label>
          <DateInput
            id={`${id}-start`}
            required
            value={value.startDate}
            invalid={startError !== null}
            onValueChange={(startDate) => onChange({ ...value, startDate })}
          />
          <FieldMessage error>{startError}</FieldMessage>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-end`}>{t('endDate')}</Label>
          <DateInput
            id={`${id}-end`}
            value={value.endDate}
            min={value.startDate || undefined}
            invalid={endError !== null}
            onValueChange={(endDate) => onChange({ ...value, endDate })}
          />
          <FieldMessage error>{endError}</FieldMessage>
        </div>
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-medium">{t('priceChanges')}</p>
        {value.priceChanges.map((p, index) => {
          // Leere Felder erst beim Speichern bemängeln (der Aufrufer prüft dort erneut).
          const issue = issues.find(
            (i) =>
              i.field === 'priceChange' &&
              i.index === index &&
              !(i.code === 'invalidDate' && p.fromDate === '') &&
              !(i.code === 'invalidAmount' && p.amountText === '')
          )
          const error = issue ? t(ISSUE_TEXT[issue.code]) : null
          return (
            <div key={index} className="grid gap-1">
              <div className="flex flex-wrap items-end gap-2">
                <div className="grid gap-1">
                  <Label htmlFor={`${id}-pc-date-${index}`}>{t('priceChangeFrom')}</Label>
                  <DateInput
                    id={`${id}-pc-date-${index}`}
                    value={p.fromDate}
                    min={value.startDate || undefined}
                    onValueChange={(fromDate) => updateChange(index, { fromDate })}
                    className="w-44"
                  />
                </div>
                <div className="grid flex-1 gap-1">
                  <Label htmlFor={`${id}-pc-amount-${index}`}>
                    {t('priceChangeAmount', { currency })}
                  </Label>
                  <Input
                    id={`${id}-pc-amount-${index}`}
                    inputMode="decimal"
                    value={p.amountText}
                    onChange={(e) => updateChange(index, { amountText: e.target.value })}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t('removePriceChange')}
                  title={t('removePriceChange')}
                  onClick={() =>
                    onChange({
                      ...value,
                      priceChanges: value.priceChanges.filter((_, i) => i !== index)
                    })
                  }
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
              <FieldMessage error>{error}</FieldMessage>
            </div>
          )
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() =>
            onChange({
              ...value,
              priceChanges: [...value.priceChanges, { fromDate: '', amountText: '' }]
            })
          }
        >
          <Plus aria-hidden="true" />
          {t('addPriceChange')}
        </Button>
      </div>
    </fieldset>
  )
}
