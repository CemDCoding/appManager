import { IPC_ERROR_CODES, type IpcError, type IpcErrorCode } from '@shared/ipc'
import type { TranslateFn } from '@/i18n'

/** Optionale eigene Texte je Fehlercode, z. B. `{ IN_USE: tp('projectInUse') }`. */
export type ErrorMessages = Partial<Record<IpcErrorCode, string>>

function isIpcErrorCode(value: unknown): value is IpcErrorCode {
  return typeof value === 'string' && (IPC_ERROR_CODES as readonly string[]).includes(value)
}

/**
 * Übersetzt einen IPC-Fehler in einen Anzeigetext. Die technische `message` aus dem
 * Main-Prozess wird nie angezeigt (kann Pfade oder Interna enthalten), nur der Code zählt.
 * Unbekannte Codes ergeben den Text für `INTERNAL`.
 *
 * @example
 * const tErr = useT(ipcErrorDict)
 * ipcErrorText(result.error, tErr, { IN_USE: tp('projectInUse') })
 */
export function ipcErrorText(
  error: IpcError | null | undefined,
  t: TranslateFn<IpcErrorCode>,
  overrides?: ErrorMessages
): string | null {
  if (!error) return null
  const code: IpcErrorCode = isIpcErrorCode(error.code) ? error.code : 'INTERNAL'
  return overrides?.[code] ?? t(code)
}
