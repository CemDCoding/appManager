import { app, BrowserWindow, session } from 'electron'
import {
  buildContentSecurityPolicy,
  hardenSession,
  hardenWebContents,
  parseDevServerOrigin
} from './security'
import { createMainWindow } from './window'

// Dev-Server nur, wenn die App nicht paketiert ist und die URL lokal ist.
// In der paketierten App gibt es keine Ausnahme (keine Abschwaechung in Prod).
const devServerUrl =
  !app.isPackaged && parseDevServerOrigin(process.env['ELECTRON_RENDERER_URL'])
    ? process.env['ELECTRON_RENDERER_URL']
    : undefined

let mainWindow: BrowserWindow | null = null

function openMainWindow(): void {
  mainWindow = createMainWindow(devServerUrl)
  mainWindow.on('closed', () => {
    mainWindow = null
  })
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

  void app.whenReady().then(() => {
    hardenSession(session.defaultSession, buildContentSecurityPolicy(devServerUrl))
    openMainWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) openMainWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
