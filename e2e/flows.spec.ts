import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { createProject, euro, expect, gotoNav, kpiCard, test } from './fixtures'

test('flow 1: create and edit a project', async ({ appHandle: { page } }) => {
  await createProject(page, 'Alpha')

  await page
    .getByRole('row', { name: /Alpha/ })
    .getByRole('button', { name: 'Bearbeiten' })
    .click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Projekt bearbeiten' })).toBeVisible()
  await dialog.getByLabel('Name', { exact: true }).fill('Alpha Neu')
  await dialog.getByLabel('Beschreibung').fill('Beschreibung E2E')
  await dialog.getByRole('button', { name: 'Speichern' }).click()
  await expect(dialog).toBeHidden()

  await expect(page.getByRole('link', { name: 'Alpha Neu', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Alpha', exact: true })).toHaveCount(0)

  await page.getByRole('link', { name: 'Alpha Neu', exact: true }).click()
  await expect(page.getByText('Beschreibung E2E')).toBeVisible()
})

test('flow 2: 100 EUR license on all projects splits 33,34 / 33,33 / 33,33', async ({
  appHandle: { page }
}) => {
  const names = ['Projekt A', 'Projekt B', 'Projekt C']
  for (const name of names) await createProject(page, name)

  await gotoNav(page, 'Ausgaben')
  await page.getByRole('button', { name: 'Ausgabe erfassen' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Kategorie').selectOption('softwareLicense')
  await dialog.getByLabel('Betrag', { exact: true }).fill('100,00')
  await dialog.getByRole('radio', { name: 'Alle aktiven Projekte' }).click()
  await expect(dialog.getByText('33,34', { exact: false }).first()).toBeVisible()
  await dialog.getByRole('button', { name: 'Speichern' }).click()
  await expect(dialog).toBeHidden()

  const shown: string[] = []
  for (const name of names) {
    await gotoNav(page, 'Projekte')
    await page.getByRole('link', { name, exact: true }).click()
    const value = kpiCard(page, 'Ausgaben').locator('.tabular-nums')
    await expect(value).toHaveText(/\d/)
    shown.push((await value.innerText()).replace(/\s/g, ' ').trim())
  }
  const amounts = shown.map((s) => s.replace(/\s*€$/, '')).sort()
  expect(amounts).toEqual(['33,33', '33,33', '33,34'])
})

test('flow 3: income + expense -> home balance; real PDF export', async ({
  appHandle: { app, page, tempDir }
}) => {
  await createProject(page, 'Kasse')

  await gotoNav(page, 'Einnahmen')
  await page.getByRole('button', { name: 'Einnahme erfassen' }).click()
  const incomeDialog = page.getByRole('dialog')
  await incomeDialog.getByLabel('Projekt').selectOption({ label: 'Kasse' })
  await incomeDialog.getByLabel('Kategorie').selectOption('storeSales')
  await incomeDialog.getByLabel('Betrag (netto)').fill('500,00')
  await incomeDialog.getByRole('button', { name: 'Speichern' }).click()
  await expect(incomeDialog).toBeHidden()

  await gotoNav(page, 'Ausgaben')
  await page.getByRole('button', { name: 'Ausgabe erfassen' }).click()
  const expenseDialog = page.getByRole('dialog')
  await expenseDialog.getByLabel('Kategorie').selectOption('hosting')
  await expenseDialog.getByLabel('Betrag', { exact: true }).fill('120,00')
  await expenseDialog.getByRole('radio', { name: 'Alle aktiven Projekte' }).click()
  await expenseDialog.getByRole('button', { name: 'Speichern' }).click()
  await expect(expenseDialog).toBeHidden()

  await gotoNav(page, 'Start')
  await expect(kpiCard(page, 'Einnahmen').locator('.tabular-nums')).toHaveText(euro('500,00'))
  await expect(kpiCard(page, 'Ausgaben').locator('.tabular-nums')).toHaveText(euro('120,00'))
  await expect(kpiCard(page, 'Saldo').locator('.tabular-nums')).toHaveText(euro('380,00'))

  // Speichern-Dialog per Playwright stubben (kein Test-Hook in der App).
  const pdfPath = join(tempDir, 'bericht.pdf')
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = (async () => ({
      canceled: false,
      filePath
    })) as unknown as typeof dialog.showSaveDialog
  }, pdfPath)

  await gotoNav(page, 'Berichte')
  await page.getByRole('button', { name: 'PDF erstellen' }).click()
  await expect(page.getByText('PDF gespeichert.')).toBeVisible({ timeout: 60_000 })

  await expect.poll(async () => (await stat(pdfPath)).size, { timeout: 15_000 }).toBeGreaterThan(0)
  const head = (await readFile(pdfPath)).subarray(0, 4).toString('latin1')
  expect(head).toBe('%PDF')
})
