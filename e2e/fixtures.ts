import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import {
  _electron as electron,
  expect,
  test as base,
  type ElectronApplication,
  type Page
} from '@playwright/test'

export interface AppHandle {
  app: ElectronApplication
  page: Page
  /** Temporaeres Verzeichnis dieses Tests (Daten + Profil + Exporte). */
  tempDir: string
}

/** Jeder Test bekommt eine frisch gestartete App mit eigenem temporaeren Datenordner. */
export const test = base.extend<{ appHandle: AppHandle }>({
  appHandle: async ({}, use) => {
    const tempDir = await mkdtemp(join(tmpdir(), 'appmanager-e2e-'))
    const dataDir = join(tempDir, 'data')
    const profileDir = join(tempDir, 'profile')
    const env: Record<string, string> = {}
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined && key !== 'ELECTRON_RENDERER_URL') env[key] = value
    }
    env['APP_DATA_DIR'] = dataDir
    const app = await electron.launch({
      args: [resolve('.'), `--user-data-dir=${profileDir}`],
      env
    })
    try {
      const page = await app.firstWindow()
      await expect(page.getByRole('navigation')).toBeVisible()
      await use({ app, page, tempDir })
    } finally {
      await app.close().catch(() => {})
      await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
    }
  }
})

export { expect }

/** Oeffnet einen Bereich ueber die Seitenleiste. */
export async function gotoNav(page: Page, name: string): Promise<void> {
  await page.getByRole('navigation').getByRole('link', { name, exact: true }).click()
}

/** Legt ein Projekt ueber die Projektliste an. */
export async function createProject(page: Page, name: string): Promise<void> {
  await gotoNav(page, 'Projekte')
  await page.getByRole('button', { name: 'Projekt anlegen' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Name', { exact: true }).fill(name)
  await dialog.getByRole('button', { name: 'Speichern' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('link', { name, exact: true })).toBeVisible()
}

/** Kennzahl-Karte (KPI) anhand ihres Titels. */
export function kpiCard(page: Page, title: string) {
  return page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByText(title, { exact: true }) })
    .first()
}

/** Regex fuer einen Euro-Betrag in deutscher Schreibweise, z. B. `33,34` -> `33,34 €`. */
export function euro(amount: string): RegExp {
  return new RegExp(`^-?${amount.replace(/\./g, '\\.')}\\s*€$`)
}
