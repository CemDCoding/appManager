import type { IpcError, IpcErrorCode, IpcResult } from '@shared/ipc'
import type { TransferKey } from './i18n'

export type TransferAction = 'export' | 'import'

/**
 * Ergebnis für die Anzeige: Text-Schlüssel oder IPC-Fehlercode (allgemeiner Text).
 * `changed` sagt, ob die Daten neu geladen werden müssen.
 */
export type TransferOutcome =
  | { kind: 'success' | 'cancelled'; key: TransferKey; changed: boolean }
  | { kind: 'error'; key: TransferKey | null; code: IpcErrorCode; changed: boolean }

/** Eigene Texte je Aktion und Fehlercode; sonst gilt der allgemeine Fehlertext. */
const ERROR_KEYS: Record<TransferAction, Partial<Record<IpcErrorCode, TransferKey>>> = {
  export: { INVALID_DATA: 'exportInvalid', CONFLICT: 'busy' },
  import: { INVALID_DATA: 'invalidZip', IO: 'importIo', CONFLICT: 'busy' }
}

/**
 * Fehlerlagen eines IO-Fehlers beim Import, erkannt an der Meldung aus dem Main-Prozess
 * (`src/main/transfer/*`, `src/main/storage/backups.ts`). `changed`: Der Datenbestand kann
 * sich geändert haben, die Caches müssen neu geladen werden.
 */
const IMPORT_IO: readonly { match: string; key: TransferKey; changed: boolean }[] = [
  { match: 'backup could not be created', key: 'importBackupFailed', changed: false },
  { match: 'restore the latest backup', key: 'importRollbackFailed', changed: true },
  { match: 'previous state kept', key: 'importRolledBack', changed: false },
  { match: 'files could not be written', key: 'importWriteFailed', changed: false },
  // Nur die Quelllesung des Imports (`src/main/transfer/service.ts`). Lesefehler am
  // Backup-Ordner (`backups: … could not be read`) fallen auf den allgemeinen Text.
  { match: 'import: file could not be read', key: 'importReadFailed', changed: false }
]

function errorOutcome(action: TransferAction, error: IpcError): TransferOutcome {
  if (action === 'import' && error.code === 'IO') {
    const known = IMPORT_IO.find((s) => error.message.includes(s.match))
    // Unbekannte Lage: vorsichtig neu laden, Text ohne Zusage zum Backup.
    if (known) return { kind: 'error', key: known.key, code: error.code, changed: known.changed }
    return { kind: 'error', key: 'importIo', code: error.code, changed: true }
  }
  return {
    kind: 'error',
    key: ERROR_KEYS[action][error.code] ?? null,
    code: error.code,
    changed: false
  }
}

/**
 * Übersetzt das Ergebnis von `export.zip()` / `import.zip()` in eine Anzeige.
 * `changed` sagt, ob die Daten neu geladen werden müssen (nach Import oder einem
 * Importfehler, der den Bestand verändert haben kann).
 */
export function transferOutcome(
  action: TransferAction,
  result: IpcResult<{ saved: boolean } | { imported: boolean }>
): TransferOutcome {
  if (!result.ok) return errorOutcome(action, result.error)
  const done = 'saved' in result.data ? result.data.saved : result.data.imported
  if (action === 'export') {
    return done
      ? { kind: 'success', key: 'exported', changed: false }
      : { kind: 'cancelled', key: 'exportCancelled', changed: false }
  }
  return done
    ? { kind: 'success', key: 'imported', changed: true }
    : { kind: 'cancelled', key: 'importCancelled', changed: false }
}

type DataReplacedListener = () => void
const dataReplacedListeners = new Set<DataReplacedListener>()

/**
 * Meldet, dass ein Import den Datenordner verändert hat (z. B. neues Backup). Andere
 * Bereiche (Backup-Liste) laden dann neu.
 */
export function notifyDataReplaced(): void {
  for (const listener of [...dataReplacedListeners]) listener()
}

/** Abonniert `notifyDataReplaced`; gibt die Abmeldung zurück. */
export function onDataReplaced(listener: DataReplacedListener): () => void {
  dataReplacedListeners.add(listener)
  return () => {
    dataReplacedListeners.delete(listener)
  }
}
