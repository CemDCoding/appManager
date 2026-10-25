import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { makeTempDir, removeDir } from '../../storage/__tests__/fixtures'
import { APP_CONFIG_FILE, readAppConfig, writeAppConfig } from '../appConfig'
import { chooseDataDir, isEnvOverride, resolveDataDir } from '../dataDir'

const base = {
  repoDir: resolve('/repo'),
  userDataDir: resolve('/user-data'),
  cwd: resolve('/cwd')
}

describe('resolveDataDir (order: env -> config -> dev -> default)', () => {
  const stored = resolve('/stored')

  it('prefers APP_DATA_DIR', () => {
    expect(
      resolveDataDir({ ...base, envValue: resolve('/env'), storedDir: stored, isDev: true })
    ).toEqual({ path: resolve('/env'), source: 'env' })
  })

  it('resolves a relative APP_DATA_DIR against cwd', () => {
    expect(
      resolveDataDir({ ...base, envValue: './data-dev', storedDir: undefined, isDev: false }).path
    ).toBe(join(base.cwd, 'data-dev'))
  })

  it('uses the stored choice when env is empty', () => {
    expect(resolveDataDir({ ...base, envValue: '  ', storedDir: stored, isDev: true })).toEqual({
      path: stored,
      source: 'config'
    })
  })

  it('ignores a relative stored path', () => {
    expect(
      resolveDataDir({ ...base, envValue: undefined, storedDir: 'rel', isDev: false }).source
    ).toBe('default')
  })

  it('uses <repo>/data-dev in dev', () => {
    expect(
      resolveDataDir({ ...base, envValue: undefined, storedDir: undefined, isDev: true })
    ).toEqual({ path: join(base.repoDir, 'data-dev'), source: 'dev' })
  })

  it('falls back to userData/data when packaged', () => {
    expect(
      resolveDataDir({ ...base, envValue: undefined, storedDir: undefined, isDev: false })
    ).toEqual({ path: join(base.userDataDir, 'data'), source: 'default' })
  })

  it('detects the env override', () => {
    expect(isEnvOverride(undefined)).toBe(false)
    expect(isEnvOverride('')).toBe(false)
    expect(isEnvOverride('x')).toBe(true)
  })
})

describe('app config', () => {
  let dir: string
  beforeEach(async () => {
    dir = await makeTempDir()
  })
  afterEach(async () => {
    await removeDir(dir)
  })

  it('returns {} for a missing or broken config', async () => {
    expect(await readAppConfig(dir)).toEqual({})
    await writeFile(join(dir, APP_CONFIG_FILE), '{broken', 'utf8')
    expect(await readAppConfig(dir)).toEqual({})
    await writeFile(join(dir, APP_CONFIG_FILE), '{"dataDir":"relative"}', 'utf8')
    expect(await readAppConfig(dir)).toEqual({})
  })

  it('writes and reads the data folder choice', async () => {
    const chosen = join(dir, 'chosen')
    await writeAppConfig(dir, { dataDir: chosen })
    expect(await readAppConfig(dir)).toEqual({ dataDir: chosen })
    expect(JSON.parse(await readFile(join(dir, APP_CONFIG_FILE), 'utf8'))).toEqual({
      dataDir: chosen
    })
  })
})

describe('chooseDataDir', () => {
  it('returns null when cancelled', async () => {
    const showOpenDialog = vi.fn(async () => ({ canceled: true, filePaths: [] }))
    expect(await chooseDataDir({ envOverride: false, showOpenDialog })).toBeNull()
  })

  it('returns the chosen absolute folder', async () => {
    const picked = resolve('/picked')
    const showOpenDialog = vi.fn(async () => ({ canceled: false, filePaths: [picked] }))
    expect(await chooseDataDir({ envOverride: false, showOpenDialog })).toBe(picked)
  })

  it('rejects relative paths', async () => {
    const showOpenDialog = vi.fn(async () => ({ canceled: false, filePaths: ['rel'] }))
    await expect(chooseDataDir({ envOverride: false, showOpenDialog })).rejects.toMatchObject({
      code: 'VALIDATION'
    })
  })

  it('does not open the dialog when APP_DATA_DIR overrides the folder', async () => {
    const showOpenDialog = vi.fn(async () => ({ canceled: true, filePaths: [] }))
    await expect(chooseDataDir({ envOverride: true, showOpenDialog })).rejects.toMatchObject({
      code: 'CONFLICT'
    })
    expect(showOpenDialog).not.toHaveBeenCalled()
  })
})
