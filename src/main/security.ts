/**
 * Electron-Haertung (Plan §5, AP-03).
 *
 * Diese Datei importiert Electron nur als Typ. Alle Funktionen bekommen die
 * Electron-Objekte als Parameter, damit die Logik ohne Electron testbar ist.
 */
import type { Session, WebContents, WebPreferences } from 'electron'

/** Erlaubte Protokolle fuer das Oeffnen externer Links (Dienst-URLs). */
const SAFE_EXTERNAL_PROTOCOLS: ReadonlySet<string> = new Set(['https:', 'http:'])

/**
 * Prueft, ob eine URL extern geoeffnet werden darf (z. B. per `shell.openExternal`).
 * Erlaubt sind nur absolute `https:`- und `http:`-URLs mit Host.
 * Alles andere (javascript:, file:, data:, relative oder kaputte URLs) wird abgelehnt.
 */
export function isSafeExternalUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false
  const trimmed = url.trim()
  if (trimmed === '' || trimmed.length > 2048) return false
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return false
  }
  if (!SAFE_EXTERNAL_PROTOCOLS.has(parsed.protocol)) return false
  if (parsed.hostname === '') return false
  // Zugangsdaten in der URL (user:pass@host) sind ein typisches Phishing-Muster.
  if (parsed.username !== '' || parsed.password !== '') return false
  return true
}

const LOCAL_DEV_HOSTS: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '[::1]'])

/**
 * Liefert den Origin des lokalen Dev-Servers oder `null`, wenn die URL nicht
 * auf einen lokalen http-Server zeigt. So kann ueber die Umgebungsvariable
 * keine fremde Quelle in die CSP gelangen.
 */
export function parseDevServerOrigin(devServerUrl: string | undefined): URL | null {
  if (!devServerUrl) return null
  let parsed: URL
  try {
    parsed = new URL(devServerUrl)
  } catch {
    return null
  }
  if (parsed.protocol !== 'http:') return null
  if (!LOCAL_DEV_HOSTS.has(parsed.hostname)) return null
  return parsed
}

/**
 * Baut die Content-Security-Policy.
 *
 * - Produktion (`devServerUrl` fehlt): nur `'self'`, keine Fremdquellen.
 * - Entwicklung: zusaetzlich der lokale Dev-Server (Skripte, HMR-WebSocket).
 *
 * `style-src 'unsafe-inline'` ist noetig, weil Radix UI (shadcn/ui) und dessen
 * Hilfsbibliotheken (z. B. react-remove-scroll) `<style>`-Elemente zur Laufzeit
 * einfuegen und Vite CSS im Dev-Modus als `<style>`-Tags laedt. Skripte bleiben
 * strikt ohne `'unsafe-inline'`/`'unsafe-eval'`.
 */
export function buildContentSecurityPolicy(devServerUrl?: string): string {
  const dev = parseDevServerOrigin(devServerUrl)
  const scriptSrc = ["'self'"]
  const connectSrc = ["'self'"]
  if (dev) {
    scriptSrc.push(dev.origin)
    connectSrc.push(dev.origin, `ws://${dev.host}`)
  }
  const directives: Array<[string, string[]]> = [
    ['default-src', ["'self'"]],
    ['script-src', scriptSrc],
    ['style-src', ["'self'", "'unsafe-inline'"]],
    ['img-src', ["'self'", 'data:']],
    ['font-src', ["'self'"]],
    ['connect-src', connectSrc],
    ['object-src', ["'none'"]],
    ['frame-src', ["'none'"]],
    ['worker-src', ["'self'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'none'"]],
    ['frame-ancestors', ["'none'"]]
  ]
  return directives.map(([name, values]) => `${name} ${values.join(' ')}`).join('; ')
}

/**
 * Sichere webPreferences fuer jedes Fenster der App (Plan §5).
 * `preloadPath` zeigt auf die electron-vite-Ausgabe (`out/preload/index.cjs`).
 */
export function secureWebPreferences(preloadPath: string): WebPreferences {
  return {
    preload: preloadPath,
    contextIsolation: true,
    nodeIntegration: false,
    nodeIntegrationInWorker: false,
    nodeIntegrationInSubFrames: false,
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false,
    webviewTag: false,
    experimentalFeatures: false,
    navigateOnDragDrop: false
  }
}

type ResponseHeaders = Record<string, string | string[]>

/** Setzt den CSP-Header und entfernt eventuell vorhandene CSP-Header (gross/klein). */
export function withCspHeader(
  headers: ResponseHeaders | undefined,
  csp: string
): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (key.toLowerCase() === 'content-security-policy') continue
    result[key] = Array.isArray(value) ? value : [value]
  }
  result['Content-Security-Policy'] = [csp]
  return result
}

/**
 * Haertet eine Session: CSP-Header auf allen Antworten, alle
 * Berechtigungsanfragen (Kamera, Mikrofon, Benachrichtigungen ...) abgelehnt.
 */
export function hardenSession(session: Session, csp: string): void {
  session.webRequest.onHeadersReceived((details, callback) => {
    callback({ responseHeaders: withCspHeader(details.responseHeaders, csp) })
  })
  session.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false)
  })
  session.setPermissionCheckHandler(() => false)
}

/**
 * Haertet einen WebContents: keine Navigation, keine Weiterleitung,
 * keine neuen Fenster, keine <webview>-Tags.
 * In-App-Routing (History-API/Hash) loest `will-navigate` nicht aus.
 */
export function hardenWebContents(contents: WebContents): void {
  contents.on('will-navigate', (event) => {
    event.preventDefault()
  })
  contents.on('will-redirect', (event) => {
    event.preventDefault()
  })
  contents.on('will-attach-webview', (event) => {
    event.preventDefault()
  })
  contents.setWindowOpenHandler(() => ({ action: 'deny' }))
}
