import { useId, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useCollection } from '@/hooks'
import { useT } from '@/i18n'
import { statsDict } from '@/features/stats/i18n'
import { StatsView } from '@/features/stats/StatsView'

const PORTFOLIO = ''

/** Statistikseite (F-09, PE-16): Umschalter Portfolio/Projekt und Zeitraum. */
export function StatsPage() {
  const t = useT(statsDict)
  const id = useId()
  const projects = useCollection('projects')
  const [selected, setSelected] = useState(PORTFOLIO)
  // Ein gelöschtes Projekt fällt auf das Portfolio zurück.
  const exists = selected === PORTFOLIO || projects.items.some((p) => p.id === selected)
  const scope = selected === PORTFOLIO || !exists ? null : selected

  const toolbar = (
    <div className="grid gap-1">
      <Label htmlFor={id}>{t('scope')}</Label>
      <Select id={id} value={scope ?? PORTFOLIO} onValueChange={setSelected}>
        <option value={PORTFOLIO}>{t('portfolio')}</option>
        {projects.items.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>
    </div>
  )

  return <StatsView scope={scope} toolbar={toolbar} />
}
