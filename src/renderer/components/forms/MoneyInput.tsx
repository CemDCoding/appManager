import { useEffect, useId, useMemo } from 'react'
import { BASE_CURRENCY } from '@shared/money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useFormat, useI18n, useT } from '@/i18n'
import { uiDict } from '@/i18n/shared-keys'
import { currencyOptions } from '@/hooks/rates'
import { useRates } from '@/hooks/useRates'
import { cn } from '@/lib/utils'
import { FieldMessage } from './FieldMessage'
import {
  applyCurrencyChange,
  parseAmountToCents,
  parseRateText,
  rateToInputText,
  withRateSuggestion,
  type MoneyDraft,
  type RateSuggestion
} from './money-logic'

export interface MoneyInputProps {
  value: MoneyDraft
  onChange: (value: MoneyDraft) => void
  /** Beschriftung des Betragsfelds (Standard „Betrag“). */
  label?: string
  /** Zusätzliche wählbare Währungen (neben EUR und allen mit Kurs). */
  extraCurrencies?: readonly string[]
  disabled?: boolean
  className?: string
}

/**
 * Betrag + Währung + Kurs-Snapshot (PE-05, PE-13). Bei Fremdwährung wird der neueste
 * Kurs aus der Kurstabelle vorgeschlagen; das Feld bleibt änderbar. Beim Speichern
 * `parseMoneyDraft(value, language)` aufrufen.
 *
 * @example
 * const [money, setMoney] = useState(() => emptyMoneyDraft())
 * <MoneyInput value={money} onChange={setMoney} />
 * const parsed = parseMoneyDraft(money, language) // { amount, rateToEur } | Fehler
 */
export function MoneyInput({
  value,
  onChange,
  label,
  extraCurrencies = [],
  disabled,
  className
}: MoneyInputProps) {
  const t = useT(uiDict)
  const fmt = useFormat()
  const { language } = useI18n()
  const { latestFor, currencies } = useRates()
  const id = useId()

  const latest = value.currency === BASE_CURRENCY ? null : latestFor(value.currency)
  const suggestion = toSuggestion(latest)
  const suggestionRate = latest?.rate ?? null
  const suggestionDate = latest?.enteredOn ?? null

  // Kurse laden asynchron: Vorschlag nachtragen, solange der Nutzer nichts geändert hat.
  useEffect(() => {
    const s =
      suggestionRate !== null && suggestionDate !== null
        ? { rate: suggestionRate, enteredOn: suggestionDate }
        : null
    const next = withRateSuggestion(value, s, language)
    if (next !== value) onChange(next)
  }, [value, suggestionRate, suggestionDate, language, onChange])

  const options = useMemo(
    () => currencyOptions(currencies, [value.currency, ...extraCurrencies]),
    [currencies, value.currency, extraCurrencies]
  )

  const amountError =
    value.amountText.trim() !== '' && !parseAmountToCents(value.amountText, language).ok
  const isForeign = value.currency !== BASE_CURRENCY
  const rateError = isForeign && value.rateText.trim() !== '' && !parseRateText(value.rateText).ok
  const suggestionText = suggestion ? rateToInputText(suggestion.rate, language) : null

  return (
    <div className={cn('grid gap-3', className)}>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-amount`}>{label ?? t('amount')}</Label>
        <div className="flex gap-2">
          <Input
            id={`${id}-amount`}
            inputMode="decimal"
            autoComplete="off"
            value={value.amountText}
            disabled={disabled}
            aria-invalid={amountError || undefined}
            aria-describedby={amountError ? `${id}-amount-msg` : undefined}
            onChange={(e) => onChange({ ...value, amountText: e.target.value })}
            className="flex-1"
          />
          <Select
            aria-label={t('currency')}
            value={value.currency}
            disabled={disabled}
            onValueChange={(c) =>
              onChange(applyCurrencyChange(value, c, toSuggestion(latestFor(c)), language))
            }
            className="w-24"
          >
            {options.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <FieldMessage id={`${id}-amount-msg`} error>
          {amountError ? t('invalidAmount') : null}
        </FieldMessage>
      </div>

      {isForeign && (
        <div className="grid gap-2">
          <Label htmlFor={`${id}-rate`}>{t('rateToEur', { currency: value.currency })}</Label>
          <div className="flex gap-2">
            <Input
              id={`${id}-rate`}
              inputMode="decimal"
              autoComplete="off"
              value={value.rateText}
              disabled={disabled}
              aria-invalid={rateError || undefined}
              aria-describedby={`${id}-rate-msg`}
              onChange={(e) => onChange({ ...value, rateText: e.target.value, rateTouched: true })}
              className="flex-1"
            />
            {suggestionText !== null && value.rateText !== suggestionText && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                disabled={disabled}
                onClick={() => onChange({ ...value, rateText: suggestionText, rateTouched: false })}
              >
                {t('rateResetSuggestion')}
              </Button>
            )}
          </div>
          <FieldMessage id={`${id}-rate-msg`} error={rateError || suggestion === null}>
            {rateError
              ? t('invalidRate')
              : suggestion === null
                ? t('rateMissing', { currency: value.currency })
                : t('rateSuggested', { date: fmt.date(suggestion.enteredOn) })}
          </FieldMessage>
        </div>
      )}
    </div>
  )
}

function toSuggestion(entry: { rate: string; enteredOn: string } | null): RateSuggestion | null {
  return entry ? { rate: entry.rate, enteredOn: entry.enteredOn } : null
}
