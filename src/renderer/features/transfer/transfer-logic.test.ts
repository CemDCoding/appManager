import { describe, expect, it } from 'vitest'
import { transferOutcome } from './transfer-logic'

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
    ).toMatchObject({ kind: 'error', key: 'exportInvalid' })
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
    ).toMatchObject({ kind: 'error', key: 'invalidZip' })
    expect(
      transferOutcome('import', { ok: false, error: { code: 'FORBIDDEN', message: '' } })
    ).toEqual({ kind: 'error', key: null, code: 'FORBIDDEN' })
  })
})
