import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IPC_CHANNELS, type IpcResult } from '@shared/ipc'
import { DataService } from '../../storage/service'
import {
  makeTempDir,
  personInput,
  projectInput,
  removeDir,
  selected,
  expenseInput,
  testId
} from '../../storage/__tests__/fixtures'
import {
  HANDLED_CHANNELS,
  isTrustedSenderUrl,
  registerIpcHandlers,
  type IpcDeps,
  type InvokeEventLike,
  type IpcMainLike
} from '../handlers'

type Listener = (event: InvokeEventLike, ...args: unknown[]) => Promise<unknown>

const trusted: InvokeEventLike = { senderFrame: { url: 'file:///app/index.html' } }

let dir: string
let handlers: Map<string, Listener>
let service: DataService
let deps: IpcDeps

async function call<T = unknown>(
  channel: string,
  payload?: unknown,
  event: InvokeEventLike = trusted
): Promise<IpcResult<T>> {
  const fn = handlers.get(channel)
  if (!fn) throw new Error(`no handler for ${channel}`)
  return (await fn(event, payload)) as IpcResult<T>
}

beforeEach(async () => {
  dir = await makeTempDir()
  service = new DataService({ now: () => new Date(2026, 2, 1, 10), newId: testId })
  await service.open(dir)
  handlers = new Map()
  const ipc: IpcMainLike = {
    handle: vi.fn((channel: string, listener: Listener) => {
      handlers.set(channel, listener)
    })
  }
  deps = {
    store: () => service.store,
    dataDir: () => service.dir,
    chooseDataDir: vi.fn(async () => null),
    listBackups: () => service.listBackups(),
    restoreBackup: (name) => service.restoreBackup(name),
    openExternal: vi.fn(async () => {}),
    isTrustedSender: (e) => isTrustedSenderUrl(e.senderFrame?.url),
    log: vi.fn()
  }
  registerIpcHandlers(ipc, deps)
})
afterEach(async () => {
  await removeDir(dir)
})

