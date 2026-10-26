/** IPC handlers `export:zip` and `import:zip` (AP-25). Neither accepts a payload. */
import { IPC_CHANNELS, fail, ok, type IpcChannel, type IpcResult } from '@shared/ipc'
import type { IpcMainLike, InvokeEventLike } from '../ipc/handlers'
import { StorageError, silentLogger, type SafeLogger } from '../storage/errors'

export interface TransferServiceLike {
  exportZip(): Promise<{ saved: boolean }>
  importZip(): Promise<{ imported: boolean }>
}

export interface TransferIpcDeps {
  service: TransferServiceLike
  isTrustedSender: (event: InvokeEventLike) => boolean
  log?: SafeLogger
}

export function registerTransferHandlers(ipc: IpcMainLike, deps: TransferIpcDeps): void {
  const log = deps.log ?? silentLogger
  // Only one export/import at a time (a second dialog would race the first).
  let busy = false

  function handle<R>(channel: IpcChannel, run: () => Promise<R>): void {
    ipc.handle(channel, async (event, payload): Promise<IpcResult<R>> => {
      if (!deps.isTrustedSender(event)) {
        log(channel, 'FORBIDDEN')
        return fail('FORBIDDEN', 'Untrusted sender')
      }
      if (payload !== undefined) return fail('VALIDATION', 'No input expected')
      if (busy) return fail('CONFLICT', 'Export or import already running')
      busy = true
      try {
        return ok(await run())
      } catch (err) {
        if (err instanceof StorageError) {
          log(channel, err.code)
          return fail(err.code, err.message)
        }
        log(channel, 'INTERNAL')
        return fail('INTERNAL', 'Internal error')
      } finally {
        busy = false
      }
    })
  }

  handle(IPC_CHANNELS.exportZip, () => deps.service.exportZip())
  handle(IPC_CHANNELS.importZip, () => deps.service.importZip())
}
