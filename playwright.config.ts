import { defineConfig } from '@playwright/test'

/**
 * Tests (AP-26)
 *
 * - Start: `npm run build && npm run test:e2e`. Die Tests starten die GEBAUTE App
 *   (`out/main/index.js`, Electron ueber `_electron`), nicht den Dev-Server.
 * - Isolation: Jeder Test legt ein frisches temporaeres Verzeichnis an und setzt
 *   `APP_DATA_DIR` (Daten) sowie `--user-data-dir` (Electron-Profil, damit die
 *   Einzelinstanz-Sperre parallele/alte Laeufe nicht stoert). Echte Datenpfade
 *   werden nie beruehrt; das Verzeichnis wird nach dem Test geloescht.
 * - Ablaeufe: (1) Projekt anlegen und bearbeiten, (2) drei Projekte + 100 EUR Lizenz
 *   auf "alle" -> 33,34 / 33,33 / 33,33, (3) Einnahme + Ausgabe -> Saldo auf der
 *   Startseite und echter PDF-Export (Speichern-Dialog per `electronApp.evaluate`
 *   gestubbt, Datei wird geprueft: existiert, beginnt mit %PDF, nicht leer).
 * - Stabilitaet: keine festen Wartezeiten; es wird auf sichtbare Zustaende gewartet
 *   (auto-waiting Locators, `expect.poll`). Ein Worker, kein Retry.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list']]
})
