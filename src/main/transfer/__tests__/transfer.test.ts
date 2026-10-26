import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import JSZip from 'jszip'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COLLECTIONS, COLLECTION_NAMES, SCHEMA_VERSION } from '@shared/collections'
import { IPC_CHANNELS, type IpcResult } from '@shared/ipc'
import { nodeAtomicFs, type AtomicFs } from '../../storage/atomic'
import { BACKUPS_DIR } from '../../storage/backups'
import { StorageError } from '../../storage/errors'
import { serializeCollection } from '../../storage/repository'
import { DataStore } from '../../storage/store'
import {
  fixedNow,
  makeTempDir,
  personInput,
  projectInput,
  removeDir,
  testId
} from '../../storage/__tests__/fixtures'
import {
  MANIFEST_FILE,
  applyImport,
  buildManifest,
  createExportArchive,
  declaredEntryCount,
  readCollections,
  readImportArchive
} from '../archive'
import { registerTransferHandlers } from '../ipc'
import { TransferService, exportFileName, type TransferDeps } from '../service'

/** Invented test data only (R2). */

let dirs: string[] = []
async function tempDir(): Promise<string> {
  const d = await makeTempDir()
  dirs.push(d)
  return d
}
beforeEach(() => {
  dirs = []
})
afterEach(async () => {
  for (const d of dirs) await removeDir(d)
})

async function openStore(dir: string): Promise<DataStore> {
  const store = new DataStore(dir, { now: fixedNow(), newId: testId })
  await store.loadAll()
  return store
}

/** Folder with some invented data in several collections. */
async function filledStore(): Promise<DataStore> {
  const store = await openStore(await tempDir())
  const project = await store.create('projects', projectInput('Demo App'))
  await store.create('projects', projectInput('Second App'))
  await store.create('persons', personInput())
  await store.getSettings()
  expect(project.id).toBeTruthy()
  return store
}

/** Every file in the folder (recursively) with its content: detects any change. */
async function snapshot(dir: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  async function walk(sub: string): Promise<void> {
    for (const e of await readdir(join(dir, sub), { withFileTypes: true })) {
      const rel = sub ? `${sub}/${e.name}` : e.name
      if (e.isDirectory()) await walk(rel)
      else out[rel] = await readFile(join(dir, rel), 'utf8')
    }
  }
  await walk('')
  return out
}

async function validArchive(store: DataStore): Promise<Buffer> {
  return createExportArchive(
    await readCollections(store.dir),
    buildManifest('1.2.3', new Date('2026-03-01T10:00:00.000Z'))
  )
}

