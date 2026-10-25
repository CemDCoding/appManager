import { mkdir, readFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { z } from 'zod'
import { writeFileAtomic } from '../storage/atomic'

export const APP_CONFIG_FILE = 'config.json'

/** App configuration in `userData/config.json` (not part of the data folder). */
export const AppConfigSchema = z.object({
  dataDir: z
    .string()
    .min(1)
    .max(1000)
    .refine((p) => isAbsolute(p), 'dataDir must be an absolute path')
    .optional()
})
export type AppConfig = z.infer<typeof AppConfigSchema>

/** Reads the config. Missing or broken config means "no stored choice". */
export async function readAppConfig(userDataDir: string): Promise<AppConfig> {
  let text: string
  try {
    text = await readFile(join(userDataDir, APP_CONFIG_FILE), 'utf8')
  } catch {
    return {}
  }
  try {
    const parsed = AppConfigSchema.safeParse(JSON.parse(text))
    return parsed.success ? parsed.data : {}
  } catch {
    return {}
  }
}

export async function writeAppConfig(userDataDir: string, config: AppConfig): Promise<void> {
  const valid = AppConfigSchema.parse(config)
  await mkdir(userDataDir, { recursive: true })
  await writeFileAtomic(join(userDataDir, APP_CONFIG_FILE), `${JSON.stringify(valid, null, 2)}\n`)
}
