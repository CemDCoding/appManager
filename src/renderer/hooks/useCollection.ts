import { useCallback, useEffect, useSyncExternalStore } from 'react'
import type { EntityCollectionName, EntityMap } from '@shared/collections'
import type { IpcError } from '@shared/ipc'
import { useT } from '@/i18n'
import { ipcErrorDict } from '@/i18n/shared-keys'
import { collectionStore } from '@/state/stores'
import type { ResourceStatus } from '@/state/resource'
import { ipcErrorText } from './errors'

export interface CollectionState<T> {
  /** Geladene Einträge (leer, solange nichts geladen ist). */
  items: T[]
  status: ResourceStatus
  /** true beim ersten Laden und beim Neuladen. */
  loading: boolean
  error: IpcError | null
  /** Übersetzter Fehlertext oder `null`. */
  errorText: string | null
  reload: () => Promise<void>
}

const EMPTY: never[] = []

/**
 * Liste einer Sammlung aus `window.api.entity.list`, app-weit geteilt und nach
 * Änderungen über `useEntityMutation` automatisch neu geladen.
 *
 * @example
 * const { items: projects, loading, errorText, reload } = useCollection('projects')
 */
export function useCollection<C extends EntityCollectionName>(
  name: C
): CollectionState<EntityMap[C]> {
  const store = collectionStore(name)
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const tErr = useT(ipcErrorDict)

  useEffect(() => {
    void store.load()
  }, [store])

  const reload = useCallback(async () => {
    await store.load({ force: true })
  }, [store])

  return {
    items: snapshot.data ?? EMPTY,
    status: snapshot.status,
    loading: snapshot.status === 'loading' || snapshot.status === 'idle',
    error: snapshot.error,
    errorText: ipcErrorText(snapshot.error, tErr),
    reload
  }
}
