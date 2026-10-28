import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PdfExportInput } from '@shared/ipc'
import {
  PdfExportError,
  PdfExporter,
  createReadyGate,
  type PdfExporterDeps,
  type PrintWindowLike
} from '../exporter'

const input: PdfExportInput = {
  scope: 'portfolio',
  period: { from: '2026-01-01', to: '2026-03-31' },
  language: 'de',
  displayCurrency: 'EUR'
}
const PDF = new Uint8Array([37, 80, 68, 70])

interface FakeWindow extends PrintWindowLike {
  loadedRoute: string | null
  closed: boolean
  gone: () => void
}

function fakeWindow(id = 7): FakeWindow {
  let goneCb: () => void = () => {}
  const win: FakeWindow = {
    id,
    loadedRoute: null,
    closed: false,
    load: vi.fn(async (route: string) => {
      win.loadedRoute = route
    }),
    printToPDF: vi.fn(async () => PDF),
    onGone: (cb) => {
      goneCb = cb
    },
    gone: () => goneCb(),
    isDestroyed: () => win.closed,
    close: vi.fn(() => {
      win.closed = true
    })
  }
  return win
}

function setup(overrides: Partial<PdfExporterDeps> = {}) {
  const win = fakeWindow()
  const deps: PdfExporterDeps = {
    createPrintWindow: vi.fn(() => win),
    showSaveDialog: vi.fn(async () => 'D:/reports/report.pdf'),
    writeFile: vi.fn(async () => {}),
    ...overrides
  }
  return { win, deps, exporter: new PdfExporter(deps) }
}

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('createReadyGate', () => {
  it('erfüllt bei open() vor Ablauf des Zeitlimits', async () => {
    const gate = createReadyGate(30_000)
    vi.advanceTimersByTime(29_999)
    gate.open()
    await expect(gate.promise).resolves.toBeUndefined()
  })

  it('lehnt nach Ablauf des Zeitlimits ab', async () => {
    const gate = createReadyGate(30_000)
    vi.advanceTimersByTime(30_000)
    await expect(gate.promise).rejects.toMatchObject({ code: 'INTERNAL' })
    gate.open() // nach dem Ergebnis wirkungslos
  })

  it('fail() lehnt mit dem übergebenen Fehler ab und stoppt den Timer', async () => {
    const gate = createReadyGate(1_000)
    const err = new Error('x')
    gate.fail(err)
    vi.advanceTimersByTime(5_000)
    await expect(gate.promise).rejects.toBe(err)
  })
})

