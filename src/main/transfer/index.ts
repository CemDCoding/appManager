/** Electron wiring of the ZIP export/import (AP-25). */
import { readFile, stat, writeFile } from 'node:fs/promises'
import {
  dialog,
  type BrowserWindow,
  type IpcMain,
  type OpenDialogOptions,
  type SaveDialogOptions
} from 'electron'
import type { InvokeEventLike, IpcMainLike } from '../ipc/handlers'
import type { SafeLogger } from '../storage/errors'
import type { DataStore } from '../storage/store'
import { registerTransferHandlers } from './ipc'
import { TransferService } from './service'

export interface TransferSetupOptions {
  ipcMain: IpcMain
  store: () => DataStore
  appVersion: string
  isTrustedSender: (event: InvokeEventLike) => boolean
  /** Parent of the native dialogs (main window), if any. */
  parentWindow: () => BrowserWindow | null
  log?: SafeLogger
}

const ZIP_FILTER = [{ name: 'ZIP', extensions: ['zip'] }]

/** Registers `export:zip` and `import:zip`. */
export function setupTransfer(options: TransferSetupOptions): void {
  const service = new TransferService({
    store: options.store,
    appVersion: options.appVersion,
    now: () => new Date(),
    showSaveDialog: async (defaultName) => {
      const dialogOptions: SaveDialogOptions = { defaultPath: defaultName, filters: ZIP_FILTER }
      const parent = options.parentWindow()
      const result = parent
        ? await dialog.showSaveDialog(parent, dialogOptions)
        : await dialog.showSaveDialog(dialogOptions)
      return result.canceled || !result.filePath ? null : result.filePath
    },
    showOpenDialog: async () => {
      const dialogOptions: OpenDialogOptions = { properties: ['openFile'], filters: ZIP_FILTER }
      const parent = options.parentWindow()
      const result = parent
        ? await dialog.showOpenDialog(parent, dialogOptions)
        : await dialog.showOpenDialog(dialogOptions)
      return result.canceled ? null : (result.filePaths[0] ?? null)
    },
    fileSize: async (path) => {
      const info = await stat(path)
      if (!info.isFile()) throw new Error('not a file')
      return info.size
    },
    readFile: (path) => readFile(path),
    writeFile: (path, data) => writeFile(path, data)
  })
  registerTransferHandlers(options.ipcMain as unknown as IpcMainLike, {
    service,
    isTrustedSender: options.isTrustedSender,
    log: options.log
  })
}
