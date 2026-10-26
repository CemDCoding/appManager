/** Pfad zur Detailseite (ohne Import aus `app/routes`, um Importzyklen zu vermeiden). */
export function projectDetailPath(id: string): string {
  return `/projects/${encodeURIComponent(id)}`
}
