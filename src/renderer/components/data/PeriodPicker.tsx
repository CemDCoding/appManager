import { useId } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DateInput } from '@/components/forms/DateInput'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useFormat, useT } from '@/i18n'
import { uiDict, type UiKey } from '@/i18n/shared-keys'
import { cn } from '@/lib/utils'
import {
  changePeriodKind,
  PERIOD_KINDS,
  quarterOf,
  shiftPeriod,
  type Period,
  type PeriodKind
} from './period-logic'

export interface PeriodPickerProps {
  value: Period
  onChange: (value: Period) => void
  /** Erlaubte Arten (Standard: alle). */
  kinds?: readonly PeriodKind[]
  className?: string
}

const KIND_KEYS: Record<PeriodKind, UiKey> = {
  month: 'periodMonth',
  quarter: 'periodQuarter',
  year: 'periodYear',
  custom: 'periodCustom'
}

/**
 * Zeitraumwahl: Monat, Quartal, Jahr (mit vor/zurück) oder frei (von/bis).
 * `value.from`/`value.to` sind inklusive und passen direkt zu `buildLedger`.
 *
 * @example
 * const [period, setPeriod] = useState(() => periodFor('month', today))
 * <PeriodPicker value={period} onChange={setPeriod} />
 */
export function PeriodPicker({
  value,
  onChange,
  kinds = PERIOD_KINDS,
  className
}: PeriodPickerProps) {
  const t = useT(uiDict)
  const fmt = useFormat()
  const id = useId()

  const label =
    value.kind === 'month'
      ? fmt.date(value.from, { month: 'long', year: 'numeric' })
      : value.kind === 'quarter'
        ? t('quarterLabel', { quarter: quarterOf(value.from), year: value.from.slice(0, 4) })
        : value.kind === 'year'
          ? value.from.slice(0, 4)
          : null

  return (
    <div
      role="group"
      aria-label={t('period')}
      className={cn('flex flex-wrap items-end gap-2', className)}
    >
      <Select
        aria-label={t('period')}
        value={value.kind}
        onValueChange={(v) => {
          const kind = kinds.find((k) => k === v)
          if (kind) onChange(changePeriodKind(value, kind))
        }}
        className="w-28"
      >
        {kinds.map((k) => (
          <option key={k} value={k}>
            {t(KIND_KEYS[k])}
          </option>
        ))}
      </Select>

      {label !== null ? (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('periodPrevious')}
            title={t('periodPrevious')}
            onClick={() => onChange(shiftPeriod(value, -1))}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span className="min-w-32 text-center text-sm font-medium" aria-live="polite">
            {label}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('periodNext')}
            title={t('periodNext')}
            onClick={() => onChange(shiftPeriod(value, 1))}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1">
            <Label htmlFor={`${id}-from`}>{t('periodFrom')}</Label>
            <DateInput
              id={`${id}-from`}
              value={value.from}
              max={value.to || undefined}
              onValueChange={(from) => from && onChange({ ...value, from })}
              className="w-40"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor={`${id}-to`}>{t('periodTo')}</Label>
            <DateInput
              id={`${id}-to`}
              value={value.to}
              min={value.from || undefined}
              invalid={value.to < value.from}
              onValueChange={(to) => to && onChange({ ...value, to })}
              className="w-40"
            />
          </div>
        </div>
      )}
    </div>
  )
}
