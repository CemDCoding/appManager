import { useId, useMemo, useState } from 'react'
import { FileDown } from 'lucide-react'
import { PeriodPicker, periodFor, type Period } from '@/components/data'
import { ProjectPicker } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast-context'
import { currencyOptions, ipcErrorText, useCollection, useDisplayCurrency, useRates } from '@/hooks'
import { isLanguage, useI18n, useT, type Language } from '@/i18n'
import { ipcErrorDict } from '@/i18n/shared-keys'
import { localIsoDate } from '@/pages/print/report-model'
import { reportsDict } from './i18n'
import { toExportInput, type ReportForm, type ReportFormError } from './report-form'

/**
 * Berichtsseite (F-10): Bereich, Zeitraum, Sprache und Anzeigewährung wählen,
 * dann erzeugt Main das PDF (`pdf:export`) und fragt per Dialog nach dem Speicherort.
 */
export function ReportsPage() {
  const t = useT(reportsDict)
  const tErr = useT(ipcErrorDict)
  const { toast } = useToast()
  const { language: uiLanguage } = useI18n()
  const display = useDisplayCurrency()
  const rates = useRates()
  const projects = useCollection('projects')
  const id = useId()

  const today = useMemo(() => localIsoDate(new Date()), [])
  const [scope, setScope] = useState<ReportForm['scope']>('portfolio')
  const [projectId, setProjectId] = useState('')
  const [period, setPeriod] = useState<Period>(() => periodFor('month', today))
  const [language, setLanguage] = useState<Language>(uiLanguage)
  const [currency, setCurrency] = useState<string | null>(null)
  const [formError, setFormError] = useState<ReportFormError | null>(null)
  const [busy, setBusy] = useState(false)

  // Ohne eigene Wahl gilt die Anzeigewährung aus den Einstellungen.
  const chosenCurrency = currency ?? display.currency
  const currencies = currencyOptions(rates.currencies, [chosenCurrency])

  const create = async () => {
    const built = toExportInput({
      scope,
      projectId,
      period,
      language,
      currency: chosenCurrency
    })
    if (!built.ok) {
      setFormError(built.error)
      return
    }
    setFormError(null)
    setBusy(true)
    try {
      const result = await window.api.pdf.export(built.input)
      if (!result.ok) {
        toast({
          title: t('failed'),
          description: ipcErrorText(result.error, tErr) ?? undefined,
          variant: 'destructive'
        })
      } else {
        toast({ title: result.data.saved ? t('saved') : t('cancelled') })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid max-w-2xl gap-6">
      <p className="text-sm text-muted-foreground">{t('intro')}</p>

      <div className="grid gap-2">
        <Label htmlFor={`${id}-scope`}>{t('scope')}</Label>
        <Select
          id={`${id}-scope`}
          value={scope}
          onValueChange={(v) => setScope(v === 'project' ? 'project' : 'portfolio')}
        >
          <option value="portfolio">{t('scopePortfolio')}</option>
          <option value="project">{t('scopeProject')}</option>
        </Select>
      </div>

      {scope === 'project' && (
        <div className="grid gap-2">
          <span className="text-sm font-medium">{t('project')}</span>
          <ProjectPicker
            projects={projects.items}
            value={projectId}
            onChange={setProjectId}
            allowEmpty
            includeArchived
            aria-label={t('project')}
          />
        </div>
      )}

      <PeriodPicker value={period} onChange={setPeriod} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${id}-language`}>{t('language')}</Label>
          <Select
            id={`${id}-language`}
            value={language}
            onValueChange={(v) => {
              if (isLanguage(v)) setLanguage(v)
            }}
          >
            <option value="de">{t('languageDe')}</option>
            <option value="en">{t('languageEn')}</option>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-currency`}>{t('currency')}</Label>
          <Select
            id={`${id}-currency`}
            value={chosenCurrency}
            onValueChange={(v) => setCurrency(v)}
          >
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {t(formError)}
        </p>
      )}

      <div className="grid gap-2">
        <Button className="w-fit" onClick={() => void create()} disabled={busy}>
          <FileDown aria-hidden="true" />
          {busy ? t('creating') : t('create')}
        </Button>
        <p className="text-xs text-muted-foreground">{t('saveHint')}</p>
      </div>
    </div>
  )
}
