import type { Project } from '@shared/schemas/project'
import { isValidDateString } from '@shared/schemas/common'

/**
 * True if the project is active on calendar day `date` ("YYYY-MM-DD"):
 * `startDate <= date` and (`endDate` missing or `date <= endDate`); both bounds
 * inclusive (PE-34). Throws RangeError on an invalid date.
 */
export function isActive(project: Pick<Project, 'startDate' | 'endDate'>, date: string): boolean {
  if (!isValidDateString(date)) throw new RangeError(`Invalid date: ${date}`)
  return project.startDate <= date && (project.endDate === undefined || date <= project.endDate)
}

/** Projects active on `date`, order preserved. */
export function activeProjects<T extends Pick<Project, 'startDate' | 'endDate'>>(
  projects: readonly T[],
  date: string
): T[] {
  return projects.filter((p) => isActive(p, date))
}
