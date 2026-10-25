import { BrowserWindow } from 'electron'
import type { BrowserWindowConstructorOptions } from 'electron'
import { join } from 'node:path'
import { secureWebPreferences } from './security'

/** Pfad zum Preload aus der electron-vite-Ausgabe (CJS wegen sandbox: true). */
export function preloadPath(): string {
  return join(import.meta.dirname, '../preload/index.cjs')
}

/** Fensteroptionen des Hauptfensters, exportiert fuer Tests. */
export function buildMainWindowOptions(preload: string): BrowserWindowConstructorOptions {
  return {
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'appManager',
    webPreferences: secureWebPreferences(preload)
  }
}

/**
 * Erzeugt das Hauptfenster und laedt die Oberflaeche.
 * `devServerUrl` wird nur im Dev-Modus uebergeben; sonst wird die gebaute
 * `index.html` aus dem Paket geladen (kein entfernter Inhalt).
 */
export function createMainWindow(devServerUrl: string | undefined): BrowserWindow {
  const win = new BrowserWindow(buildMainWindowOptions(preloadPath()))
  win.once('ready-to-show', () => win.show())

  if (devServerUrl) {
    void win.loadURL(devServerUrl)
  } else {
    void win.loadFile(join(import.meta.dirname, '../renderer/index.html'))
  }
  return win
}
