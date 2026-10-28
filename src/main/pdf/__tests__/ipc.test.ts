import { describe, expect, it, vi } from 'vitest'
import { IPC_CHANNELS } from '@shared/ipc'
import { PdfExportError } from '../exporter'
import {
  registerPdfHandlers,
  type PdfExporterLike,
  type PdfInvokeEventLike,
  type PdfIpcDeps
} from '../ipc'

type Listener = (event: PdfInvokeEventLike, ...args: unknown[]) => Promise<unknown>

const valid = {
  scope: 'portfolio',
  period: { from: '2026-01-01', to: '2026-03-31' },
  language: 'en',
  displayCurrency: 'EUR'
}
const MAIN = 1
const PRINT = 2
const ev = (id: number, url = 'file:///app/index.html'): PdfInvokeEventLike => ({
  sender: { id },
  senderFrame: { url }
})

function setup(exporterOverrides: Partial<PdfExporterLike> = {}) {
  const handlers = new Map<string, Listener>()
  const exporter: PdfExporterLike = {
    export: vi.fn(async () => ({ saved: true })),
    isPrintWindow: vi.fn((id: number) => id === PRINT),
    notifyReady: vi.fn((id: number) => id === PRINT),
    ...exporterOverrides
  }
  const deps: PdfIpcDeps = {
    exporter,
    isTrustedSender: (e) => e.senderFrame?.url.startsWith('file:') ?? false,
    log: vi.fn()
  }
  registerPdfHandlers({ handle: (ch, l) => handlers.set(ch, l) }, deps)
  const call = (channel: string, event: PdfInvokeEventLike, payload?: unknown) =>
    handlers.get(channel)!(event, payload)
  return { exporter, deps, call, handlers }
}

describe('registerPdfHandlers', () => {
  it('registriert pdf:export und pdf:ready', () => {
    const { handlers } = setup()
    expect([...handlers.keys()].sort()).toEqual([IPC_CHANNELS.pdfExport, IPC_CHANNELS.pdfReady])
  })

  it('pdf:export mit gültigem Auftrag ruft den Exporter', async () => {
    const { exporter, call } = setup()
    await expect(call(IPC_CHANNELS.pdfExport, ev(MAIN), valid)).resolves.toEqual({
      ok: true,
      data: { saved: true }
    })
    expect(exporter.export).toHaveBeenCalledWith(valid)
  })

  it('pdf:export lehnt ungültige Parameter ab (VALIDATION)', async () => {
    const { exporter, call } = setup()
    const r = await call(IPC_CHANNELS.pdfExport, ev(MAIN), { ...valid, filePath: 'C:/x.pdf' })
    expect(r).toMatchObject({ ok: false, error: { code: 'VALIDATION' } })
    expect(exporter.export).not.toHaveBeenCalled()
  })

  it('pdf:export von fremdem Absender → FORBIDDEN', async () => {
    const { exporter, call } = setup()
    const r = await call(IPC_CHANNELS.pdfExport, ev(MAIN, 'https://evil.example'), valid)
    expect(r).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } })
    expect(exporter.export).not.toHaveBeenCalled()
  })

  it('pdf:export aus dem Druckfenster selbst → FORBIDDEN', async () => {
    const { exporter, call } = setup()
    const r = await call(IPC_CHANNELS.pdfExport, ev(PRINT), valid)
    expect(r).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } })
    expect(exporter.export).not.toHaveBeenCalled()
  })

  it('Fehler des Exporters werden als IpcResult gemeldet', async () => {
    const { call } = setup({
      export: vi.fn(async () => {
        throw new PdfExportError('IO', 'pdf: file could not be written')
      })
    })
    await expect(call(IPC_CHANNELS.pdfExport, ev(MAIN), valid)).resolves.toEqual({
      ok: false,
      error: { code: 'IO', message: 'pdf: file could not be written' }
    })
  })

  it('unerwartete Fehler → INTERNAL ohne Details', async () => {
    const { call } = setup({
      export: vi.fn(async () => {
        throw new Error('secret detail C:/Users')
      })
    })
    await expect(call(IPC_CHANNELS.pdfExport, ev(MAIN), valid)).resolves.toEqual({
      ok: false,
      error: { code: 'INTERNAL', message: 'Internal error' }
    })
  })

  it('pdf:ready vom Druckfenster wird angenommen', async () => {
    const { exporter, call } = setup()
    await expect(call(IPC_CHANNELS.pdfReady, ev(PRINT), { ready: true })).resolves.toEqual({
      ok: true,
      data: {}
    })
    expect(exporter.notifyReady).toHaveBeenCalledWith(PRINT)
  })

  it('pdf:ready von einem anderen Fenster → FORBIDDEN', async () => {
    const { call } = setup()
    const r = await call(IPC_CHANNELS.pdfReady, ev(MAIN), { ready: true })
    expect(r).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } })
  })

  it('pdf:ready mit falschem Payload → VALIDATION', async () => {
    const { exporter, call } = setup()
    const r = await call(IPC_CHANNELS.pdfReady, ev(PRINT), { ready: 'yes' })
    expect(r).toMatchObject({ ok: false, error: { code: 'VALIDATION' } })
    expect(exporter.notifyReady).not.toHaveBeenCalled()
  })

  it('pdf:ready von fremdem Absender → FORBIDDEN', async () => {
    const { exporter, call } = setup()
    const r = await call(IPC_CHANNELS.pdfReady, ev(PRINT, 'https://evil.example'), {
      ready: true
    })
    expect(r).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } })
    expect(exporter.notifyReady).not.toHaveBeenCalled()
  })
})
