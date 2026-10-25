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
 * Data folder order (AP-07, PE-18):
 * - dev (not packaged): `APP_DATA_DIR` -> `<repo>/data-dev`. The stored choice
 *   is ignored, because dev and the installed app share `userData` and dev
 *   must never open the real data folder.
 * - packaged: `APP_DATA_DIR` -> stored choice -> `userData/data`.
 */
export function resolveDataDir(inputs: DataDirInputs): ResolvedDataDir {
  const env = usable(inputs.envValue)
  if (env !== undefined) {
    return { path: resolve(inputs.cwd ?? process.cwd(), env), source: 'env' }
  }
  if (inputs.isDev) return { path: join(inputs.repoDir, 'data-dev'), source: 'dev' }
  const stored = usable(inputs.storedDir)
  if (stored !== undefined && isAbsolute(stored)) {
    return { path: resolve(stored), source: 'config' }
  }
  return { path: join(inputs.userDataDir, 'data'), source: 'default' }
}

export interface OpenDialogResult {
  canceled: boolean
  filePaths: string[]
}

export interface ChooseDataDirDeps {
  /** True if `APP_DATA_DIR` is set; a stored choice would have no effect. */
  envOverride: boolean
  /** True when not packaged: the folder is fixed to data-dev (PE-18). */
  isDev: boolean
  /** Native folder dialog (main process). */
  showOpenDialog: () => Promise<OpenDialogResult>
}

/**
 * Lets the user pick a data folder in a native dialog. The renderer never
 * passes a path. Returns the chosen absolute folder or null if cancelled.
 * In dev the choice is refused (CONFLICT), so dev never persists or opens a
 * real data folder.
 */
export async function chooseDataDir(deps: ChooseDataDirDeps): Promise<string | null> {
  if (deps.isDev) {
    throw new StorageError(
      'CONFLICT',
      'dataDir: fixed to data-dev in development (use APP_DATA_DIR to override)'
    )
  }
  if (deps.envOverride) {
    throw new StorageError('CONFLICT', 'dataDir: APP_DATA_DIR overrides the data folder')
  }
  const result = await deps.showOpenDialog()
  const picked = result.canceled ? undefined : usable(result.filePaths[0])
  if (picked === undefined) return null
  if (!isAbsolute(picked)) throw new StorageError('VALIDATION', 'dataDir: path must be absolute')
  return resolve(picked)
}
