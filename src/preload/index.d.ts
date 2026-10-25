import type { AppApi } from '@shared/ipc'

declare global {
  interface Window {
    /** Typed bridge from the preload (contextBridge). */
    api: AppApi
  }
}

export {}
