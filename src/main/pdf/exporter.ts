/**
 * PDF-Export-Ablauf (AP-24) ohne Electron-Abhängigkeit: Fenster, Dialog und
 * Dateizugriff werden als Funktionen übergeben (in Tests gemockt).
 *
 * Ablauf: verstecktes Druckfenster erzeugen → `#/print?…` laden → auf `pdf:ready`
 * warten (Zeitlimit) → `printToPDF` (Zeitlimit) → Fenster schließen → nativer
 * Speichern-Dialog (Zeitlimit) → Datei schreiben. Der Pfad stammt ausschließlich
 * aus dem Dialog. Bei jedem Abbruch wird das Fenster geschlossen und die
 * Export-Sperre freigegeben (`finally`).
 */
import type { IpcErrorCode, PdfExportInput } from '@shared/ipc'
import {
  PDF_PRINT_TIMEOUT_MS,
  PDF_READY_TIMEOUT_MS,
  PDF_SAVE_DIALOG_TIMEOUT_MS,
  buildPrintRoute,
  buildPrintToPdfOptions,
  buildSaveDialogOptions
} from './params'

/** Fehler mit IPC-Code; Meldungen enthalten nie Nutzerdaten oder Pfade (R2). */
export class PdfExportError extends Error {
  readonly code: IpcErrorCode

  constructor(code: IpcErrorCode, message: string) {
    super(message)
    this.name = 'PdfExportError'
    this.code = code
  }
}

export const PDF_ERRORS = {
  busy: () => new PdfExportError('CONFLICT', 'pdf: export already running'),
  timeout: () => new PdfExportError('INTERNAL', 'pdf: report page did not get ready in time'),
  printTimeout: () => new PdfExportError('INTERNAL', 'pdf: report was not rendered in time'),
  dialogTimeout: () => new PdfExportError('INTERNAL', 'pdf: save dialog was not answered in time'),
  renderGone: () => new PdfExportError('INTERNAL', 'pdf: report window closed unexpectedly'),
  render: () => new PdfExportError('INTERNAL', 'pdf: report could not be rendered'),
  write: () => new PdfExportError('IO', 'pdf: file could not be written')
} as const

/** Das versteckte Druckfenster, so weit der Export es braucht. */
export interface PrintWindowLike {
  /** `webContents.id`; nur dieses Fenster darf `pdf:ready` melden. */
  readonly id: number
  /** Lädt die Druckroute (z. B. `/print?scope=…`) aus der App selbst. */
  load(route: string): Promise<void>
  printToPDF(options: ReturnType<typeof buildPrintToPdfOptions>): Promise<Uint8Array>
  /** Ruft `cb`, wenn das Fenster oder sein Renderer-Prozess wegfällt. */
  onGone(cb: () => void): void
  isDestroyed(): boolean
  close(): void
}

export interface Timers {
  setTimeout(fn: () => void, ms: number): unknown
  clearTimeout(handle: unknown): void
}

const defaultTimers: Timers = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>)
}

export interface ReadyGate {
  /** Erfüllt bei `open()`, abgelehnt bei Zeitlimit oder `fail()`. */
  readonly promise: Promise<void>
  open(): void
  fail(error: Error): void
  /** Räumt den Timer auf (nach Ende des Exports). */
  dispose(): void
}

/**
 * Wartet auf die Meldung „fertig gerendert“. Kommt sie nicht innerhalb von
 * `timeoutMs`, wird die Promise mit `PDF_ERRORS.timeout()` abgelehnt.
 * Nach dem ersten Ergebnis sind weitere Aufrufe wirkungslos.
 */
export function createReadyGate(timeoutMs: number, timers: Timers = defaultTimers): ReadyGate {
  let settled = false
  let resolveFn: () => void = () => {}
  let rejectFn: (error: Error) => void = () => {}
  const promise = new Promise<void>((resolve, reject) => {
    resolveFn = resolve
    rejectFn = reject
  })
  // Unbeobachtete Ablehnung vermeiden (der Aufrufer wartet ggf. noch nicht).
  promise.catch(() => {})
  const timer = timers.setTimeout(() => {
    if (settled) return
    settled = true
    rejectFn(PDF_ERRORS.timeout())
  }, timeoutMs)
  return {
    promise,
    open() {
      if (settled) return
      settled = true
      timers.clearTimeout(timer)
      resolveFn()
    },
    fail(error) {
      if (settled) return
      settled = true
      timers.clearTimeout(timer)
      rejectFn(error)
    },
    dispose() {
      timers.clearTimeout(timer)
    }
  }
}

