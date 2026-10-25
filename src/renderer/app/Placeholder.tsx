import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useT, type NavKey } from '@/i18n'

/** Platzhalter für Bereiche, die spätere Pakete umsetzen. */
export function Placeholder({ titleKey }: { titleKey: NavKey }) {
  const t = useT()
  return (
    <Card data-testid="placeholder">
      <CardHeader>
        <CardTitle>
          {t(`nav.${titleKey}`)} – {t('common.comingSoon')}
        </CardTitle>
        <CardDescription>{t('common.comingSoonHint')}</CardDescription>
      </CardHeader>
    </Card>
  )
}
