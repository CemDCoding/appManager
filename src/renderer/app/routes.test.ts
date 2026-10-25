import { describe, expect, it } from 'vitest'
import { findRoute, navRoutes, PATHS, personPath, projectPath, routes } from './routes'

const EXPECTED_PATHS = [
  '/',
  '/projects',
  '/projects/:id',
  '/services',
  '/expenses',
  '/incomes',
  '/people',
  '/people/:id',
  '/campaigns',
  '/metrics',
  '/stats',
  '/reports',
  '/settings',
  '/print'
]

describe('routes', () => {
  it('contains every required path exactly once', () => {
    const paths = routes.map((route) => route.path)
    expect([...paths].sort()).toEqual([...EXPECTED_PATHS].sort())
    expect(new Set(paths).size).toBe(paths.length)
    expect(Object.values(PATHS).sort()).toEqual([...EXPECTED_PATHS].sort())
  })

  it('renders the print view without layout and everything else with layout', () => {
    for (const route of routes) {
      expect(route.withLayout).toBe(route.path !== '/print')
      expect(typeof route.component).toBe('function')
    }
  })

  it('shows all top-level areas with an icon in the navigation', () => {
    expect(navRoutes.map((route) => route.path)).toEqual([
      '/',
      '/projects',
      '/services',
      '/expenses',
      '/incomes',
      '/people',
      '/campaigns',
      '/metrics',
      '/stats',
      '/reports',
      '/settings'
    ])
    for (const route of navRoutes) expect(route.icon).toBeDefined()
  })

  it('finds routes including detail pages', () => {
    expect(findRoute('/')?.titleKey).toBe('home')
    expect(findRoute('/projects')?.titleKey).toBe('projects')
    expect(findRoute('/projects/abc-123')?.titleKey).toBe('project')
    expect(findRoute('/people/p1')?.titleKey).toBe('person')
    expect(findRoute('/print')?.titleKey).toBe('print')
    expect(findRoute('/unknown')).toBeUndefined()
  })

  it('builds encoded detail paths', () => {
    expect(projectPath('a/b')).toBe('/projects/a%2Fb')
    expect(personPath('p1')).toBe('/people/p1')
    expect(findRoute(projectPath('x y'))?.titleKey).toBe('project')
  })
})
