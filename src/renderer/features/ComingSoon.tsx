import { useT } from '@/i18n'

/** Gemeinsamer „folgt“-Hinweis für Platzhalter in `features/`. */
export function ComingSoon() {
  const t = useT()
  return (
    <p data-testid="coming-soon" className="text-sm text-muted-foreground">
      {t('common.comingSoon')}
    </p>
  )
}

/** Prop-Vertrag aller Projekt-Tabs (siehe AP-12). */
export interface ProjectTabProps {
  projectId: string
}
