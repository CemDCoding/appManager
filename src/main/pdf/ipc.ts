/**
 * IPC-Handler `pdf:export` und `pdf:ready` (AP-24). Jede Nachricht wird geprüft:
 * vertrauenswürdiger Absender, zod-Schema, und für `pdf:ready` zusätzlich, dass
 * der Absender das gerade laufende Druckfenster ist.
 */
import { IPC_CHANNELS, fail, ok, type IpcResult, type PdfExportInput } from '@shared/ipc'
import { silentLogger, type SafeLogger } from '../storage/errors'
import { PdfExportError } from './exporter'
import { isValidReadyPayload, parsePdfExportInput } from './params'

/** Teil von Electrons `IpcMainInvokeEvent`, den die PDF-Handler brauchen. */
export interface PdfInvokeEventLike {
  sender: { id: number }
  senderFrame?: { url: string } | null
}

export interface PdfIpcMainLike {
  handle(
    channel: string,
    listener: (event: PdfInvokeEventLike, ...args: unknown[]) => Promise<unknown>
  ): void
}

export interface PdfExporterLike {
  export(input: PdfExportInput): Promise<{ saved: boolean }>
  isPrintWindow(senderId: number): boolean
  notifyReady(senderId: number): boolean
}

export interface PdfIpcDeps {
  exporter: PdfExporterLike
  /** Nur die eigene Oberfläche (gleiche Prüfung wie bei den übrigen Kanälen). */
  isTrustedSender: (event: PdfInvokeEventLike) => boolean
  log?: SafeLogger
}

export function registerPdfHandlers(ipc: PdfIpcMainLike, deps: PdfIpcDeps): void {
  const log = deps.log ?? silentLogger

  ipc.handle(
    IPC_CHANNELS.pdfExport,
    async (event, payload): Promise<IpcResult<{ saved: boolean }>> => {
      // Das Druckfenster selbst darf keinen weiteren Export starten.
      if (!deps.isTrustedSender(event) || deps.exporter.isPrintWindow(event.sender.id)) {
        log(IPC_CHANNELS.pdfExport, 'FORBIDDEN')
        return fail('FORBIDDEN', 'Untrusted sender')
      }
      const parsed = parsePdfExportInput(payload)
      if (!parsed.ok) return fail('VALIDATION', parsed.message)
      try {
        return ok(await deps.exporter.export(parsed.input))
      } catch (err) {
        const code = err instanceof PdfExportError ? err.code : 'INTERNAL'
        const message = err instanceof PdfExportError ? err.message : 'Internal error'
        log(IPC_CHANNELS.pdfExport, code)
        return fail(code, message)
      }
    }
  )

  ipc.handle(IPC_CHANNELS.pdfReady, async (event, payload): Promise<IpcResult<object>> => {
    if (!deps.isTrustedSender(event)) {
      log(IPC_CHANNELS.pdfReady, 'FORBIDDEN')
      return fail('FORBIDDEN', 'Untrusted sender')
    }
    if (!isValidReadyPayload(payload)) return fail('VALIDATION', 'Invalid input')
    if (!deps.exporter.notifyReady(event.sender.id)) {
      log(IPC_CHANNELS.pdfReady, 'FORBIDDEN')
      return fail('FORBIDDEN', 'No report pending for this window')
    }
    return ok({})
  })
}
