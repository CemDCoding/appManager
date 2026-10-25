import { useLocation } from 'react-router-dom'
import { Languages, Monitor, Moon, Sun, type LucideProps } from 'lucide-react'
import type { ComponentType } from 'react'
import { Select } from '@/components/ui/select'
import { isLanguage, useI18n, useT, type AppKey } from '@/i18n'
import { cn } from '@/lib/utils'
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

/** Kopfzeile: Seitentitel, Anzeigewährung (Slot, AP-10), Sprache und Theme. */
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

      {/* Platz für die Anzeigewährungs-Wahl; Logik folgt in AP-10. */}
      <div data-slot="display-currency" className="flex items-center" />

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