/** Builds a ZIP from raw entries (names are used exactly as given). */
async function rawZip(entries: Record<string, string>): Promise<Buffer> {
  const zip = new JSZip()
  for (const [name, text] of Object.entries(entries)) {
    zip.file(name, text, { createFolders: false })
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

/** Valid entries (manifest + all empty collections) as a starting point for manipulation. */
function validEntries(): Record<string, string> {
  const entries: Record<string, string> = {
    [MANIFEST_FILE]: JSON.stringify(buildManifest('1.0.0', new Date('2026-03-01T10:00:00Z')))
  }
  for (const n of COLLECTION_NAMES) entries[COLLECTIONS[n].file] = serializeCollection([])
  return entries
}

async function expectRejected(data: Uint8Array, max?: number): Promise<void> {
  await expect(readImportArchive(data, max)).rejects.toMatchObject({
    name: 'StorageError',
    code: 'INVALID_DATA'
  })
}

function serviceFor(
  store: () => DataStore,
  zipPath: string | null,
  extra: Partial<TransferDeps> = {}
): { service: TransferService; written: Map<string, Uint8Array> } {
  const written = new Map<string, Uint8Array>()
  const service = new TransferService({
    store,
    appVersion: '1.2.3',
    now: fixedNow('2026-03-02T10:00:00.000Z'),
    showSaveDialog: async () => 'C:/invented/export.zip',
    showOpenDialog: async () => zipPath,
    fileSize: async (p) => (await readFile(p)).length,
    readFile: (p) => readFile(p),
    writeFile: async (p, d) => {
      written.set(p, d)
    },
    ...extra
  })
  return { service, written }
}

describe('export', () => {
  it('writes every collection file and a manifest', async () => {
    const store = await filledStore()
    const zip = await JSZip.loadAsync(await validArchive(store))
    expect(Object.keys(zip.files).sort()).toEqual(
      [MANIFEST_FILE, ...COLLECTION_NAMES.map((n) => COLLECTIONS[n].file)].sort()
    )
    const manifest = JSON.parse(await zip.file(MANIFEST_FILE)!.async('string'))
    expect(manifest).toEqual({
      format: 'appManager-export',
      appVersion: '1.2.3',
      schemaVersion: SCHEMA_VERSION,
      createdAt: '2026-03-01T10:00:00.000Z'
    })
  })

  it('refuses to export a broken collection file', async () => {
    const dir = await tempDir()
    await writeFile(join(dir, 'projects.json'), '{ broken')
    await expect(readCollections(dir)).rejects.toMatchObject({ code: 'INVALID_DATA' })
  })

  it('saves through the dialog and reports cancel', async () => {
    const store = await filledStore()
    const { service, written } = serviceFor(() => store, null)
    expect(await service.exportZip()).toEqual({ saved: true })
    expect(written.has('C:/invented/export.zip')).toBe(true)
    const cancelled = serviceFor(() => store, null, { showSaveDialog: async () => null })
    expect(await cancelled.service.exportZip()).toEqual({ saved: false })
    expect(cancelled.written.size).toBe(0)
  })

  it('names the file with the local date', () => {
    expect(exportFileName(new Date(2026, 0, 5, 12))).toBe('appManager-export-2026-01-05.zip')
  })
})

describe('export -> import round trip', () => {
  it('imports into an empty folder with identical data', async () => {
    const source = await filledStore()
    const zipDir = await tempDir()
    const zipPath = join(zipDir, 'export.zip')
    await writeFile(zipPath, await validArchive(source))

    const target = await openStore(await tempDir())
    const { service } = serviceFor(() => target, zipPath)
    expect(await service.importZip()).toEqual({ imported: true })

    for (const n of COLLECTION_NAMES) {
      const file = COLLECTIONS[n].file
      const expected = await readFile(join(source.dir, file), 'utf8').catch(() =>
        serializeCollection([])
      )
      expect(await readFile(join(target.dir, file), 'utf8')).toBe(expected)
    }
    // The store was reloaded and sees the imported data.
    expect((await target.list('projects')).map((p) => p.name).sort()).toEqual([
      'Demo App',
      'Second App'
    ])
    expect(await target.list('persons')).toEqual(await source.list('persons'))
    // Empty folder: nothing to back up.
    await expect(readdir(join(target.dir, BACKUPS_DIR))).rejects.toThrow()
  })

  it('backs up the current state before replacing it', async () => {
    const source = await filledStore()
    const zipPath = join(await tempDir(), 'export.zip')
    await writeFile(zipPath, await validArchive(source))

    const target = await openStore(await tempDir())
    await target.create('projects', projectInput('Old App'))
    const before = await readFile(join(target.dir, 'projects.json'), 'utf8')
    await serviceFor(() => target, zipPath).service.importZip()

    const backups = await readdir(join(target.dir, BACKUPS_DIR))
    expect(backups).toHaveLength(1)
    expect(
      await readFile(join(target.dir, BACKUPS_DIR, backups[0]!, 'projects.json'), 'utf8')
    ).toBe(before)
    expect((await target.list('projects')).map((p) => p.name)).not.toContain('Old App')
  })

  it('does nothing when the open dialog is cancelled', async () => {
    const target = await filledStore()
    const before = await snapshot(target.dir)
    expect(await serviceFor(() => target, null).service.importZip()).toEqual({ imported: false })
    expect(await snapshot(target.dir)).toEqual(before)
  })
})

describe('import rejects manipulated archives and changes nothing', () => {
  const cases: [string, () => Promise<Buffer>][] = [
    [
      'path traversal ../',
      async () => {
        const e = validEntries()
        e['../projects.json'] = e['projects.json']!
        delete e['projects.json']
        return rawZip(e)
      }
    ],
    [
      'absolute/sub folder path',
      async () => {
        const e = validEntries()
        e['sub/projects.json'] = e['projects.json']!
        delete e['projects.json']
        return rawZip(e)
      }
    ],
    [
      'backslash path',
      async () => {
        const e = validEntries()
        e['..\\projects.json'] = e['projects.json']!
        delete e['projects.json']
        return rawZip(e)
      }
    ],
    [
      'duplicate name via normalisation',
      async () => rawZip({ ...validEntries(), 'x/../projects.json': serializeCollection([]) })
    ],
    ['additional file', async () => rawZip({ ...validEntries(), 'evil.exe': 'MZ' })],
    [
      'missing file',
      async () => {
        const e = validEntries()
        delete e['goals.json']
        return rawZip({ ...e, 'other.json': '{}' })
      }
    ],
    [
      'folder entry',
      async () => {
        const zip = new JSZip()
        for (const [n, t] of Object.entries(validEntries())) zip.file(n, t)
        zip.folder('backups')
        return zip.generateAsync({ type: 'nodebuffer' })
      }
    ],
    [
      'invalid JSON',
      async () => rawZip({ ...validEntries(), 'projects.json': '{ "schemaVersion": 1, ' })
    ],
    [
      'schema violation',
      async () =>
        rawZip({
          ...validEntries(),
          'projects.json': JSON.stringify({ schemaVersion: 1, items: [{ name: 'x' }] })
        })
    ],
    [
      'wrong schema version in a file',
      async () =>
        rawZip({
          ...validEntries(),
          'projects.json': JSON.stringify({ schemaVersion: 99, items: [] })
        })
    ],
    [
      'wrong schema version in manifest',
      async () =>
        rawZip({
          ...validEntries(),
          [MANIFEST_FILE]: JSON.stringify({
            ...buildManifest('1.0.0', new Date('2026-03-01T10:00:00Z')),
            schemaVersion: 99
          })
        })
    ],
    [
      'invalid manifest',
      async () => rawZip({ ...validEntries(), [MANIFEST_FILE]: JSON.stringify({ hello: 1 }) })
    ],
    [
      'two settings items',
      async () => {
        const store = await openStore(await tempDir())
        const s = await store.getSettings()
        return rawZip({
          ...validEntries(),
          'settings.json': serializeCollection([s, { ...s, id: testId() }])
        })
      }
    ],
    ['not a zip', async () => Buffer.from('this is not a zip file at all, just invented text')]
  ]

  for (const [label, build] of cases) {
    it(label, async () => {
      const data = await build()
      await expectRejected(data)

      const target = await filledStore()
      const zipPath = join(await tempDir(), 'import.zip')
      await writeFile(zipPath, data)
      const before = await snapshot(target.dir)
      await expect(serviceFor(() => target, zipPath).service.importZip()).rejects.toBeInstanceOf(
        StorageError
      )
      expect(await snapshot(target.dir)).toEqual(before)
    })
  }

  it('file larger than the limit (checked before reading)', async () => {
    const target = await filledStore()
    const before = await snapshot(target.dir)
    const readSpy = vi.fn()
    const { service } = serviceFor(() => target, 'C:/invented/big.zip', {
      fileSize: async () => 50 * 1024 * 1024 + 1,
      readFile: readSpy
    })
    await expect(service.importZip()).rejects.toMatchObject({ code: 'INVALID_DATA' })
    expect(readSpy).not.toHaveBeenCalled()
    expect(await snapshot(target.dir)).toEqual(before)
  })

  it('archive bytes larger than the limit', async () => {
    await expectRejected(await rawZip(validEntries()), 100)
  })

  it('unpacked content larger than the limit (zip bomb)', async () => {
    const huge = JSON.stringify({ schemaVersion: 1, items: [] }) + ' '.repeat(200_000)
    const data = await rawZip({ ...validEntries(), 'projects.json': huge })
    expect(data.length).toBeLessThan(20_000)
    await expectRejected(data, 50_000)

    const target = await filledStore()
    const zipPath = join(await tempDir(), 'bomb.zip')
    await writeFile(zipPath, data)
    const before = await snapshot(target.dir)
    const { service } = serviceFor(() => target, zipPath, { maxImportBytes: 50_000 })
    await expect(service.importZip()).rejects.toMatchObject({ code: 'INVALID_DATA' })
    expect(await snapshot(target.dir)).toEqual(before)
  })

  it('accepts the unmodified valid entries (control)', async () => {
    const contents = await readImportArchive(await rawZip(validEntries()))
    expect([...contents.keys()].sort()).toEqual([...COLLECTION_NAMES].sort())
  })
})

describe('declaredEntryCount', () => {
  it('reads the entry count of the end record', async () => {
    expect(declaredEntryCount(await rawZip({ 'a.json': '{}', 'b.json': '{}' }))).toBe(2)
    expect(declaredEntryCount(new Uint8Array(10))).toBeNull()
  })
})

describe('applyImport rollback', () => {
  it('restores already replaced files if a rename fails', async () => {
    const store = await filledStore()
    const before = await snapshot(store.dir)
    const contents = await readImportArchive(await rawZip(validEntries()))
    let renames = 0
    const failing: AtomicFs = {
      ...nodeAtomicFs,
      rename: async (from, to) => {
        renames += 1
        if (renames === 3) throw Object.assign(new Error('disk full'), { code: 'ENOSPC' })
        return nodeAtomicFs.rename(from, to)
      }
    }
    await expect(
      applyImport(store.dir, contents, new Date('2026-03-02T10:00:00Z'), { fs: failing })
    ).rejects.toMatchObject({ code: 'IO' })

    const after = await snapshot(store.dir)
    const dataFiles = (s: Record<string, string>) =>
      Object.fromEntries(Object.entries(s).filter(([k]) => !k.startsWith(`${BACKUPS_DIR}/`)))
    expect(dataFiles(after)).toEqual(dataFiles(before))
    // No temp files left behind.
    expect(Object.keys(after).some((k) => k.endsWith('.tmp'))).toBe(false)
  })

  it('removes files that did not exist before when rolling back', async () => {
    const dir = await tempDir()
    await mkdir(dir, { recursive: true })
    const contents = await readImportArchive(await rawZip(validEntries()))
    let renames = 0
    const failing: AtomicFs = {
      ...nodeAtomicFs,
      rename: async (from, to) => {
        renames += 1
        if (renames === 2) throw Object.assign(new Error('nope'), { code: 'EIO' })
        return nodeAtomicFs.rename(from, to)
      }
    }
    await expect(
      applyImport(dir, contents, new Date('2026-03-02T10:00:00Z'), { fs: failing })
    ).rejects.toMatchObject({ code: 'IO' })
    expect(await readdir(dir)).toEqual([])
  })
})

describe('registerTransferHandlers', () => {
  type Listener = (
    event: { senderFrame?: { url: string } | null },
    ...a: unknown[]
  ) => Promise<unknown>
  function setup(trusted = true) {
    const handlers = new Map<string, Listener>()
    const service = {
      exportZip: vi.fn(async () => ({ saved: true })),
      importZip: vi.fn(async () => {
        throw new StorageError('INVALID_DATA', 'import: unexpected entry name')
      })
    }
    registerTransferHandlers(
      { handle: (ch, l) => handlers.set(ch, l as Listener) },
      { service, isTrustedSender: () => trusted }
    )
    const call = (ch: string, payload?: unknown) =>
      handlers.get(ch)!({ senderFrame: { url: 'file:///app/index.html' } }, payload) as Promise<
        IpcResult<unknown>
      >
    return { handlers, service, call }
  }

  it('registers both channels and maps results', async () => {
    const { handlers, call } = setup()
    expect([...handlers.keys()].sort()).toEqual(
      [IPC_CHANNELS.exportZip, IPC_CHANNELS.importZip].sort()
    )
    expect(await call(IPC_CHANNELS.exportZip)).toEqual({ ok: true, data: { saved: true } })
    expect(await call(IPC_CHANNELS.importZip)).toMatchObject({
      ok: false,
      error: { code: 'INVALID_DATA' }
    })
  })

  it('rejects untrusted senders and any payload (no paths from the renderer)', async () => {
    const untrusted = setup(false)
    expect(await untrusted.call(IPC_CHANNELS.importZip)).toMatchObject({
      error: { code: 'FORBIDDEN' }
    })
    expect(untrusted.service.importZip).not.toHaveBeenCalled()
    const { call, service } = setup()
    expect(await call(IPC_CHANNELS.importZip, { path: 'C:/x.zip' })).toMatchObject({
      error: { code: 'VALIDATION' }
    })
    expect(service.importZip).not.toHaveBeenCalled()
  })
})
