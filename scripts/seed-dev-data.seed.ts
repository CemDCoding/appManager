/**
 * Dev seed script (AP-08, PE-18). Run with `npm run seed` (executed through vitest).
 *
 * Writes invented, schema-valid test data for all collections into `<repo>/data-dev/`.
 * - The target is ALWAYS `<repo>/data-dev/`; APP_DATA_DIR is deliberately ignored so a
 *   real data folder can never be overwritten.
 * - Existing collection files there are replaced, `backups/` and other files stay untouched.
 * - Data is validated with the shared schemas before anything is written.
 * - The dataset is fixed (constant ids and timestamps), see `scripts/seed-data/index.ts`.
 */
import { mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import { COLLECTIONS, COLLECTION_NAMES, SCHEMA_VERSION, parseCollectionFile } from '@shared/collections'
import { buildSeedData } from './seed-data'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const TARGET_DIR = join(REPO_ROOT, 'data-dev')

it('writes seed data to data-dev/', () => {
  const data = buildSeedData()
  const files = COLLECTION_NAMES.map((name) => {
    const file = { schemaVersion: SCHEMA_VERSION, items: data[name] }
    const res = parseCollectionFile(name, file)
    if (!res.ok) throw new Error(`Seed data invalid: ${res.message}`)
    return { name: COLLECTIONS[name].file, json: JSON.stringify(file, null, 2) + '\n' }
  })

  mkdirSync(TARGET_DIR, { recursive: true })
  for (const f of files) {
    const target = join(TARGET_DIR, f.name)
    const tmp = `${target}.tmp`
    writeFileSync(tmp, f.json, 'utf8')
    renameSync(tmp, target)
  }
  expect(files).toHaveLength(COLLECTION_NAMES.length)
})