describe('PdfExporter', () => {
  it('rendert, wartet auf ready, speichert unter dem Dialog-Pfad und schließt das Fenster', async () => {
    const { win, deps, exporter } = setup()
    const run = exporter.export(input)
    await vi.advanceTimersByTimeAsync(0)
    expect(win.loadedRoute).toContain('/print?scope=portfolio')
    expect(exporter.isPrintWindow(win.id)).toBe(true)
    expect(exporter.notifyReady(win.id)).toBe(true)
    await expect(run).resolves.toEqual({ saved: true })
    expect(win.printToPDF).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: 'A4', printBackground: true })
    )
    expect(deps.writeFile).toHaveBeenCalledWith('D:/reports/report.pdf', PDF)
    expect(win.closed).toBe(true)
    expect(exporter.isPrintWindow(win.id)).toBe(false)
  })

  it('Dialog abgebrochen → saved false, nichts geschrieben', async () => {
    const { win, deps, exporter } = setup({ showSaveDialog: vi.fn(async () => null) })
    const run = exporter.export(input)
    await vi.advanceTimersByTimeAsync(0)
    exporter.notifyReady(win.id)
    await expect(run).resolves.toEqual({ saved: false })
    expect(deps.writeFile).not.toHaveBeenCalled()
  })

  it('Zeitlimit: ohne ready nach 30 s Fehler, kein PDF, Fenster geschlossen', async () => {
    const { win, deps, exporter } = setup()
    const run = exporter.export(input)
    const check = expect(run).rejects.toMatchObject({ code: 'INTERNAL' })
    await vi.advanceTimersByTimeAsync(29_999)
    expect(win.closed).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await check
    expect(win.printToPDF).not.toHaveBeenCalled()
    expect(deps.showSaveDialog).not.toHaveBeenCalled()
    expect(win.closed).toBe(true)
    // Danach ist ein neuer Export möglich.
    expect(exporter.isPrintWindow(win.id)).toBe(false)
  })

  it('eigenes Zeitlimit über deps.timeoutMs', async () => {
    const { exporter } = setup({ timeoutMs: 100 })
    const run = exporter.export(input)
    const check = expect(run).rejects.toBeInstanceOf(PdfExportError)
    await vi.advanceTimersByTimeAsync(100)
    await check
  })

  it('Fenster/Renderer fällt weg → Fehler ohne auf das Zeitlimit zu warten', async () => {
    const { win, exporter } = setup()
    const run = exporter.export(input)
    const check = expect(run).rejects.toMatchObject({ code: 'INTERNAL' })
    await vi.advanceTimersByTimeAsync(0)
    win.gone()
    await check
  })

  it('ready von einem fremden Fenster wird ignoriert', async () => {
    const { win, exporter } = setup()
    const run = exporter.export(input)
    const check = expect(run).rejects.toMatchObject({ code: 'INTERNAL' })
    await vi.advanceTimersByTimeAsync(0)
    expect(exporter.notifyReady(win.id + 1)).toBe(false)
    await vi.advanceTimersByTimeAsync(30_000)
    await check
  })

  it('ohne laufenden Export liefert notifyReady false', () => {
    const { exporter } = setup()
    expect(exporter.notifyReady(7)).toBe(false)
  })

  it('nur ein Export gleichzeitig (CONFLICT)', async () => {
    const { win, exporter } = setup()
    const first = exporter.export(input)
    await expect(exporter.export(input)).rejects.toMatchObject({ code: 'CONFLICT' })
    await vi.advanceTimersByTimeAsync(0)
    exporter.notifyReady(win.id)
    await expect(first).resolves.toEqual({ saved: true })
  })

  it('Ladefehler der Druckseite → INTERNAL, Fenster geschlossen', async () => {
    const win = fakeWindow()
    win.load = vi.fn(async () => {
      throw new Error('ERR_FILE_NOT_FOUND')
    })
    const { exporter } = setup({ createPrintWindow: () => win })
    await expect(exporter.export(input)).rejects.toMatchObject({ code: 'INTERNAL' })
    expect(win.closed).toBe(true)
  })

  it('printToPDF schlägt fehl → INTERNAL', async () => {
    const win = fakeWindow()
    win.printToPDF = vi.fn(async () => {
      throw new Error('print failed')
    })
    const { exporter } = setup({ createPrintWindow: () => win })
    const run = exporter.export(input)
    const check = expect(run).rejects.toMatchObject({ code: 'INTERNAL' })
    await vi.advanceTimersByTimeAsync(0)
    exporter.notifyReady(win.id)
    await check
    expect(win.closed).toBe(true)
  })

  it('Zeitlimit printToPDF (60 s): INTERNAL, Fenster zu, Sperre frei, kein Dialog', async () => {
    const win = fakeWindow()
    win.printToPDF = vi.fn(() => new Promise<Uint8Array>(() => {}))
    const { deps, exporter } = setup({ createPrintWindow: vi.fn(() => win) })
    const run = exporter.export(input)
    const check = expect(run).rejects.toMatchObject({ code: 'INTERNAL' })
    await vi.advanceTimersByTimeAsync(0)
    exporter.notifyReady(win.id)
    await vi.advanceTimersByTimeAsync(59_999)
    expect(win.closed).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await check
    expect(win.closed).toBe(true)
    expect(deps.showSaveDialog).not.toHaveBeenCalled()
    expect(deps.writeFile).not.toHaveBeenCalled()
    // Sperre frei: ein neuer Export startet (kein CONFLICT).
    const win2 = fakeWindow(8)
    ;(deps.createPrintWindow as ReturnType<typeof vi.fn>).mockReturnValue(win2)
    const second = exporter.export(input)
    await vi.advanceTimersByTimeAsync(0)
    expect(exporter.notifyReady(8)).toBe(true)
    await expect(second).resolves.toEqual({ saved: true })
  })

  it('Zeitlimit Speichern-Dialog (10 min): INTERNAL, Sperre frei, späte Antwort schreibt nichts', async () => {
    let answer: (path: string | null) => void = () => {}
    const showSaveDialog = vi.fn(
      () =>
        new Promise<string | null>((resolve) => {
          answer = resolve
        })
    )
    const { win, deps, exporter } = setup({ showSaveDialog })
    const run = exporter.export(input)
    const check = expect(run).rejects.toMatchObject({ code: 'INTERNAL' })
    await vi.advanceTimersByTimeAsync(0)
    exporter.notifyReady(win.id)
    await vi.advanceTimersByTimeAsync(0)
    expect(showSaveDialog).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(10 * 60_000 - 1)
    await vi.advanceTimersByTimeAsync(1)
    await check
    expect(win.closed).toBe(true)
    // Der Nutzer wählt danach doch noch einen Pfad: wird verworfen.
    answer('D:/reports/late.pdf')
    await vi.advanceTimersByTimeAsync(0)
    expect(deps.writeFile).not.toHaveBeenCalled()
    // Sperre frei: der nächste Export läuft durch.
    showSaveDialog.mockImplementation(async () => 'D:/reports/next.pdf')
    const next = fakeWindow(9)
    ;(deps.createPrintWindow as ReturnType<typeof vi.fn>).mockReturnValue(next)
    const second = exporter.export(input)
    await vi.advanceTimersByTimeAsync(0)
    exporter.notifyReady(9)
    await expect(second).resolves.toEqual({ saved: true })
    expect(deps.writeFile).toHaveBeenCalledTimes(1)
    expect(deps.writeFile).toHaveBeenCalledWith('D:/reports/next.pdf', PDF)
  })

  it('eigene Zeitlimits über deps.printTimeoutMs und deps.dialogTimeoutMs', async () => {
    const win = fakeWindow()
    win.printToPDF = vi.fn(() => new Promise<Uint8Array>(() => {}))
    const { exporter } = setup({ createPrintWindow: () => win, printTimeoutMs: 50 })
    const run = exporter.export(input)
    const check = expect(run).rejects.toMatchObject({ code: 'INTERNAL' })
    await vi.advanceTimersByTimeAsync(0)
    exporter.notifyReady(win.id)
    await vi.advanceTimersByTimeAsync(50)
    await check

    const slow = setup({
      showSaveDialog: vi.fn(() => new Promise<string | null>(() => {})),
      dialogTimeoutMs: 70
    })
    const run2 = slow.exporter.export(input)
    const check2 = expect(run2).rejects.toMatchObject({ code: 'INTERNAL' })
    await vi.advanceTimersByTimeAsync(0)
    slow.exporter.notifyReady(slow.win.id)
    await vi.advanceTimersByTimeAsync(70)
    await check2
    expect(slow.deps.writeFile).not.toHaveBeenCalled()
  })

  it('Schreibfehler → IO ohne Pfad in der Meldung', async () => {
    const { win, exporter } = setup({
      writeFile: vi.fn(async () => {
        throw new Error('EACCES: D:/reports/report.pdf')
      })
    })
    const run = exporter.export(input)
    const check = expect(run).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof PdfExportError && e.code === 'IO' && !e.message.includes('reports')
    )
    await vi.advanceTimersByTimeAsync(0)
    exporter.notifyReady(win.id)
    await check
  })
})
