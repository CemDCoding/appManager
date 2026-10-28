/**
 * Verstecktes Druckfenster für den PDF-Export (AP-24).
 *
 * Gleiche Härtung wie das Hauptfenster (Plan §5): `secureWebPreferences`
 * (contextIsolation, kein nodeIntegration, Sandbox, kein webview), dieselbe
 * gehärtete Session mit CSP; Navigation und neue Fenster blockiert der
 * `web-contents-created`-Hook in `index.ts` für jeden WebContents. Geladen wird
 * nur die App selbst (Dev-Server lokal bzw. gebaute `index.html`).
 */
import { BrowserWindow } from 'electron'
import type { BrowserWindowConstructorOptions } from 'electron'
import { join } from 'node:path'
import { secureWebPreferences } from '../security'
import { preloadPath } from '../window'
import type { PrintWindowLike } from './exporter'
import { PRINT_WINDOW_SIZE } from './params'

/** Fensteroptionen des Druckfensters, exportiert für Tests. */
export function buildPrintWindowOptions(preload: string): BrowserWindowConstructorOptions {
  return {
    width: PRINT_WINDOW_SIZE.width,
    height: PRINT_WINDOW_SIZE.height,
    show: false,
    paintWhenInitiallyHidden: true,
    skipTaskbar: true,
    focusable: false,
    title: 'appManager – PDF',
    // Keine Drosselung von Timern im versteckten Fenster (sonst verzögert sich `pdf:ready`).
    webPreferences: {
      ...secureWebPreferences(preload),
      spellcheck: false,
      backgroundThrottling: false
    }
  }
}

/**
 * Adresse der Druckseite im Dev-Modus: nur der Origin des lokalen Dev-Servers
 * plus Hash-Route (keine fremden Pfade oder Parameter).
 */
export function devPrintUrl(devServerUrl: string, route: string): string {
  const url = new URL(devServerUrl)
  return `${url.origin}/#${route}`
}

/** Erzeugt das versteckte Druckfenster (`devServerUrl` nur im Dev-Modus). */
export function createPrintWindow(devServerUrl: string | undefined): PrintWindowLike {
  const win = new BrowserWindow(buildPrintWindowOptions(preloadPath()))
  win.webContents.setAudioMuted(true)
  const id = win.webContents.id
  return {
    id,
    async load(route) {
      if (devServerUrl) {
        await win.loadURL(devPrintUrl(devServerUrl, route))
      } else {
        await win.loadFile(join(import.meta.dirname, '../renderer/index.html'), { hash: route })
      }
    },
    async printToPDF(options) {
      return win.webContents.printToPDF(options)
    },
    onGone(cb) {
      win.on('closed', cb)
      win.webContents.on('render-process-gone', cb)
    },
    isDestroyed: () => win.isDestroyed(),
    close: () => win.destroy()
  }
}
