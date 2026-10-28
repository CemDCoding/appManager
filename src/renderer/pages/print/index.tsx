import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DisplayCurrencyProvider } from '@/hooks'
import { useT } from '@/i18n'
import { I18nContext, type I18nContextValue } from '@/i18n/context'
import { printDict } from './i18n'
import { parsePrintParams } from './print-params'
import { PrintReport } from './PrintReport'

const noop = () => {}

/**
 * Druckansicht ohne Layout (Grundlage für den PDF-Export, AP-24). Wird vom
 * Main-Prozess in einem versteckten Fenster geladen; Sprache und
 * Anzeigewährung kommen aus dem Auftrag, nicht aus den App-Präferenzen.
 */
export function PrintPage() {
  const [params] = useSearchParams()
  const input = useMemo(() => parsePrintParams(params), [params])
  const t = useT(printDict)
  const i18n = useMemo<I18nContextValue | null>(
    // Sprache des Berichts gilt nur hier; die gespeicherte UI-Sprache bleibt unverändert.
    () => (input ? { language: input.language, setLanguage: noop } : null),
    [input]
  )

  if (!input || !i18n) {
    return (
      <main className="p-8">
        <p role="alert">{t('invalidParams')}</p>
      </main>
    )
  }
  return (
    <I18nContext.Provider value={i18n}>
      <DisplayCurrencyProvider currency={input.displayCurrency}>
        <PrintReport input={input} />
      </DisplayCurrencyProvider>
    </I18nContext.Provider>
  )
}
