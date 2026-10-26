import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import type { IpcResult } from '@shared/ipc'
import { BASE_CURRENCY } from '@shared/money'
import type { Settings } from '@shared/schemas/settings'
import { useI18n, useT } from '@/i18n'
import { uiDict } from '@/i18n/shared-keys'
import { useRates } from '@/hooks/useRates'
import { useSettings } from '@/hooks/useSettings'
import { displayAmount, type DisplayAmount } from './displayMoney'

export interface DisplayCurrencyValue {
  /** Aktuelle Anzeigewährung (Standard EUR, solange Einstellungen laden). */
  currency: string
  /** true bei Nicht-EUR: Beträge sind umgerechnet (Hinweis anzeigen, PE-50). */
  converted: boolean
  /** true, wenn für die Anzeigewährung kein Kurs existiert. */
  missingRate: boolean
  /** Speichert die Anzeigewährung in den Einstellungen (bleibt erhalten). */
  setCurrency: (currency: string) => Promise<IpcResult<Settings>>
  saving: boolean
  /** EUR-Cent → formatierter Betrag in Anzeigewährung (Fehlerwert ohne Kurs). */
  format: (eurCents: number) => DisplayAmount
}

const DisplayCurrencyContext = createContext<DisplayCurrencyValue | null>(null)

/** Berechnet den Wert aus Einstellungen und Kurstabelle; `fixed` überschreibt die Währung. */
function useDisplayCurrencyValue(fixed?: string): DisplayCurrencyValue {
  const { settings, save, saving } = useSettings()
  const { rates, latestFor } = useRates()
  const { language } = useI18n()
  const t = useT(uiDict)
  const currency = fixed ?? settings?.displayCurrency ?? BASE_CURRENCY
  const unavailable = t('valueUnavailable')

  const setCurrency = useCallback((next: string) => save({ displayCurrency: next }), [save])

  return useMemo(
    () => ({
      currency,
      converted: currency !== BASE_CURRENCY,
      missingRate: currency !== BASE_CURRENCY && latestFor(currency) === null,
      setCurrency,
      saving,
      format: (eurCents: number) => displayAmount(eurCents, currency, rates, language, unavailable)
    }),
    [currency, latestFor, setCurrency, saving, rates, language, unavailable]
  )
}

/**
 * Stellt die Anzeigewährung bereit (aus den Einstellungen). Optional: `currency`
 * fest vorgeben (z. B. Druckansicht mit der Währung aus dem PDF-Auftrag).
 * Ohne Provider liefert `useDisplayCurrency()` denselben Stand aus den Einstellungen.
 *
 * @example
 * <DisplayCurrencyProvider currency={input.displayCurrency}>
 *   <Report />
 * </DisplayCurrencyProvider>
 */
export function DisplayCurrencyProvider({
  currency,
  children
}: {
  currency?: string
  children: ReactNode
}) {
  const value = useDisplayCurrencyValue(currency)
  return <DisplayCurrencyContext.Provider value={value}>{children}</DisplayCurrencyContext.Provider>
}

/**
 * Anzeigewährung und Umrechnung für Beträge in EUR-Cent (PE-13, PE-50).
 *
 * @example
 * const { format, converted } = useDisplayCurrency()
 * const total = format(ledgerTotalEurCents) // { text: '1.234,56 $', ok: true, … }
 */
export function useDisplayCurrency(): DisplayCurrencyValue {
  const own = useDisplayCurrencyValue()
  return useContext(DisplayCurrencyContext) ?? own
}
