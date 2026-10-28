import { PdfExportInputSchema, type PdfExportInput } from '@shared/ipc'
import type { Language } from '@/i18n'

/** Eingaben der Berichtsseite (AP-24). Kein Dateipfad: den wählt Main per Dialog. */
export interface ReportForm {
  scope: PdfExportInput['scope']
  /** Gewähltes Projekt ('' = keins); nur bei `scope: 'project'` relevant. */
  projectId: string
  period: { from: string; to: string }
  language: Language
  currency: string
}

export type ReportFormError = 'projectRequired' | 'invalidPeriod' | 'invalid'

/**
 * Baut den `pdf:export`-Auftrag und prüft ihn mit demselben Schema wie Main.
 *
 * @example
 * toExportInput({ scope: 'portfolio', projectId: '', period, language: 'de', currency: 'EUR' })
 */
export function toExportInput(
  form: ReportForm
): { ok: true; input: PdfExportInput } | { ok: false; error: ReportFormError } {
  if (form.scope === 'project' && form.projectId === '') {
    return { ok: false, error: 'projectRequired' }
  }
  const candidate = {
    scope: form.scope,
    ...(form.scope === 'project' ? { projectId: form.projectId } : {}),
    period: { from: form.period.from, to: form.period.to },
    language: form.language,
    displayCurrency: form.currency
  }
  const parsed = PdfExportInputSchema.safeParse(candidate)
  if (parsed.success) return { ok: true, input: parsed.data }
  const onPeriod = parsed.error.issues.some((i) => i.path[0] === 'period')
  return { ok: false, error: onPeriod ? 'invalidPeriod' : 'invalid' }
}
