import { describe, expect, it, vi } from 'vitest'
import { transferDict } from './i18n'
import { notifyDataReplaced, onDataReplaced, transferOutcome } from './transfer-logic'

const ioError = (message: string) =>
  transferOutcome('import', { ok: false, error: { code: 'IO', message } })

describe('transferOutcome', () => {
  it('maps export results', () => {
    expect(transferOutcome('export', { ok: true, data: { saved: true } })).toEqual({
      kind: 'success',
      key: 'exported',
      changed: false
    })
    expect(transferOutcome('export', { ok: true, data: { saved: false } })).toMatchObject({
      kind: 'cancelled',
      key: 'exportCancelled'
    })
    expect(
      transferOutcome('export', { ok: false, error: { code: 'INVALID_DATA', message: '' } })
    ).toMatchObject({ kind: 'error', key: 'exportInvalid', changed: false })
    // Export-IO nutzt den allgemeinen Text, auch bei gleicher Meldung wie beim Import.
    expect(
      transferOutcome('export', {
        ok: false,
        error: { code: 'IO', message: 'export: file could not be written' }
      })
    ).toEqual({ kind: 'error', key: null, code: 'IO', changed: false })
  })

  it('maps import results; only a successful import changes data', () => {
    expect(transferOutcome('import', { ok: true, data: { imported: true } })).toEqual({
      kind: 'success',
      key: 'imported',
      changed: true
    })
    expect(transferOutcome('import', { ok: true, data: { imported: false } })).toMatchObject({
      kind: 'cancelled',
      changed: false
    })
    expect(
      transferOutcome('import', { ok: false, error: { code: 'INVALID_DATA', message: 'x' } })
    ).toMatchObject({ kind: 'error', key: 'invalidZip', changed: false })
    expect(
      transferOutcome('import', { ok: false, error: { code: 'FORBIDDEN', message: '' } })
    ).toEqual({ kind: 'error', key: null, code: 'FORBIDDEN', changed: false })
    expect(
      transferOutcome('import', { ok: false, error: { code: 'CONFLICT', message: '' } })
    ).toMatchObject({ key: 'busy', changed: false })
  })

  it('gives every import IO situation its own text (AP-25 (4))', () => {
    expect(ioError('backups: backup could not be created')).toEqual({
      kind: 'error',
      key: 'importBackupFailed',
      code: 'IO',
      changed: false
    })
    expect(ioError('import: file could not be read')).toMatchObject({
      key: 'importReadFailed',
      changed: false
    })
    expect(ioError('import: files could not be written')).toMatchObject({
      key: 'importWriteFailed',
      changed: false
    })
    expect(ioError('import: files could not be replaced, previous state kept')).toMatchObject({
      key: 'importRolledBack',
      changed: false
    })
  })

  it('reloads caches after a failed rollback or an unknown IO situation (AP-25 (5))', () => {
    expect(ioError('import: files could not be replaced, restore the latest backup')).toMatchObject(
      { key: 'importRollbackFailed', changed: true }
    )
    expect(ioError('something else')).toMatchObject({ key: 'importIo', changed: true })
  })

  it('no import error text claims a backup in the data folder', () => {
    for (const lang of ['de', 'en'] as const) {
      const d = transferDict[lang]
      for (const key of ['importBackupFailed', 'importReadFailed', 'importWriteFailed'] as const) {
        expect(d[key]).not.toMatch(/Datenordner|data folder/)
      }
      expect(d.importIo).not.toMatch(/Datenordner|data folder/)
    }
  })
})

describe('onDataReplaced', () => {
  it('notifies subscribers until they unsubscribe', () => {
    const listener = vi.fn()
    const off = onDataReplaced(listener)
    notifyDataReplaced()
    expect(listener).toHaveBeenCalledTimes(1)
    off()
    notifyDataReplaced()
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
