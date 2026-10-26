import { BASE_CURRENCY, CurrencyCodeSchema, RateSchema, type Money, type Rate } from '@shared/money'
import type { Result } from '@core/money/money'
import type { Language } from '@/i18n'

/**
 * Eingabezustand von `MoneyInput`: Texte so, wie der Nutzer sie tippt.
 * Umwandlung in `Money` + Kurs erst beim Speichern über {@link parseMoneyDraft}.
 */
export interface MoneyDraft {
  amountText: string
  currency: string
  /** Kurs „1 currency = rateText EUR“ als Text (Komma oder Punkt). Bei EUR immer "1". */
  rateText: string
  /** true, sobald der Nutzer den Kurs selbst geändert hat (dann kein automatischer Vorschlag). */
  rateTouched: boolean
}

export type MoneyDraftError = 'invalidAmount' | 'invalidCurrency' | 'invalidRate'

/** Neuester Kurs, den `MoneyInput` vorschlägt. */
export interface RateSuggestion {
  rate: Rate
  enteredOn: string
}

const DECIMAL_SEPARATOR: Record<Language, string> = { de: ',', en: '.' }
const GROUP_SEPARATOR: Record<Language, string> = { de: '.', en: ',' }

/**
 * Wandelt eine Betragseingabe in Cent um, ohne Float-Rechnung (reine Textzerlegung).
 * Erlaubt: Tausendertrennzeichen der Sprache, höchstens 2 Nachkommastellen, kein Minus.
 * Im Deutschen wird auch ein einzelner Punkt mit 1–2 Nachkommastellen als Komma gelesen
 * ("12.5" → 1250), im Englischen umgekehrt ein Komma ("12,5" → 1250).
 *
 * @example
 * parseAmountToCents('1.234,56', 'de') // { ok: true, value: 123456 }
 */
export function parseAmountToCents(
  text: string,
  language: Language
): Result<number, 'invalidAmount'> {
  const fail = { ok: false, error: 'invalidAmount' } as const
  let s = text.trim().replace(/[\s  ]/g, '')
  if (s === '') return fail
  const dec = DECIMAL_SEPARATOR[language]
  const group = GROUP_SEPARATOR[language]
  // Fremdes Trennzeichen als Dezimalzeichen, wenn eindeutig ("12.5" im Deutschen).
  if (!s.includes(dec) && new RegExp(`^\\d+\\${group}\\d{1,2}$`).test(s)) {
    s = s.replace(group, dec)
  }
  const [intRaw, frac = '', ...rest] = s.split(dec)
  if (rest.length > 0 || intRaw === undefined) return fail
  const groupedOk = new RegExp(`^\\d{1,3}(\\${group}\\d{3})+$`).test(intRaw)
  if (!/^\d+$/.test(intRaw) && !groupedOk) return fail
  if (!/^\d{0,2}$/.test(frac)) return fail
  const digits = intRaw.split(group).join('') + frac.padEnd(2, '0')
  const cents = Number(digits)
  if (!Number.isSafeInteger(cents)) return fail
  return { ok: true, value: cents }
}

/**
 * Cent → editierbarer Text ohne Tausendertrennzeichen ("1234,56" bzw. "1234.56").
 * Nur für Eingabefelder; Anzeigen formatieren über `formatMoney` (AP-04).
 */
export function centsToInputText(cents: number, language: Language): string {
  if (!Number.isSafeInteger(cents) || cents < 0) return ''
  const whole = Math.floor(cents / 100)
  const frac = String(cents % 100).padStart(2, '0')
  return `${whole}${DECIMAL_SEPARATOR[language]}${frac}`
}

/** Kurs-Eingabe → Kurs-String nach `RateSchema` ("0,92" → "0.92"), sonst Fehler. */
export function parseRateText(text: string): Result<Rate, 'invalidRate'> {
  const normalized = text.trim().replace(',', '.')
  const parsed = RateSchema.safeParse(normalized)
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false, error: 'invalidRate' }
}

/** Kurs-String → Text für das Eingabefeld in der Sprache ("0.92" → "0,92"). */
export function rateToInputText(rate: string, language: Language): string {
  return language === 'de' ? rate.replace('.', ',') : rate
}

/** Leerer Entwurf (EUR, Kurs 1). */
export function emptyMoneyDraft(currency: string = BASE_CURRENCY): MoneyDraft {
  return {
    amountText: '',
    currency,
    rateText: currency === BASE_CURRENCY ? '1' : '',
    rateTouched: false
  }
}

/** Entwurf aus gespeicherten Werten (Bearbeiten einer Buchung, Snapshot bleibt). */
export function moneyDraftFrom(amount: Money, rateToEur: Rate, language: Language): MoneyDraft {
  return {
    amountText: centsToInputText(amount.cents, language),
    currency: amount.currency,
    rateText: rateToInputText(rateToEur, language),
    // Gespeicherter Snapshot gilt als bewusst gesetzt: kein Überschreiben durch Vorschläge.
    rateTouched: true
  }
}

/**
 * Währungswechsel: EUR → Kurs "1"; Fremdwährung → neuester Kurs als Vorschlag (PE-05),
 * oder leer, wenn keiner existiert. Ein Wechsel setzt `rateTouched` zurück, weil der
 * alte Kurs zur alten Währung gehörte.
 */
export function applyCurrencyChange(
  draft: MoneyDraft,
  currency: string,
  suggestion: RateSuggestion | null,
  language: Language
): MoneyDraft {
  if (currency === BASE_CURRENCY) {
    return { ...draft, currency, rateText: '1', rateTouched: false }
  }
  return {
    ...draft,
    currency,
    rateText: suggestion ? rateToInputText(suggestion.rate, language) : '',
    rateTouched: false
  }
}

/**
 * Füllt den Vorschlag nach, wenn die Kurse erst nach dem Öffnen geladen wurden.
 * Ändert nichts, wenn der Nutzer den Kurs schon selbst gesetzt hat.
 */
export function withRateSuggestion(
  draft: MoneyDraft,
  suggestion: RateSuggestion | null,
  language: Language
): MoneyDraft {
  if (draft.currency === BASE_CURRENCY || draft.rateTouched || !suggestion) return draft
  const text = rateToInputText(suggestion.rate, language)
  return draft.rateText === text ? draft : { ...draft, rateText: text }
}

/**
 * Entwurf → `{ amount, rateToEur }` für `entity.create/update`. Bei EUR ist der Kurs
 * immer "1" (Schema-Regel).
 */
export function parseMoneyDraft(
  draft: MoneyDraft,
  language: Language
): Result<{ amount: Money; rateToEur: Rate }, MoneyDraftError> {
  const currency = CurrencyCodeSchema.safeParse(draft.currency)
  if (!currency.success) return { ok: false, error: 'invalidCurrency' }
  const cents = parseAmountToCents(draft.amountText, language)
  if (!cents.ok) return cents
  if (currency.data === BASE_CURRENCY) {
    return {
      ok: true,
      value: { amount: { cents: cents.value, currency: BASE_CURRENCY }, rateToEur: '1' }
    }
  }
  const rate = parseRateText(draft.rateText)
  if (!rate.ok) return rate
  return {
    ok: true,
    value: { amount: { cents: cents.value, currency: currency.data }, rateToEur: rate.value }
  }
}
