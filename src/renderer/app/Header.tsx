import { useLocation } from 'react-router-dom'
import { Coins, Languages, Monitor, Moon, Sun, type LucideProps } from 'lucide-react'
import type { ComponentType } from 'react'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast-context'
import { ipcErrorText } from '@/hooks/errors'
import { currencyOptions } from '@/hooks/rates'
import { useRates } from '@/hooks/useRates'
import { isLanguage, useI18n, useT, type AppKey } from '@/i18n'
import { ipcErrorDict, uiDict } from '@/i18n/shared-keys'
import { cn } from '@/lib/utils'
import { useDisplayCurrency } from '@/state/DisplayCurrencyProvider'
import { findRoute } from './routes'
import { useTheme, type ThemePreference } from './theme'

const THEME_OPTIONS: readonly {
  value: ThemePreference
  labelKey: AppKey
  icon: ComponentType<LucideProps>
}[] = [
  { value: 'light', labelKey: 'common.themeLight', icon: Sun },
  { value: 'dark', labelKey: 'common.themeDark', icon: Moon },
  { value: 'system', labelKey: 'common.themeSystem', icon: Monitor }
]

/**
 * Wahl der Anzeigewährung (PE-13): EUR und alle Währungen mit Kurs. Die Wahl wird in den
 * Einstellungen gespeichert und bleibt erhalten. Bei Nicht-EUR Hinweis „umgerechnet“ (PE-50).
 */
function DisplayCurrencySelect() {
  const t = useT()
  const tu = useT(uiDict)
  const tErr = useT(ipcErrorDict)
  const { toast } = useToast()
  const { currency, converted, missingRate, setCurrency, saving } = useDisplayCurrency()
  const { currencies } = useRates()
  const options = currencyOptions(currencies, [currency])

  return (
    <div data-slot="display-currency" className="flex items-center gap-2">
      <Coins aria-hidden="true" className="size-4 text-muted-foreground" />
      <Select
        aria-label={t('common.displayCurrency')}
        title={t('common.displayCurrency')}
        value={currency}
        disabled={saving}
        onValueChange={async (next) => {
          const result = await setCurrency(next)
          if (!result.ok) {
            toast({ title: ipcErrorText(result.error, tErr) ?? '', variant: 'destructive' })
          }
        }}
        className="h-8 w-24"
      >
        {options.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>
      {converted && (
        <Badge
          variant={missingRate ? 'destructive' : 'secondary'}
          title={
            missingRate ? tu('displayMissingRate', { currency }) : tu('convertedHint', { currency })
          }
        >
          {missingRate ? tu('valueUnavailable') : tu('converted')}
        </Badge>
      )}
    </div>
  )
}

/** Kopfzeile: Seitentitel, Anzeigewährung, Sprache und Theme. */
export function Header() {
  const t = useT()
  const { language, setLanguage } = useI18n()
  const { preference, setPreference } = useTheme()
  const { pathname } = useLocation()
  const route = findRoute(pathname)

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-background px-6">
      <h1 className="flex-1 truncate text-xl font-semibold">
        {route ? t(`nav.${route.titleKey}`) : t('common.notFound')}
      </h1>

      <DisplayCurrencySelect />

      <div className="flex items-center gap-2">
        <Languages aria-hidden="true" className="size-4 text-muted-foreground" />
        <Select
          aria-label={t('common.language')}
          value={language}
          onValueChange={(value) => {
            if (isLanguage(value)) setLanguage(value)
          }}
          className="h-8 w-28"
        >
          <option value="de">{t('common.languageDe')}</option>
          <option value="en">{t('common.languageEn')}</option>
        </Select>
      </div>

      <div
        role="group"
        aria-label={t('common.theme')}
        className="flex items-center rounded-md border p-0.5"
      >
        {THEME_OPTIONS.map(({ value, labelKey, icon: Icon }) => {
          const active = preference === value
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              aria-label={t(labelKey)}
              title={t(labelKey)}
              onClick={() => setPreference(value)}
              className={cn(
                'inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
                active && 'bg-muted text-foreground'
              )}
            >
              <Icon aria-hidden="true" className="size-4" />
            </button>
          )
        })}
      </div>
    </header>
  )
}