describe('registerIpcHandlers', () => {
  it('registers every AP-07 channel and none of export/import/pdf', () => {
    expect([...handlers.keys()].sort()).toEqual([...HANDLED_CHANNELS].sort())
    for (const ch of [IPC_CHANNELS.exportZip, IPC_CHANNELS.importZip, IPC_CHANNELS.pdfExport]) {
      expect(handlers.has(ch)).toBe(false)
    }
  })

  it('runs CRUD through the channels', async () => {
    const created = await call<{ id: string }>(IPC_CHANNELS.entityCreate, {
      collection: 'persons',
      data: personInput()
    })
    expect(created.ok).toBe(true)
    const id = created.ok ? created.data.id : ''
    expect(await call(IPC_CHANNELS.entityList, { collection: 'persons' })).toMatchObject({
      ok: true,
      data: [{ id }]
    })
    expect(await call(IPC_CHANNELS.entityGet, { collection: 'persons', id })).toMatchObject({
      ok: true
    })
    expect(
      await call(IPC_CHANNELS.entityUpdate, {
        collection: 'persons',
        id,
        data: { ...personInput(), role: 'Lead' }
      })
    ).toMatchObject({ ok: true, data: { role: 'Lead' } })
    expect(await call(IPC_CHANNELS.entityDelete, { collection: 'persons', id })).toEqual({
      ok: true,
      data: {}
    })
  })

  it.each([
    [IPC_CHANNELS.entityList, { collection: 'settings' }],
    [IPC_CHANNELS.entityList, { collection: '../x' }],
    [IPC_CHANNELS.entityGet, { collection: 'persons', id: 'not-a-uuid' }],
    [IPC_CHANNELS.entityCreate, { collection: 'persons', data: 'x' }],
    [IPC_CHANNELS.entityDelete, { collection: 'persons', id: testId(), cascade: 'yes' }],
    [IPC_CHANNELS.settingsGet, { path: 'C:/x' }],
    [IPC_CHANNELS.settingsSet, { displayCurrency: 'eur' }],
    [IPC_CHANNELS.dataDirChoose, { path: 'C:/evil' }],
    [IPC_CHANNELS.backupRestore, { name: '../../etc' }],
    [IPC_CHANNELS.shellOpenExternal, { url: 'javascript:alert(1)' }]
  ])('rejects invalid payload on %s', async (channel, payload) => {
    expect(await call(channel, payload)).toMatchObject({ ok: false, error: { code: 'VALIDATION' } })
  })

  it('maps storage errors to IpcResult (VALIDATION, NOT_FOUND, IN_USE)', async () => {
    expect(
      await call(IPC_CHANNELS.entityCreate, { collection: 'persons', data: { name: '' } })
    ).toMatchObject({ ok: false, error: { code: 'VALIDATION' } })
    expect(
      await call(IPC_CHANNELS.entityGet, { collection: 'persons', id: testId() })
    ).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } })
    const project = await service.store.create('projects', projectInput())
    await service.store.create('expenses', expenseInput({ allocation: selected(project.id) }))
    const res = await call(IPC_CHANNELS.entityDelete, { collection: 'projects', id: project.id })
    expect(res).toMatchObject({ ok: false, error: { code: 'IN_USE' } })
    expect(deps.log).toHaveBeenCalledWith(IPC_CHANNELS.entityDelete, 'IN_USE')
  })

  it('rejects calls from untrusted frames', async () => {
    const res = await call(
      IPC_CHANNELS.entityList,
      { collection: 'persons' },
      {
        senderFrame: { url: 'https://evil.example' }
      }
    )
    expect(res).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } })
    expect(await call(IPC_CHANNELS.settingsGet, undefined, {})).toMatchObject({ ok: false })
  })

  it('handles settings, data dir and backups', async () => {
    const settings = await call<{ displayCurrency: string }>(IPC_CHANNELS.settingsGet)
    expect(settings).toMatchObject({ ok: true, data: { displayCurrency: 'EUR' } })
    expect(await call(IPC_CHANNELS.dataDirGet)).toEqual({ ok: true, data: { path: dir } })
    expect(await call(IPC_CHANNELS.dataDirChoose)).toEqual({ ok: true, data: { path: null } })
    expect(await call(IPC_CHANNELS.backupList)).toEqual({ ok: true, data: [] })
    expect(await call(IPC_CHANNELS.backupRestore, { name: '2026-01-01_00-00-00' })).toMatchObject({
      ok: false,
      error: { code: 'NOT_FOUND' }
    })
  })

  it('opens only safe external URLs', async () => {
    expect(await call(IPC_CHANNELS.shellOpenExternal, { url: 'https://example.com/a' })).toEqual({
      ok: true,
      data: {}
    })
    expect(deps.openExternal).toHaveBeenCalledWith('https://example.com/a')
    const res = await call(IPC_CHANNELS.shellOpenExternal, { url: 'https://user:pw@example.com' })
    expect(res).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } })
    expect(deps.openExternal).toHaveBeenCalledTimes(1)
  })

  it('hides unexpected errors behind INTERNAL', async () => {
    deps.listBackups = async () => {
      throw new Error('C:/secret/path Person A')
    }
    const res = await call(IPC_CHANNELS.backupList)
    expect(res).toEqual({ ok: false, error: { code: 'INTERNAL', message: 'Internal error' } })
    expect(JSON.stringify(vi.mocked(deps.log!).mock.calls)).not.toContain('secret')
  })
})

describe('isTrustedSenderUrl', () => {
  it('accepts the packaged UI and the local dev server only', () => {
    expect(isTrustedSenderUrl('file:///D:/app/out/renderer/index.html')).toBe(true)
    expect(isTrustedSenderUrl('https://example.com')).toBe(false)
    expect(isTrustedSenderUrl(undefined)).toBe(false)
    expect(isTrustedSenderUrl('http://localhost:5173/#/x', 'http://localhost:5173')).toBe(true)
    expect(isTrustedSenderUrl('file:///x', 'http://localhost:5173')).toBe(false)
    expect(isTrustedSenderUrl('http://localhost:9999', 'http://localhost:5173')).toBe(false)
  })
})
