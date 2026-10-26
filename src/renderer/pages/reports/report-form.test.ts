import { describe, expect, it } from 'vitest'
import { toExportInput, type ReportForm } from './report-form'

const PROJECT_ID = '3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e'
const base: ReportForm = {
  scope: 'portfolio',
  projectId: '',
  period: { from: '2026-01-01', to: '2026-01-31' },
  language: 'de',
  currency: 'EUR'
}

describe('toExportInput', () => {
  it('Portfolio ohne projectId (auch wenn eines gewählt war)', () => {
    expect(toExportInput({ ...base, projectId: PROJECT_ID })).toEqual({
      ok: true,
      input: {
        scope: 'portfolio',
        period: { from: '2026-01-01', to: '2026-01-31' },
        language: 'de',
        displayCurrency: 'EUR'
      }
    })
  })

  it('Projekt mit projectId', () => {
    const r = toExportInput({ ...base, scope: 'project', projectId: PROJECT_ID, language: 'en' })
    expect(r).toMatchObject({ ok: true, input: { projectId: PROJECT_ID, language: 'en' } })
  })

  it('Projekt ohne Auswahl', () => {
    expect(toExportInput({ ...base, scope: 'project' })).toEqual({
      ok: false,
      error: 'projectRequired'
    })
  })

  it('ungültiger Zeitraum', () => {
    expect(toExportInput({ ...base, period: { from: '2026-02-01', to: '2026-01-31' } })).toEqual({
      ok: false,
      error: 'invalidPeriod'
    })
  })

  it('ungültige Währung', () => {
    expect(toExportInput({ ...base, currency: 'xx' })).toEqual({ ok: false, error: 'invalid' })
  })
})
