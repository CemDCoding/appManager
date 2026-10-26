import { useCallback, useEffect, useState } from 'react'
import { ENTITY_COLLECTION_NAMES } from '@shared/collections'
import type { BackupInfo, IpcError } from '@shared/ipc'
import { Button } from '@/components/ui/button'
import { ConfirmDialog, FieldMessage } from '@/components/forms'
import { ipcErrorText } from '@/hooks'
import { useFormat, useT } from '@/i18n'
import { ipcErrorDict } from '@/i18n/shared-keys'
import { invalidateCollections, settingsStore } from '@/state/stores'
import { settingsDict } from './i18n'

/** Datenordner und Backups. Pfade kommen nur aus dem Main-Prozess, der Renderer sendet keine. */
export function DataSection() {
  const ts = useT(settingsDict)
  const tErr = useT(ipcErrorDict)
  const format = useFormat()
  const [dir, setDir] = useState<string | null>(null)
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [error, setError] = useState<IpcError | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [restoreName, setRestoreName] = useState<string | null>(null)
  const [restoreError, setRestoreError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [d, b] = await Promise.all([window.api.dataDir.get(), window.api.backup.list()])
      if (d.ok) setDir(d.data.path)
      else setError(d.error)
      if (b.ok) setBackups(b.data)
      else setError(b.error)
    } catch {
      setError({ code: 'INTERNAL', message: '' })
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([window.api.dataDir.get(), window.api.backup.list()])
      .then(([d, b]) => {
        if (cancelled) return
        if (d.ok) setDir(d.data.path)
        else setError(d.error)
        if (b.ok) setBackups(b.data)
        else setError(b.error)
      })
      .catch(() => {
        if (!cancelled) setError({ code: 'INTERNAL', message: '' })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const choose = async () => {
    setInfo(null)
    setError(null)
    try {
      const res = await window.api.dataDir.choose()
      if (!res.ok) setError(res.error)
      else setInfo(res.data.path === null ? ts('dirCancelled') : ts('dirChosen'))
      if (res.ok && res.data.path !== null) await load()
    } catch {
      setError({ code: 'INTERNAL', message: '' })
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
      <FieldMessage error>{ipcErrorText(error, tErr)}</FieldMessage>
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
