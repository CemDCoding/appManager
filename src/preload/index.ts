// Preload (sandbox: true, CommonJS). Only `electron` may be imported at runtime;
// everything from @shared is imported as type only, so nothing else is bundled
// or required. Exposes exactly `AppApi` – no generic ipcRenderer access.
import { contextBridge, ipcRenderer } from 'electron'
import type { AppApi, IpcChannel, IpcResult } from '@shared/ipc'

/** Fixed channel names (checked against the contract at compile time). */
const CH = {
  entityList: 'entity:list',
  entityGet: 'entity:get',
  entityCreate: 'entity:create',
  entityUpdate: 'entity:update',
  entityDelete: 'entity:delete',
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  dataDirGet: 'dataDir:get',
  dataDirChoose: 'dataDir:choose',
  backupList: 'backup:list',
  backupRestore: 'backup:restore',
  shellOpenExternal: 'shell:openExternal',
  exportZip: 'export:zip',
  importZip: 'import:zip',
  pdfExport: 'pdf:export',
  pdfReady: 'pdf:ready'
} as const satisfies Record<string, IpcChannel>

/** Invokes a fixed channel; a rejected invoke (e.g. no handler yet) becomes an IpcResult. */
async function invoke<T>(channel: IpcChannel, payload?: unknown): Promise<IpcResult<T>> {
  try {
    return (await ipcRenderer.invoke(channel, payload)) as IpcResult<T>
  } catch {
    return { ok: false, error: { code: 'INTERNAL', message: 'IPC call failed' } }
  }
}

const api: AppApi = {
  entity: {
    list: (collection) => invoke(CH.entityList, { collection }),
    get: (collection, id) => invoke(CH.entityGet, { collection, id }),
    create: (collection, data) => invoke(CH.entityCreate, { collection, data }),
    update: (collection, id, data) => invoke(CH.entityUpdate, { collection, id, data }),
    delete: (collection, id, options) =>
      invoke(
        CH.entityDelete,
        options?.cascade === undefined
          ? { collection, id }
          : { collection, id, cascade: options.cascade }
      )
  },
  settings: {
    get: () => invoke(CH.settingsGet),
    set: (input) => invoke(CH.settingsSet, input)
  },
  dataDir: {
    get: () => invoke(CH.dataDirGet),
    choose: () => invoke(CH.dataDirChoose)
  },
  backup: {
    list: () => invoke(CH.backupList),
    restore: (name) => invoke(CH.backupRestore, { name })
  },
  shell: {
    openExternal: (url) => invoke(CH.shellOpenExternal, { url })
  },
  export: {
    zip: () => invoke(CH.exportZip)
  },
  import: {
    zip: () => invoke(CH.importZip)
  },
  pdf: {
    export: (input) => invoke(CH.pdfExport, input),
    ready: () => invoke(CH.pdfReady, { ready: true })
  }
}

contextBridge.exposeInMainWorld('api', api)
