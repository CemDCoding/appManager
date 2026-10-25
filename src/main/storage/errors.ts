import type { IpcErrorCode } from '@shared/ipc'

/**
 * Error with an IPC error code. Messages never contain user data (R2):
 * only collection names, codes and fixed texts.
 */
export class StorageError extends Error {
  readonly code: IpcErrorCode

  constructor(code: IpcErrorCode, message: string) {
    super(message)
    this.name = 'StorageError'
    this.code = code
  }
}

/** Log sink. Receives only a scope (collection or channel name) and an error code. */
export type SafeLogger = (scope: string, code: IpcErrorCode) => void

export const consoleLogger: SafeLogger = (scope, code) => {
  console.warn(`[storage] ${scope}: ${code}`)
}

export const silentLogger: SafeLogger = () => {}

/** Node error code (ENOENT, EPERM ...) or undefined. */
export function errnoCode(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code: unknown }).code
    return typeof code === 'string' ? code : undefined
  }
  return undefined
}
