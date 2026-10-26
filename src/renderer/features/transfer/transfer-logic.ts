import type { IpcErrorCode, IpcResult } from '@shared/ipc'
import type { TransferKey } from './i18n'

export type TransferAction = 'export' | 'import'

/** Ergebnis für die Anzeige: Text-Schlüssel oder IPC-Fehlercode (allgemeiner Text). */
export type TransferOutcome =
  | { kind: 'success' | 'cancelled'; key: TransferKey; changed: boolean }
  | { kind: 'error'; key: TransferKey | null; code: IpcErrorCode }

/** Eigene Texte je Aktion und Fehlercode; sonst gilt der allgemeine Fehlertext. */
const ERROR_KEYS: Record<TransferAction, Partial<Record<IpcErrorCode, TransferKey>>> = {
  export: { INVALID_DATA: 'exportInvalid', CONFLICT: 'busy' },
  import: { INVALID_DATA: 'invalidZip', IO: 'importIo', CONFLICT: 'busy' }
}

/**
 * Übersetzt das Ergebnis von `export.zip()` / `import.zip()` in eine Anzeige.
 * `changed` sagt, ob die Daten neu geladen werden müssen (nur nach Import).
 */
export function transferOutcome(
  action: TransferAction,
  result: IpcResult<{ saved: boolean } | { imported: boolean }>
): TransferOutcome {
  if (!result.ok) {
    return {
      kind: 'error',
      key: ERROR_KEYS[action][result.error.code] ?? null,
      code: result.error.code
    }
  }
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
