import { randomUUID } from 'node:crypto'
import { app, BrowserWindow, dialog, ipcMain, session, shell } from 'electron'
import type { OpenDialogOptions } from 'electron'
import { readAppConfig, writeAppConfig } from './config/appConfig'
import { chooseDataDir, isEnvOverride, resolveDataDir } from './config/dataDir'
import { isTrustedSenderUrl, registerIpcHandlers } from './ipc/handlers'
import { setupPdfExport } from './pdf'
import {
  buildContentSecurityPolicy,
  hardenSession,
  hardenWebContents,
  parseDevServerOrigin
} from './security'
import { StorageError, consoleLogger } from './storage/errors'
import { DataService } from './storage/service'
import { setupTransfer } from './transfer'
import { createMainWindow } from './window'

// Dev-Server nur, wenn die App nicht paketiert ist und die URL lokal ist.
// In der paketierten App gibt es keine Ausnahme (keine Abschwaechung in Prod).
const devServerUrl =
  !app.isPackaged && parseDevServerOrigin(process.env['ELECTRON_RENDERER_URL'])
    ? process.env['ELECTRON_RENDERER_URL']
    : undefined

let mainWindow: BrowserWindow | null = null

const dataService = new DataService({
  now: () => new Date(),
  newId: () => randomUUID(),
  log: consoleLogger
})

function openMainWindow(): void {
  mainWindow = createMainWindow(devServerUrl)
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

/** Datenordner bestimmen, Start-Backup anlegen, alle Collections laden. */
async function openDataFolder(): Promise<void> {
  const userDataDir = app.getPath('userData')
  const isDev = !app.isPackaged
  // Im Dev-Modus gilt die gespeicherte Wahl nie (PE-18): gar nicht erst lesen.
  const config = isDev ? {} : await readAppConfig(userDataDir)
  const resolved = resolveDataDir({
    envValue: process.env['APP_DATA_DIR'],
    storedDir: config.dataDir,
    isDev,
    repoDir: app.getAppPath(),
    userDataDir
  })
  await dataService.open(resolved.path)
}

/**
 * Nativer Ordnerdialog (nur paketiert). Die Wahl wird gespeichert, bevor
 * umgeschaltet wird; scheitert das Speichern, bleibt der alte Ordner aktiv.
 */
async function chooseAndSwitchDataDir(): Promise<string | null> {
  const dir = await chooseDataDir({
    envOverride: isEnvOverride(process.env['APP_DATA_DIR']),
    isDev: !app.isPackaged,
    showOpenDialog: () => {
      const options: OpenDialogOptions = {
        properties: ['openDirectory', 'createDirectory']
      }
      return mainWindow
        ? dialog.showOpenDialog(mainWindow, options)
        : dialog.showOpenDialog(options)
    }
  })
  if (dir === null) return null
  await dataService.open(dir, async () => {
    // Doppelte Sicherung: im Dev-Modus wird die Config nie geschrieben.
    if (!app.isPackaged) throw new StorageError('CONFLICT', 'dataDir: not saved in development')
    try {
      await writeAppConfig(app.getPath('userData'), { dataDir: dir })
    } catch {
      throw new StorageError('IO', 'dataDir: choice could not be saved')
    }
  })
  return dir
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.enableSandbox()

  // Gilt fuer jeden WebContents der App, auch spaeter erzeugte Fenster.
  app.on('web-contents-created', (_event, contents) => {
    hardenWebContents(contents)
  })

  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  void app.whenReady().then(async () => {
    hardenSession(session.defaultSession, buildContentSecurityPolicy(devServerUrl))
    try {
      await openDataFolder()
    } catch {
      // Ohne Datenordner liefern die Handler INTERNAL/IO; die App startet trotzdem.
      consoleLogger('dataDir', 'IO')
    }
    registerIpcHandlers(ipcMain, {
      store: () => dataService.store,
      dataDir: () => dataService.dir,
      chooseDataDir: chooseAndSwitchDataDir,
      listBackups: () => dataService.listBackups(),
      restoreBackup: (name) => dataService.restoreBackup(name),
      openExternal: (url) => shell.openExternal(url),
      isTrustedSender: (event) => isTrustedSenderUrl(event.senderFrame?.url, devServerUrl),
      log: consoleLogger
    })
    setupPdfExport({
      ipcMain,
      devServerUrl,
      isTrustedSender: (event) => isTrustedSenderUrl(event.senderFrame?.url, devServerUrl),
      parentWindow: () => mainWindow,
      log: consoleLogger
    })
    setupTransfer({
      ipcMain,
      store: () => dataService.store,
      appVersion: app.getVersion(),
      isTrustedSender: (event) => isTrustedSenderUrl(event.senderFrame?.url, devServerUrl),
      parentWindow: () => mainWindow,
      log: consoleLogger
    })
    openMainWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) openMainWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
