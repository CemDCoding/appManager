import { describe, expect, it, vi } from 'vitest'
import type { Session, WebContents } from 'electron'
import {
  buildContentSecurityPolicy,
  hardenSession,
  hardenWebContents,
  isSafeExternalUrl,
  parseDevServerOrigin,
  secureWebPreferences,
  withCspHeader
} from '../security'

// window.ts importiert Electron; fuer den Test reicht ein Platzhalter.
vi.mock('electron', () => ({ BrowserWindow: vi.fn() }))
const { buildMainWindowOptions } = await import('../window')

describe('isSafeExternalUrl', () => {
  it.each(['https://example.com', 'https://example.com/path?q=1#x', 'http://example.org'])(
    'erlaubt %s',
    (url) => {
      expect(isSafeExternalUrl(url)).toBe(true)
    }
  )

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    ' javascript:alert(1)',
    'file:///C:/Windows/System32/calc.exe',
    'file://server/share',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'ftp://example.com',
    'mailto:someone@example.com',
    'ms-settings:',
    'https://user:pass@example.com',
    'https://',
    '//example.com',
    '/relative/path',
    'example.com',
    '',
    '   '
  ])('lehnt %s ab', (url) => {
    expect(isSafeExternalUrl(url)).toBe(false)
  })

  it('lehnt Nicht-Strings und zu lange URLs ab', () => {
    expect(isSafeExternalUrl(undefined)).toBe(false)
    expect(isSafeExternalUrl(null)).toBe(false)
    expect(isSafeExternalUrl(42)).toBe(false)
    expect(isSafeExternalUrl({ href: 'https://example.com' })).toBe(false)
    expect(isSafeExternalUrl(`https://example.com/${'a'.repeat(2100)}`)).toBe(false)
  })
})

describe('parseDevServerOrigin', () => {
  it('akzeptiert nur lokale http-Server', () => {
    expect(parseDevServerOrigin('http://localhost:5173')?.origin).toBe('http://localhost:5173')
    expect(parseDevServerOrigin('http://127.0.0.1:5173/')?.origin).toBe('http://127.0.0.1:5173')
    expect(parseDevServerOrigin(undefined)).toBeNull()
    expect(parseDevServerOrigin('')).toBeNull()
    expect(parseDevServerOrigin('kein url')).toBeNull()
    expect(parseDevServerOrigin('https://evil.example.com')).toBeNull()
    expect(parseDevServerOrigin('http://evil.example.com:5173')).toBeNull()
    expect(parseDevServerOrigin('file:///C:/app/index.html')).toBeNull()
  })
})

describe('buildContentSecurityPolicy', () => {
  it('ist im Prod-Modus strikt und ohne Fremdquellen', () => {
    expect(buildContentSecurityPolicy()).toBe(
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; " +
        "frame-src 'none'; worker-src 'self'; base-uri 'self'; form-action 'none'; " +
        "frame-ancestors 'none'"
    )
  })

  it('erlaubt nie unsichere Skripte oder Fremd-Hosts', () => {
    for (const csp of [
      buildContentSecurityPolicy(),
      buildContentSecurityPolicy('http://localhost:5173')
    ]) {
      expect(csp).not.toMatch(/script-src[^;]*'unsafe-(inline|eval)'/)
      expect(csp).not.toContain('https:')
      expect(csp).not.toContain('*')
    }
  })

  it('erlaubt den lokalen Dev-Server nur im Dev-Modus', () => {
    const csp = buildContentSecurityPolicy('http://localhost:5173')
    expect(csp).toContain("script-src 'self' http://localhost:5173")
    expect(csp).toContain("connect-src 'self' http://localhost:5173 ws://localhost:5173")
    expect(buildContentSecurityPolicy()).not.toContain('localhost')
  })

  it('ignoriert eine nicht lokale Dev-Server-URL', () => {
    expect(buildContentSecurityPolicy('https://evil.example.com')).toBe(
      buildContentSecurityPolicy()
    )
  })
})

describe('withCspHeader', () => {
  it('ersetzt vorhandene CSP-Header und behaelt die anderen', () => {
    const result = withCspHeader(
      { 'content-security-policy': ['default-src *'], 'Content-Type': 'text/html' },
      "default-src 'self'"
    )
    expect(result).toEqual({
      'Content-Type': ['text/html'],
      'Content-Security-Policy': ["default-src 'self'"]
    })
  })

  it('funktioniert ohne Header', () => {
    expect(withCspHeader(undefined, 'x')).toEqual({ 'Content-Security-Policy': ['x'] })
  })
})

describe('Fensteroptionen', () => {
  it('secureWebPreferences setzt alle Sicherheitsoptionen', () => {
    expect(secureWebPreferences('/out/preload/index.cjs')).toEqual({
      preload: '/out/preload/index.cjs',
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
    })
  })

  it('Hauptfenster nutzt die sicheren webPreferences und den CJS-Preload', () => {
    const options = buildMainWindowOptions('/out/preload/index.cjs')
    expect(options.show).toBe(false)
    expect(options.webPreferences).toEqual(secureWebPreferences('/out/preload/index.cjs'))
    expect(options.webPreferences?.contextIsolation).toBe(true)
    expect(options.webPreferences?.nodeIntegration).toBe(false)
    expect(options.webPreferences?.sandbox).toBe(true)
    expect(options.webPreferences?.webSecurity).toBe(true)
  })
})

describe('hardenWebContents', () => {
  function fakeContents() {
    const handlers = new Map<string, (event: { preventDefault: () => void }) => void>()
    let openHandler: (() => { action: string }) | undefined
    const contents = {
      on: (name: string, fn: (event: { preventDefault: () => void }) => void) => {
        handlers.set(name, fn)
      },
      setWindowOpenHandler: (fn: () => { action: string }) => {
        openHandler = fn
      }
    }
    hardenWebContents(contents as unknown as WebContents)
    return { handlers, openHandler: () => openHandler?.() }
  }

  it.each(['will-navigate', 'will-redirect', 'will-attach-webview'])('verhindert %s', (name) => {
    const { handlers } = fakeContents()
    const event = { preventDefault: vi.fn() }
    handlers.get(name)?.(event)
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
  })

  it('window.open oeffnet nichts', () => {
    expect(fakeContents().openHandler()).toEqual({ action: 'deny' })
  })
})

describe('hardenSession', () => {
  it('setzt CSP und lehnt Berechtigungen ab', () => {
    let headersHandler:
      | ((
          details: { responseHeaders?: Record<string, string[]> },
          cb: (r: unknown) => void
        ) => void)
      | undefined
    let requestHandler: ((wc: unknown, p: string, cb: (ok: boolean) => void) => void) | undefined
    let checkHandler: (() => boolean) | undefined
    const session = {
      webRequest: { onHeadersReceived: (fn: typeof headersHandler) => (headersHandler = fn) },
      setPermissionRequestHandler: (fn: typeof requestHandler) => (requestHandler = fn),
      setPermissionCheckHandler: (fn: typeof checkHandler) => (checkHandler = fn)
    }
    hardenSession(session as unknown as Session, "default-src 'self'")

    const headerCb = vi.fn()
    headersHandler?.({ responseHeaders: { 'Content-Type': ['text/html'] } }, headerCb)
    expect(headerCb).toHaveBeenCalledWith({
      responseHeaders: {
        'Content-Type': ['text/html'],
        'Content-Security-Policy': ["default-src 'self'"]
      }
    })

    const permCb = vi.fn()
    requestHandler?.({}, 'media', permCb)
    expect(permCb).toHaveBeenCalledWith(false)
    expect(checkHandler?.()).toBe(false)
  })
})
