/** Verdrahtung des PDF-Exports mit Electron (AP-24). */
import { dialog, type BrowserWindow, type IpcMain } from 'electron'
import { writeFile } from 'node:fs/promises'
import type { SafeLogger } from '../storage/errors'
import { PdfExporter } from './exporter'
import { registerPdfHandlers, type PdfInvokeEventLike, type PdfIpcMainLike } from './ipc'
import { createPrintWindow } from './window'

export interface PdfSetupOptions {
  ipcMain: IpcMain
  devServerUrl: string | undefined
  isTrustedSender: (event: PdfInvokeEventLike) => boolean
  /** Elternfenster des Speichern-Dialogs (Hauptfenster), falls vorhanden. */
  parentWindow: () => BrowserWindow | null
  log?: SafeLogger
}

/** Registriert `pdf:export` und `pdf:ready`. */
export function setupPdfExport(options: PdfSetupOptions): void {
  const exporter = new PdfExporter({
    createPrintWindow: () => createPrintWindow(options.devServerUrl),
    showSaveDialog: async (dialogOptions) => {
      const parent = options.parentWindow()
      const result = parent
        ? await dialog.showSaveDialog(parent, dialogOptions)
        : await dialog.showSaveDialog(dialogOptions)
      return result.canceled || !result.filePath ? null : result.filePath
    },
    writeFile: (path, data) => writeFile(path, data)
  })
  registerPdfHandlers(options.ipcMain as unknown as PdfIpcMainLike, {
    exporter,
    isTrustedSender: options.isTrustedSender,
    log: options.log
  })
}
