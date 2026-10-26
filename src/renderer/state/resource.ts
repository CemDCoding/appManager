import type { IpcError, IpcResult } from '@shared/ipc'

export type ResourceStatus = 'idle' | 'loading' | 'ready' | 'error'

/** Unveränderlicher Zustand einer geladenen Ressource (Liste, Einstellungen …). */
export interface ResourceSnapshot<T> {
  status: ResourceStatus
  /** Zuletzt erfolgreich geladene Daten; bleiben bei einem Fehler erhalten. */
  data: T | undefined
  error: IpcError | null
}

/**
 * Kleiner Speicher für eine Ressource, die über `window.api` geladen wird.
 * Mehrere Komponenten teilen sich denselben Stand; nach Änderungen ruft man
 * `invalidate()` und alle Abonnenten laden neu. Ohne React testbar.
 *
 * @example
 * const store = createResourceStore(() => window.api.settings.get())
 * store.subscribe(() => console.log(store.getSnapshot()))
 * await store.load()
 */
export interface ResourceStore<T> {
  getSnapshot(): ResourceSnapshot<T>
  subscribe(listener: () => void): () => void
  /** Lädt, falls noch nicht geladen (oder `force`). Gleichzeitige Aufrufe teilen eine Anfrage. */
  load(options?: { force?: boolean }): Promise<ResourceSnapshot<T>>
  /** Setzt die Daten direkt (z. B. Antwort von `settings.set`). */
  setData(data: T): void
  /** Markiert als veraltet und lädt neu, wenn jemand zuhört. */
  invalidate(): Promise<void>
}

/** Fehler, falls der Lader selbst wirft (z. B. `window.api` fehlt im Test). */
const LOADER_FAILED: IpcError = { code: 'INTERNAL', message: 'Loader failed' }

export function createResourceStore<T>(loader: () => Promise<IpcResult<T>>): ResourceStore<T> {
  let snapshot: ResourceSnapshot<T> = { status: 'idle', data: undefined, error: null }
  let inFlight: Promise<ResourceSnapshot<T>> | null = null
  // Zählt Ladevorgänge, damit eine ältere Antwort keine neuere überschreibt.
  let generation = 0
  const listeners = new Set<() => void>()

  const emit = (next: ResourceSnapshot<T>): void => {
    snapshot = next
    for (const listener of [...listeners]) listener()
  }

  const run = (): Promise<ResourceSnapshot<T>> => {
    const id = ++generation
    emit({ ...snapshot, status: 'loading' })
    const promise = (async () => {
      let result: IpcResult<T>
      try {
        result = await loader()
      } catch {
        result = { ok: false, error: LOADER_FAILED }
      }
      if (id === generation) {
        emit(
          result.ok
            ? { status: 'ready', data: result.data, error: null }
            : { status: 'error', data: snapshot.data, error: result.error }
        )
        inFlight = null
      }
      return snapshot
    })()
    inFlight = promise
    return promise
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    load(options) {
      if (inFlight && !options?.force) return inFlight
      if (!options?.force && snapshot.status !== 'idle') return Promise.resolve(snapshot)
      return run()
    },
    setData(data) {
      generation++
      inFlight = null
      emit({ status: 'ready', data, error: null })
    },
    async invalidate() {
      if (listeners.size === 0) {
        generation++
        inFlight = null
        snapshot = { status: 'idle', data: snapshot.data, error: null }
        return
      }
      await run()
    }
  }
}
