import { useT } from '@/i18n'

/** Druckansicht ohne Layout (Grundlage für PDF, AP-24); Platzhalter. */
export function PrintPage() {
  const t = useT()
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">{t('nav.print')}</h1>
      <p className="mt-2 text-muted-foreground">{t('common.comingSoon')}</p>
    </main>
  )
}