/**
 * Wartet höchstens `timeoutMs` auf `promise`; danach wird mit `onTimeout()`
 * abgelehnt. Ein späteres Ergebnis von `promise` wird verworfen (auch eine
 * spätere Ablehnung bleibt unbeobachtet ohne Folgen).
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout: () => Error,
  timers: Timers = defaultTimers
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false
    const timer = timers.setTimeout(() => {
      if (settled) return
      settled = true
      reject(onTimeout())
    }, timeoutMs)
    promise.then(
      (value) => {
        if (settled) return
        settled = true
        timers.clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        if (settled) return
        settled = true
        timers.clearTimeout(timer)
        reject(error)
      }
    )
  })
}

export interface PdfExporterDeps {
  createPrintWindow: () => PrintWindowLike
  /** Nativer Speichern-Dialog; `null` = abgebrochen. */
  showSaveDialog: (options: ReturnType<typeof buildSaveDialogOptions>) => Promise<string | null>
  writeFile: (path: string, data: Uint8Array) => Promise<void>
  /** Zeitlimit bis `pdf:ready` (Standard `PDF_READY_TIMEOUT_MS`). */
  timeoutMs?: number
  /** Zeitlimit für `printToPDF` (Standard `PDF_PRINT_TIMEOUT_MS`). */
  printTimeoutMs?: number
  /** Zeitlimit für den Speichern-Dialog (Standard `PDF_SAVE_DIALOG_TIMEOUT_MS`). */
  dialogTimeoutMs?: number
  timers?: Timers
}

/** Ein Export zur Zeit; merkt sich das laufende Druckfenster für `pdf:ready`. */
export class PdfExporter {
  private running = false
  private pending: { id: number; gate: ReadyGate } | null = null

  constructor(private readonly deps: PdfExporterDeps) {}

  /** true, wenn `senderId` das Druckfenster des laufenden Exports ist. */
  isPrintWindow(senderId: number): boolean {
    return this.pending !== null && this.pending.id === senderId
  }

  /** `pdf:ready` vom Druckfenster; false bei fremdem Absender oder ohne Export. */
  notifyReady(senderId: number): boolean {
    if (!this.isPrintWindow(senderId)) return false
    this.pending?.gate.open()
    return true
  }

  async export(input: PdfExportInput): Promise<{ saved: boolean }> {
    if (this.running) throw PDF_ERRORS.busy()
    this.running = true
    let win: PrintWindowLike | null = null
    let gate: ReadyGate | null = null
    try {
      gate = createReadyGate(this.deps.timeoutMs ?? PDF_READY_TIMEOUT_MS, this.deps.timers)
      const thisGate = gate
      win = this.deps.createPrintWindow()
      this.pending = { id: win.id, gate }
      win.onGone(() => thisGate.fail(PDF_ERRORS.renderGone()))

      await Promise.all([win.load(buildPrintRoute(input)), gate.promise])

      let data: Uint8Array
      try {
        data = await withTimeout(
          win.printToPDF(buildPrintToPdfOptions(input.language)),
          this.deps.printTimeoutMs ?? PDF_PRINT_TIMEOUT_MS,
          PDF_ERRORS.printTimeout,
          this.deps.timers
        )
      } catch (err) {
        if (err instanceof PdfExportError) throw err
        throw PDF_ERRORS.render()
      }
      this.closeWindow(win)
      win = null
      this.pending = null

      // Nach Ablauf bleibt der native Dialog ggf. offen; seine Antwort wird
      // verworfen, weil `withTimeout` bereits abgelehnt hat (nichts wird geschrieben).
      const path = await withTimeout(
        this.deps.showSaveDialog(buildSaveDialogOptions(input)),
        this.deps.dialogTimeoutMs ?? PDF_SAVE_DIALOG_TIMEOUT_MS,
        PDF_ERRORS.dialogTimeout,
        this.deps.timers
      )
      if (path === null) return { saved: false }
      try {
        await this.deps.writeFile(path, data)
      } catch {
        throw PDF_ERRORS.write()
      }
      return { saved: true }
    } catch (err) {
      if (err instanceof PdfExportError) throw err
      throw PDF_ERRORS.render()
    } finally {
      gate?.dispose()
      this.pending = null
      if (win) this.closeWindow(win)
      this.running = false
    }
  }

  private closeWindow(win: PrintWindowLike): void {
    try {
      if (!win.isDestroyed()) win.close()
    } catch {
      // Fenster ist bereits weg.
    }
  }
}
