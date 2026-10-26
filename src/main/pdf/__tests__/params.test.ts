import { describe, expect, it, vi } from 'vitest'
import {
  PDF_READY_TIMEOUT_MS,
  buildPrintRoute,
  buildPrintToPdfOptions,
  buildSaveDialogOptions,
  defaultPdfFileName,
  footerTemplate,
  isValidReadyPayload,
  parsePdfExportInput
} from '../params'

// window.ts importiert Electron; für die Options-Tests reicht ein Platzhalter.
vi.mock('electron', () => ({ BrowserWindow: vi.fn() }))
const { buildPrintWindowOptions, devPrintUrl } = await import('../window')

const PROJECT_ID = '3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e'
const portfolio = {
  scope: 'portfolio',
  period: { from: '2026-01-01', to: '2026-03-31' },
  language: 'de',
  displayCurrency: 'EUR'
}

describe('parsePdfExportInput', () => {
  it('akzeptiert einen Portfolio-Auftrag', () => {
    const r = parsePdfExportInput(portfolio)
    expect(r).toEqual({ ok: true, input: portfolio })
  })

  it('akzeptiert einen Projekt-Auftrag mit Projekt-ID', () => {
    const r = parsePdfExportInput({ ...portfolio, scope: 'project', projectId: PROJECT_ID })
    expect(r.ok).toBe(true)
  })

  it.each([
    ['kein Objekt', 'portfolio'],
    ['null', null],
    ['Array', [portfolio]],
    ['Projekt ohne ID', { ...portfolio, scope: 'project' }],
    ['Portfolio mit ID', { ...portfolio, projectId: PROJECT_ID }],
    ['ID kein UUID', { ...portfolio, scope: 'project', projectId: '../../etc' }],
    ['Zeitraum verkehrt', { ...portfolio, period: { from: '2026-04-01', to: '2026-03-31' } }],
    ['ungültiges Datum', { ...portfolio, period: { from: '2026-02-30', to: '2026-03-31' } }],
    ['unbekannte Sprache', { ...portfolio, language: 'fr' }],
    ['ungültige Währung', { ...portfolio, displayCurrency: 'eur' }],
    ['unbekannter Bereich', { ...portfolio, scope: 'all' }]
  ])('lehnt ab: %s', (_name, payload) => {
    expect(parsePdfExportInput(payload).ok).toBe(false)
  })

  it.each(['filePath', 'path', 'outputPath', 'url'])(
    'lehnt zusätzliche Felder wie %s ab (keine Pfade aus dem Renderer)',
    (key) => {
      const r = parsePdfExportInput({ ...portfolio, [key]: 'C:/Windows/evil.pdf' })
      expect(r).toEqual({ ok: false, message: `Unknown field (${key})` })
    }
  )
})

describe('isValidReadyPayload', () => {
  it('nur { ready: true }', () => {
    expect(isValidReadyPayload({ ready: true })).toBe(true)
    expect(isValidReadyPayload({ ready: false })).toBe(false)
    expect(isValidReadyPayload(undefined)).toBe(false)
    expect(isValidReadyPayload({ ready: true, extra: 1 })).toBe(false)
  })
})

describe('buildPrintRoute', () => {
  it('baut die Druckroute mit allen Parametern', () => {
    const route = buildPrintRoute({
      scope: 'project',
      projectId: PROJECT_ID,
      period: { from: '2026-01-01', to: '2026-03-31' },
      language: 'en',
      displayCurrency: 'USD'
    })
    expect(route).toBe(
      `/print?scope=project&projectId=${PROJECT_ID}&from=2026-01-01&to=2026-03-31&lang=en&currency=USD`
    )
  })

  it('lässt projectId im Portfolio weg', () => {
    const r = parsePdfExportInput(portfolio)
    if (!r.ok) throw new Error('expected ok')
    expect(buildPrintRoute(r.input)).not.toContain('projectId')
  })
})

describe('Druck- und Dialogoptionen', () => {
  it('A4, Hintergründe an, Fußzeile mit Seitenzahl', () => {
    const o = buildPrintToPdfOptions('de')
    expect(o.pageSize).toBe('A4')
    expect(o.printBackground).toBe(true)
    expect(o.displayHeaderFooter).toBe(true)
    expect(o.footerTemplate).toContain('class="pageNumber"')
    expect(o.footerTemplate).toContain('Seite')
    expect(footerTemplate('en')).toContain('Page')
    expect(o.margins.top).toBeGreaterThan(0)
  })

  it('Dateiname ohne Pfadanteile, Dialog nur für PDF', () => {
    const r = parsePdfExportInput(portfolio)
    if (!r.ok) throw new Error('expected ok')
    const name = defaultPdfFileName(r.input)
    expect(name).toBe('Bericht-Portfolio-2026-01-01_2026-03-31.pdf')
    expect(name).not.toMatch(/[\\/:]/)
    const d = buildSaveDialogOptions(r.input)
    expect(d.defaultPath).toBe(name)
    expect(d.filters).toEqual([{ name: 'PDF', extensions: ['pdf'] }])
  })

  it('Zeitlimit ist 30 s', () => {
    expect(PDF_READY_TIMEOUT_MS).toBe(30_000)
  })
})

describe('Druckfenster', () => {
  it('ist versteckt und hat dieselbe Härtung wie das Hauptfenster', () => {
    const o = buildPrintWindowOptions('/preload.cjs')
    expect(o.show).toBe(false)
    expect(o.webPreferences).toMatchObject({
      preload: '/preload.cjs',
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false
    })
  })

  it('Dev-Adresse nutzt nur den Origin des Dev-Servers', () => {
    expect(devPrintUrl('http://localhost:5173/some/path?x=1', '/print?scope=portfolio')).toBe(
      'http://localhost:5173/#/print?scope=portfolio'
    )
  })
})
