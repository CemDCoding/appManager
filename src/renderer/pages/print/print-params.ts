import { PdfExportInputSchema, type PdfExportInput } from '@shared/ipc'

/**
 * Liest den Berichtsauftrag aus der Query der Druckroute
 * (`#/print?scope=…&projectId=…&from=…&to=…&lang=…&currency=…`, siehe
 * `buildPrintRoute` im Main-Prozess) und prüft ihn mit demselben Schema wie Main.
 */
export function parsePrintParams(params: URLSearchParams): PdfExportInput | null {
  const projectId = params.get('projectId')
  const candidate = {
    scope: params.get('scope'),
    ...(projectId === null ? {} : { projectId }),
    period: { from: params.get('from'), to: params.get('to') },
    language: params.get('lang'),
    displayCurrency: params.get('currency')
  }
  const parsed = PdfExportInputSchema.safeParse(candidate)
  return parsed.success ? parsed.data : null
}
