import { useMemo, useState, type FormEvent } from 'react'
import { DateInput, FieldMessage, rateToInputText } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { useEntityMutation, useRates } from '@/hooks'
import { useFormat, useI18n, useT } from '@/i18n'
import { uiDict } from '@/i18n/shared-keys'
import { settingsDict } from './i18n'
import { parseCurrencyCode, todayIso, validateRateEntry } from './settings-logic'

/** Kurstabelle; Einträge werden nur ergänzt, nie gelöscht (PE-05). */
export function RatesSection() {
  const ts = useT(settingsDict)
  const tu = useT(uiDict)
  const format = useFormat()
  const { language } = useI18n()
  const { rates, errorText: loadError } = useRates()
  const { create, pending, errorText } = useEntityMutation('exchangeRates')
  const [currency, setCurrency] = useState('')
  const [rate, setRate] = useState('')
  const [enteredOn, setEnteredOn] = useState(todayIso)
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const sorted = useMemo(
    () =>
      [...rates].sort(
        (a, b) =>
          a.currency.localeCompare(b.currency) ||
          b.enteredOn.localeCompare(a.enteredOn) ||
          b.createdAt.localeCompare(a.createdAt)
      ),
    [rates]
  )

  const parsedCurrency = parseCurrencyCode(currency)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaved(false)
    const entry = validateRateEntry({ currency, rate, enteredOn })
    if (!entry.ok) {
      setFormError(entry.error === 'eurNoRate' ? ts('eurNoRate') : tu(entry.error))
      return
    }
    setFormError(null)
    const res = await create(entry.value)
    if (res.ok) {
      setCurrency('')
      setRate('')
      setSaved(true)
    }
  }

  return (
    <section aria-labelledby="settings-rates" className="flex flex-col gap-3">
      <h2 id="settings-rates" className="text-base font-semibold">
        {ts('ratesTitle')}
      </h2>
      <FieldMessage>{ts('ratesHint')}</FieldMessage>
      <FieldMessage error>{loadError}</FieldMessage>

      <form onSubmit={(e) => void submit(e)} className="flex flex-wrap items-end gap-3" noValidate>
        <div className="flex flex-col gap-1">
          <Label htmlFor="rate-currency">{ts('rateCurrencyLabel')}</Label>
          <Input
            id="rate-currency"
            className="w-32"
            maxLength={3}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="rate-value">
            {parsedCurrency.ok
              ? ts('rateValueLabel', { currency: parsedCurrency.value })
              : ts('rateValueLabelEmpty')}
          </Label>
          <Input
            id="rate-value"
            className="w-40"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="rate-date">{ts('rateDate')}</Label>
          <DateInput id="rate-date" value={enteredOn} onValueChange={setEnteredOn} />
        </div>
        <Button type="submit" disabled={pending}>
          {ts('addRate')}
        </Button>
      </form>
      <FieldMessage error>{formError ?? errorText}</FieldMessage>
      <FieldMessage>{saved ? ts('rateSaved') : null}</FieldMessage>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">{ts('noRates')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{ts('rateCurrency')}</TableHead>
              <TableHead className="text-right">{ts('rateValue')}</TableHead>
              <TableHead>{ts('rateDate')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.currency}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {rateToInputText(r.rate, language)}
                </TableCell>
                <TableCell>{format.date(r.enteredOn)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}
