import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { IpcError, IpcResult, SettingsInput } from '@shared/ipc'
import type { Settings } from '@shared/schemas/settings'
import { useT } from '@/i18n'
import { ipcErrorDict } from '@/i18n/shared-keys'
import type { ResourceStatus } from '@/state/resource'
import { settingsStore } from '@/state/stores'
import { ipcErrorText } from './errors'

/** Nur die änderbaren Felder der Einstellungen (ohne id, ownerId, Zeitstempel). */
export function toSettingsInput(settings: Settings): SettingsInput {
  return {
    displayCurrency: settings.displayCurrency,
    expenseCategories: settings.expenseCategories,
    incomeCategories: settings.incomeCategories,
    projectPlatforms: settings.projectPlatforms,
    campaignPlatforms: settings.campaignPlatforms,
    campaignFormats: settings.campaignFormats
  }
}

export interface SettingsState {
  settings: Settings | undefined
  status: ResourceStatus
  loading: boolean
  /** Fehler beim Laden. */
  error: IpcError | null
  errorText: string | null
  /** Fehlertext der letzten Speicherung (oder `null`). */
  saveErrorText: string | null
  saving: boolean
  /**
   * Speichert einzelne Felder; die übrigen kommen aus dem aktuellen Stand.
   * Ohne geladene Einstellungen → `{ ok: false, error: { code: 'NOT_FOUND' } }`.
   */
  save: (patch: Partial<SettingsInput>) => Promise<IpcResult<Settings>>
  reload: () => Promise<void>
}

/**
 * Einstellungen (Anzeigewährung, Listen), app-weit geteilt.
 *
 * @example
 * const { settings, save } = useSettings()
 * await save({ displayCurrency: 'USD' })
 */
export function useSettings(): SettingsState {
  const store = settingsStore()
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const tErr = useT(ipcErrorDict)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<IpcError | null>(null)

  useEffect(() => {
    void store.load()
  }, [store])

  const save = useCallback(
    async (patch: Partial<SettingsInput>): Promise<IpcResult<Settings>> => {
      const current = store.getSnapshot().data
      if (!current) {
        const error: IpcError = { code: 'NOT_FOUND', message: 'Settings not loaded' }
        setSaveError(error)
        return { ok: false, error }
      }
      setSaving(true)
      setSaveError(null)
      let result: IpcResult<Settings>
      try {
        result = await window.api.settings.set({ ...toSettingsInput(current), ...patch })
      } catch {
        result = { ok: false, error: { code: 'INTERNAL', message: 'IPC call failed' } }
      }
      if (result.ok) store.setData(result.data)
      else setSaveError(result.error)
      setSaving(false)
      return result
    },
    [store]
  )

  const reload = useCallback(async () => {
    await store.load({ force: true })
  }, [store])

  return {
    settings: snapshot.data,
    status: snapshot.status,
    loading: snapshot.status === 'loading' || snapshot.status === 'idle',
    error: snapshot.error,
    errorText: ipcErrorText(snapshot.error, tErr),
    saveErrorText: ipcErrorText(saveError, tErr),
    saving,
    save,
    reload
  }
}
