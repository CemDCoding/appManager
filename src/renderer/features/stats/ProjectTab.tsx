import type { ProjectTabProps } from '../ComingSoon'
import { StatsView } from './StatsView'

/** Statistik eines Projekts: dieselben Abschnitte wie die Statistikseite (PE-16). */
export function ProjectTab({ projectId }: ProjectTabProps) {
  return <StatsView scope={projectId} />
}
