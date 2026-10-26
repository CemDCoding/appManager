import { useState } from 'react'
import { ProjectPicker } from '@/components/forms/ProjectPicker'
import { Label } from '@/components/ui/label'
import { useCollection } from '@/hooks/useCollection'
import { useT } from '@/i18n'
import { metricsDict } from '@/features/metrics/i18n'
import { UserMetricsView } from '@/features/metrics/UserMetricsView'

/** Seite `/metrics`: Projektwahl plus Nutzerzahlen (AP-19, F-13). */
export function MetricsPage() {
  const t = useT(metricsDict)
  const tn = useT()
  const { items: projects, loading, errorText } = useCollection('projects')
  const [chosen, setChosen] = useState('')
  const projectId = chosen || projects.find((p) => !p.archived)?.id || projects[0]?.id || ''

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">{tn('nav.metrics')}</h1>
      {errorText && (
        <p role="alert" className="text-destructive">
          {errorText}
        </p>
      )}
      {!loading && !errorText && projects.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('noProjects')}</p>
      )}
      {projects.length > 0 && (
        <Label className="grid max-w-sm gap-1">
          {t('pickProject')}
          <ProjectPicker
            projects={projects}
            includeArchived
            value={projectId}
            onChange={setChosen}
            aria-label={t('pickProject')}
          />
        </Label>
      )}
      {projectId && <UserMetricsView key={projectId} projectId={projectId} />}
    </div>
  )
}
