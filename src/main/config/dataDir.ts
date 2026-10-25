import { isAbsolute, join, resolve } from 'node:path'
import { StorageError } from '../storage/errors'

export type DataDirSource = 'env' | 'config' | 'dev' | 'default'

export interface DataDirInputs {
  /** Value of `APP_DATA_DIR`. */
  envValue: string | undefined
  /** Folder stored in `userData/config.json` (absolute). */
  storedDir: string | undefined
  /** True when the app is not packaged. */
  isDev: boolean
  /** Repository root (only used in dev). */
  repoDir: string
  /** `app.getPath('userData')`. */
  userDataDir: string
  /** Base for a relative `APP_DATA_DIR` (default: process.cwd()). */
  cwd?: string
}

export interface ResolvedDataDir {
  path: string
  source: DataDirSource
}

function usable(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  if (trimmed === '' || trimmed.includes('\0')) return undefined
  return trimmed
}

/** True if `APP_DATA_DIR` is set to a usable value. */
export function isEnvOverride(envValue: string | undefined): boolean {
  return usable(envValue) !== undefined
}

/**
 * Data folder order (AP-07): `APP_DATA_DIR` -> stored choice -> `<repo>/data-dev`
 * in dev -> `userData/data`.
 */
export function resolveDataDir(inputs: DataDirInputs): ResolvedDataDir {
  const env = usable(inputs.envValue)
  if (env !== undefined) {
    return { path: resolve(inputs.cwd ?? process.cwd(), env), source: 'env' }
  }
  const stored = usable(inputs.storedDir)
  if (stored !== undefined && isAbsolute(stored)) {
    return { path: resolve(stored), source: 'config' }
  }
  if (inputs.isDev) return { path: join(inputs.repoDir, 'data-dev'), source: 'dev' }
  return { path: join(inputs.userDataDir, 'data'), source: 'default' }
}

export interface OpenDialogResult {
  canceled: boolean
  filePaths: string[]
}

export interface ChooseDataDirDeps {
  /** True if `APP_DATA_DIR` is set; a stored choice would have no effect. */
  envOverride: boolean
  /** Native folder dialog (main process). */
  showOpenDialog: () => Promise<OpenDialogResult>
}

/**
 * Lets the user pick a data folder in a native dialog. The renderer never
 * passes a path. Returns the chosen absolute folder or null if cancelled.
 */
export async function chooseDataDir(deps: ChooseDataDirDeps): Promise<string | null> {
  if (deps.envOverride) {
    throw new StorageError('CONFLICT', 'dataDir: APP_DATA_DIR overrides the data folder')
  }
  const result = await deps.showOpenDialog()
  const picked = result.canceled ? undefined : usable(result.filePaths[0])
  if (picked === undefined) return null
  if (!isAbsolute(picked)) throw new StorageError('VALIDATION', 'dataDir: path must be absolute')
  return resolve(picked)
}
