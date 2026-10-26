import { useState } from 'react'
import { FieldMessage } from '@/components/forms'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useTheme, THEME_PREFERENCES, isThemePreference } from '@/app/theme'
import { currencyOptions, ipcErrorText, useDisplayCurrency, useRates } from '@/hooks'
import { isLanguage, LANGUAGES, useI18n, useT } from '@/i18n'
import { ipcErrorDict } from '@/i18n/shared-keys'
import { settingsDict } from './i18n'

const THEME_KEYS = {
  light: 'common.themeLight',
  dark: 'common.themeDark',
  system: 'common.themeSystem'
} as const

/** Anzeigewährung, Sprache und Theme. */
export function DisplaySection() {
  const t = useT()
  const ts = useT(settingsDict)
  const tErr = useT(ipcErrorDict)
  const { currency, setCurrency, saving } = useDisplayCurrency()
  const { currencies } = useRates()
  const { language, setLanguage } = useI18n()
  const { preference, setPreference } = useTheme()
  const [error, setError] = useState<string | null>(null)

  return (
    <section aria-labelledby="settings-display" className="flex flex-col gap-3">
      <h2 id="settings-display" className="text-base font-semibold">
        {ts('displayTitle')}
      </h2>
      <div className="grid max-w-xl gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="settings-currency">{t('common.displayCurrency')}</Label>
          <Select
            id="settings-currency"
            value={currency}
            disabled={saving}
            onValueChange={async (next) => {
              const res = await setCurrency(next)
              setError(res.ok ? null : ipcErrorText(res.error, tErr))
            }}
          >
            {currencyOptions(currencies, [currency]).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="settings-language">{t('common.language')}</Label>
          <Select
            id="settings-language"
            value={language}
            onValueChange={(v) => isLanguage(v) && setLanguage(v)}
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l === 'de' ? t('common.languageDe') : t('common.languageEn')}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="settings-theme">{t('common.theme')}</Label>
          <Select
            id="settings-theme"
            value={preference}
            onValueChange={(v) => isThemePreference(v) && setPreference(v)}
          >
            {THEME_PREFERENCES.map((p) => (
              <option key={p} value={p}>
                {t(THEME_KEYS[p])}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <FieldMessage error>{error}</FieldMessage>
    </section>
  )
}
