import { describe, expect, it, vi } from 'vitest'
import type { IpcResult } from '@shared/ipc'
import { createResourceStore } from './resource'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

describe('createResourceStore', () => {
  it('loads once and shares concurrent requests', async () => {
    const loader = vi.fn(async (): Promise<IpcResult<number[]>> => ({ ok: true, data: [1, 2] }))
    const store = createResourceStore(loader)
    expect(store.getSnapshot().status).toBe('idle')
    await Promise.all([store.load(), store.load()])
    await store.load()
    expect(loader).toHaveBeenCalledTimes(1)
    expect(store.getSnapshot()).toEqual({ status: 'ready', data: [1, 2], error: null })
  })

  it('keeps old data on error and reports the IPC error', async () => {
    let call = 0
    const store = createResourceStore(async (): Promise<IpcResult<string>> =>
      ++call === 1 ? { ok: true, data: 'a' } : { ok: false, error: { code: 'IO', message: 'x' } }
    )
    await store.load()
    await store.load({ force: true })
    expect(store.getSnapshot()).toEqual({
      status: 'error',
      data: 'a',
      error: { code: 'IO', message: 'x' }
    })
  })

  it('turns a throwing loader into an INTERNAL error', async () => {
    const store = createResourceStore<string>(async () => {
      throw new Error('boom')
    })
    await store.load()
    expect(store.getSnapshot().error?.code).toBe('INTERNAL')
  })

  it('ignores an older response that arrives after a newer one', async () => {
    const first = deferred<IpcResult<string>>()
    const second = deferred<IpcResult<string>>()
    const queue = [first.promise, second.promise]
    const store = createResourceStore(() => queue.shift()!)
    const p1 = store.load()
    const p2 = store.load({ force: true })
    second.resolve({ ok: true, data: 'new' })
    await p2
    first.resolve({ ok: true, data: 'old' })
    await p1
    expect(store.getSnapshot().data).toBe('new')
  })

  it('notifies listeners and reloads on invalidate only when observed', async () => {
    const loader = vi.fn(async (): Promise<IpcResult<number>> => ({ ok: true, data: 1 }))
    const store = createResourceStore(loader)
    await store.load()
    await store.invalidate()
    expect(loader).toHaveBeenCalledTimes(1)
    expect(store.getSnapshot().status).toBe('idle')

    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    await store.invalidate()
    expect(loader).toHaveBeenCalledTimes(2)
    expect(listener).toHaveBeenCalled()
    unsubscribe()
  })

  it('setData replaces the snapshot', () => {
    const store = createResourceStore<number>(async () => ({ ok: true, data: 0 }))
    store.setData(5)
    expect(store.getSnapshot()).toEqual({ status: 'ready', data: 5, error: null })
  })
})
