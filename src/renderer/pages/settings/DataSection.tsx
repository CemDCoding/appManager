import { useCallback, useEffect, useState } from 'react'
import { ENTITY_COLLECTION_NAMES } from '@shared/collections'
import type { BackupInfo, IpcError } from '@shared/ipc'
import { Button } from '@/components/ui/button'
import { ConfirmDialog, FieldMessage } from '@/components/forms'
import { onDataReplaced } from '@/features/transfer/transfer-logic'
import { ipcErrorText } from '@/hooks'
import { useFormat, useT } from '@/i18n'
import { ipcErrorDict } from '@/i18n/shared-keys'
import { invalidateCollections, settingsStore } from '@/state/stores'
import { settingsDict } from './i18n'
import { dataErrorAfterLoad, showDirSwitchAborted, type DataErrorState } from './settings-logic'

const INTERNAL_ERROR: IpcError = { code: 'INTERNAL', message: '' }
const NO_ERROR: DataErrorState = { error: null, fromSwitch: false }

interface DataSnapshot {
  dir: { ok: true; path: string | null } | { ok: false; error: IpcError }
  backups: { ok: true; list: BackupInfo[] } | { ok: false; error: IpcError }
}

/** Lädt Datenordner und Backup-Liste; Ausnahmen werden zu einem INTERNAL-Fehler. */
async function fetchData(): Promise<DataSnapshot> {
  try {
    const [d, b] = await Promise.all([window.api.dataDir.get(), window.api.backup.list()])
    return {
      dir: d.ok ? { ok: true, path: d.data.path } : { ok: false, error: d.error },
      backups: b.ok ? { ok: true, list: b.data } : { ok: false, error: b.error }
    }
  } catch {
    return {
      dir: { ok: false, error: INTERNAL_ERROR },
      backups: { ok: false, error: INTERNAL_ERROR }
    }
  }
}

/** Datenordner und Backups. Pfade kommen nur aus dem Main-Prozess, der Renderer sendet keine. */
export function DataSection() {
  const ts = useT(settingsDict)
  const tErr = useT(ipcErrorDict)
  const format = useFormat()
  const [dir, setDir] = useState<string | null>(null)
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [errorState, setErrorState] = useState<DataErrorState>(NO_ERROR)
  const [info, setInfo] = useState<string | null>(null)
  const [restoreName, setRestoreName] = useState<string | null>(null)
  const [restoreError, setRestoreError] = useState<string | null>(null)

  // Jedes Neuladen (nach Wechsel, Wiederherstellung, Import) ersetzt eine alte Meldung.
  const apply = useCallback((data: DataSnapshot) => {
    if (data.dir.ok) setDir(data.dir.path)
    if (data.backups.ok) setBackups(data.backups.list)
    setErrorState(
      dataErrorAfterLoad(
        data.dir.ok ? null : data.dir.error,
        data.backups.ok ? null : data.backups.error
      )
    )
  }, [])

  const load = useCallback(async () => apply(await fetchData()), [apply])

  useEffect(() => {
    let cancelled = false
    void fetchData().then((data) => {
      if (!cancelled) apply(data)
    })
    // Ein Import (Bereich „Export/Import“) legt ein Backup an: Liste danach neu laden.
    const unsubscribe = onDataReplaced(() => {
      void fetchData().then((data) => {
        if (!cancelled) apply(data)
      })
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [apply])

  const choose = async () => {
    setInfo(null)
    setErrorState(NO_ERROR)
    try {
      const res = await window.api.dataDir.choose()
      if (!res.ok) setErrorState({ error: res.error, fromSwitch: true })
      else setInfo(res.data.path === null ? ts('dirCancelled') : ts('dirChosen'))
      if (res.ok && res.data.path !== null) await load()
    } catch {
      setErrorState({ error: INTERNAL_ERROR, fromSwitch: true })
    }
  }

  const restore = async (): Promise<boolean> => {
    if (restoreName === null) return false
    setRestoreError(null)
    let res
    try {
      res = await window.api.backup.restore(restoreName)
    } catch {
      setRestoreError(tErr('INTERNAL'))
      return false
    }
    if (!res.ok) {
      setRestoreError(ipcErrorText(res.error, tErr))
      return false
    }
    await Promise.all([
      invalidateCollections(ENTITY_COLLECTION_NAMES),
      settingsStore().invalidate()
    ])
    setInfo(ts('restored'))
    await load()
    return true
  }

  const restoring = backups.find((b) => b.name === restoreName)

  return (
    <section aria-labelledby="settings-data" className="flex flex-col gap-3">
      <h2 id="settings-data" className="text-base font-semibold">
        {ts('dataTitle')}
      </h2>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">{ts('dataDir')}</div>
          <div className="truncate font-mono text-sm" title={dir ?? undefined}>
            {dir ?? '…'}
          </div>
        </div>
        <Button variant="outline" onClick={() => void choose()}>
          {ts('chooseDir')}
        </Button>
      </div>
      <FieldMessage>{ts('restartHint')}</FieldMessage>
      <FieldMessage error>{ipcErrorText(errorState.error, tErr)}</FieldMessage>
      <FieldMessage error>
        {showDirSwitchAborted(errorState) ? ts('dirSwitchAborted') : null}
      </FieldMessage>
      <FieldMessage>{info}</FieldMessage>

      <h3 className="text-sm font-medium">{ts('backups')}</h3>
      {backups.length === 0 ? (
        <p className="text-sm text-muted-foreground">{ts('noBackups')}</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-md border">
          {backups.map((b) => (
            <li key={b.name} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span>{format.date(b.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRestoreError(null)
                  setRestoreName(b.name)
                }}
              >
                {ts('restore')}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={restoreName !== null}
        onOpenChange={(open) => !open && setRestoreName(null)}
        destructive
        title={ts('restoreTitle')}
        description={ts('restoreDescription', {
          name: restoring
            ? format.date(restoring.createdAt, { dateStyle: 'medium', timeStyle: 'short' })
            : ''
        })}
        confirmLabel={ts('restore')}
        error={restoreError}
        onConfirm={restore}
      />
    </section>
  )
}
