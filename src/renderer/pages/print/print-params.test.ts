import { describe, expect, it } from 'vitest'
import { parsePrintParams } from './print-params'

const PROJECT_ID = '3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e'

describe('parsePrintParams', () => {
  it('liest einen Projektauftrag aus der Query', () => {
    const params = new URLSearchParams(
      `scope=project&projectId=${PROJECT_ID}&from=2026-01-01&to=2026-03-31&lang=en&currency=USD`
    )
    expect(parsePrintParams(params)).toEqual({
      scope: 'project',
      projectId: PROJECT_ID,
      period: { from: '2026-01-01', to: '2026-03-31' },
      language: 'en',
      displayCurrency: 'USD'
    })
  })

  it('liest einen Portfolioauftrag', () => {
    const params = new URLSearchParams(
      'scope=portfolio&from=2026-01-01&to=2026-01-31&lang=de&currency=EUR'
    )
    expect(parsePrintParams(params)?.scope).toBe('portfolio')
  })

  it.each([
    '',
    'scope=portfolio&from=2026-01-01&to=2026-01-31&lang=de',
    'scope=project&from=2026-01-01&to=2026-01-31&lang=de&currency=EUR',
    'scope=portfolio&from=2026-02-01&to=2026-01-31&lang=de&currency=EUR',
    'scope=portfolio&from=2026-01-01&to=2026-01-31&lang=xx&currency=EUR'
  ])('ungültig: "%s"', (query) => {
    expect(parsePrintParams(new URLSearchParams(query))).toBeNull()
  })
})
