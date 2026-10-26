import { useCallback, useMemo, useState } from 'react'
import type { EntityCollectionName, EntityMap } from '@shared/collections'
import type { Empty, EntityInput, IpcError, IpcResult } from '@shared/ipc'
import { useT } from '@/i18n'
import { ipcErrorDict } from '@/i18n/shared-keys'
import { invalidateCollections } from '@/state/stores'
import { ipcErrorText, type ErrorMessages } from './errors'

export interface EntityMutationOptions {
  /** Weitere Sammlungen, die nach Erfolg neu geladen werden (z. B. `expenses` nach Dienst-Löschen). */
  invalidates?: readonly EntityCollectionName[]
  /** Eigene Texte je Fehlercode, z. B. für `IN_USE`. */
  messages?: ErrorMessages
}

export interface EntityMutation<C extends EntityCollectionName> {
  create: (data: EntityInput<C>) => Promise<IpcResult<EntityMap[C]>>
  update: (id: string, data: EntityInput<C>) => Promise<IpcResult<EntityMap[C]>>
  remove: (id: string, options?: { cascade?: boolean }) => Promise<IpcResult<Empty>>
  /** Läuft gerade eine Anfrage? */
  pending: boolean
  /** Fehler der letzten Anfrage (wird bei der nächsten zurückgesetzt). */
  error: IpcError | null
  /** Übersetzter Fehlertext, z. B. für `IN_USE` „wird noch verwendet“. */
  errorText: string | null
  reset: () => void
}

const CALL_FAILED: IpcError = { code: 'INTERNAL', message: 'IPC call failed' }

/**
 * Anlegen, Ändern und Löschen über `window.api.entity.*`. Nach Erfolg wird die
 * Sammlung (und `invalidates`) neu geladen. Gibt immer das `IpcResult` zurück, damit
 * die Seite z. B. den Dialog nur bei Erfolg schließt.
 *
 * @example
 * const { create, remove, pending, errorText } = useEntityMutation('projects', {
 *   messages: { IN_USE: tp('projectInUse') }
 * })
 * const res = await remove(project.id)
 * if (res.ok) closeDialog()
 */
export function useEntityMutation<C extends EntityCollectionName>(
  collection: C,
  options: EntityMutationOptions = {}
): EntityMutation<C> {
  const tErr = useT(ipcErrorDict)
  const [pendingCount, setPendingCount] = useState(0)
  const [error, setError] = useState<IpcError | null>(null)
  const { invalidates, messages } = options
  // Option-Arrays sind oft inline; ein stabiler Schlüssel vermeidet neue Callbacks je Render.
  const invalidatesKey = (invalidates ?? []).join(',')

  const run = useCallback(
    async <T>(call: () => Promise<IpcResult<T>>): Promise<IpcResult<T>> => {
      setPendingCount((n) => n + 1)
      setError(null)
      let result: IpcResult<T>
      try {
        result = await call()
      } catch {
        result = { ok: false, error: CALL_FAILED }
      }
      if (result.ok) {
        const extra = invalidatesKey ? (invalidatesKey.split(',') as EntityCollectionName[]) : []
        await invalidateCollections([collection, ...extra])
      } else {
        setError(result.error)
      }
      setPendingCount((n) => n - 1)
      return result
    },
    [collection, invalidatesKey]
  )

  const create = useCallback(
    (data: EntityInput<C>) => run(() => window.api.entity.create(collection, data)),
    [run, collection]
  )
  const update = useCallback(
    (id: string, data: EntityInput<C>) => run(() => window.api.entity.update(collection, id, data)),
    [run, collection]
  )
  const remove = useCallback(
    (id: string, removeOptions?: { cascade?: boolean }) =>
      run(() => window.api.entity.delete(collection, id, removeOptions)),
    [run, collection]
  )
  const reset = useCallback(() => setError(null), [])

  return useMemo(
    () => ({
      create,
      update,
      remove,
      pending: pendingCount > 0,
      error,
      errorText: ipcErrorText(error, tErr, messages),
      reset
    }),
    [create, update, remove, pendingCount, error, tErr, messages, reset]
  )
}
