import { useT } from '@/i18n'
import { ComingSoon } from '../ComingSoon'

/** Platzhalter: Export/Import als ZIP (AP-25), eingebunden in den Einstellungen (AP-11). */
export function TransferSection() {
  const t = useT()
  return (
    <section aria-labelledby="transfer-section-title" className="flex flex-col gap-2">
      <h2 id="transfer-section-title" className="text-base font-semibold">
        {t('nav.transfer')}
      </h2>
      <ComingSoon />
    </section>
  )
}
