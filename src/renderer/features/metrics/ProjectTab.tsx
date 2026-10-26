import type { ProjectTabProps } from '../ComingSoon'
import { UserMetricsView } from './UserMetricsView'

/** Reiter „Nutzerzahlen“ eines Projekts (AP-19). */
export function ProjectTab({ projectId }: ProjectTabProps) {
  return <UserMetricsView projectId={projectId} />
}
