/**
 * PDF-Export (AP-24): Parameter, Druckadresse und Druckoptionen.
 *
 * Reine Funktionen ohne Electron-Import, damit sie ohne Electron testbar sind.
 * Der Renderer liefert nie einen Dateipfad: Gespeichert wird nur unter dem Pfad
 * aus dem nativen Speichern-Dialog im Main-Prozess.
 */
import { PdfExportInputSchema, PdfReadyInputSchema, type PdfExportInput } from '@shared/ipc'

/** Zeitlimit, bis die Druckseite `pdf:ready` melden muss (Plan AP-24). */
export const PDF_READY_TIMEOUT_MS = 30_000

/** Breite/Höhe des versteckten Fensters in CSS-Pixeln (A4 bei 96 dpi). */
export const PRINT_WINDOW_SIZE = { width: 794, height: 1123 } as const

export type ParseResult = { ok: true; input: PdfExportInput } | { ok: false; message: string }

const ALLOWED_KEYS: ReadonlySet<string> = new Set([
  'scope',
  'projectId',
  'period',
  'language',
  'displayCurrency'
])

/** Prüft den Auftrag aus dem Renderer streng (unbekannte Felder werden abgelehnt). */
export function parsePdfExportInput(payload: unknown): ParseResult {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return { ok: false, message: 'Invalid input' }
  }
  const extra = Object.keys(payload).find((key) => !ALLOWED_KEYS.has(key))
  if (extra !== undefined) return { ok: false, message: `Unknown field (${extra})` }
  const parsed = PdfExportInputSchema.safeParse(payload)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    const where = first ? first.path.join('.') : ''
    return {
      ok: false,
      message: `${first?.message ?? 'Invalid input'}${where ? ` (${where})` : ''}`
    }
  }
  return { ok: true, input: parsed.data }
}

/** Prüft die Meldung `pdf:ready` der Druckseite. */
export function isValidReadyPayload(payload: unknown): boolean {
  return PdfReadyInputSchema.strict().safeParse(payload).success
}

/**
 * Query der Druckseite aus einem geprüften Auftrag (ohne `#`), z. B.
 * `/print?scope=project&projectId=…&from=…&to=…&lang=de&currency=EUR`.
 * Alle Werte werden URL-kodiert.
 */
export function buildPrintRoute(input: PdfExportInput): string {
  const params = new URLSearchParams()
  params.set('scope', input.scope)
  if (input.projectId !== undefined) params.set('projectId', input.projectId)
  params.set('from', input.period.from)
  params.set('to', input.period.to)
  params.set('lang', input.language)
  params.set('currency', input.displayCurrency)
  return `/print?${params.toString()}`
}

/** Vorschlag für den Dateinamen im Speichern-Dialog (nur feste Zeichen, kein Pfad). */
export function defaultPdfFileName(input: PdfExportInput): string {
  const scope =
    input.scope === 'portfolio'
      ? input.language === 'de'
        ? 'Portfolio'
        : 'portfolio'
      : input.language === 'de'
        ? 'Projekt'
        : 'project'
  const prefix = input.language === 'de' ? 'Bericht' : 'report'
  return `${prefix}-${scope}-${input.period.from}_${input.period.to}.pdf`
}

/** Fußzeile mit Seitenzahl (Electron ersetzt `pageNumber`/`totalPages`). */
export function footerTemplate(language: PdfExportInput['language']): string {
  const [page, of] = language === 'de' ? ['Seite', 'von'] : ['Page', 'of']
  return (
    '<div style="width:100%;font-size:8px;color:#666;text-align:center;font-family:sans-serif;">' +
    `${page} <span class="pageNumber"></span> ${of} <span class="totalPages"></span>` +
    '</div>'
  )
}

/** Optionen für `webContents.printToPDF`: A4, Ränder in Zoll, Hintergründe an. */
export function buildPrintToPdfOptions(language: PdfExportInput['language']) {
  return {
    pageSize: 'A4' as const,
    landscape: false,
    printBackground: true,
    margins: { top: 0.5, bottom: 0.6, left: 0.5, right: 0.5 },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: footerTemplate(language),
    preferCSSPageSize: false
  }
}

/** Speichern-Dialog: nur PDF, Vorschlag aus `defaultPdfFileName`. */
export function buildSaveDialogOptions(input: PdfExportInput) {
  return {
    title: input.language === 'de' ? 'PDF speichern' : 'Save PDF',
    defaultPath: defaultPdfFileName(input),
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
    properties: ['createDirectory' as const, 'showOverwriteConfirmation' as const]
  }
}
