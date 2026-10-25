import type { ComponentType } from 'react'
import { matchPath } from 'react-router-dom'
import {
  ChartColumn,
  FileText,
  House,
  Megaphone,
  Server,
  Settings,
  TrendingDown,
  TrendingUp,
  Users,
  UsersRound,
  FolderKanban,
  type LucideIcon
} from 'lucide-react'
import type { NavKey } from '@/i18n'
import { CampaignsPage } from '@/pages/campaigns'
import { ExpensesPage } from '@/pages/expenses'
import { HomePage } from '@/pages/home'
import { IncomesPage } from '@/pages/incomes'
import { MetricsPage } from '@/pages/metrics'
import { PeoplePage, PersonDetailPage } from '@/pages/people'
import { PrintPage } from '@/pages/print'
import { ProjectDetailPage, ProjectsPage } from '@/pages/projects'
import { ReportsPage } from '@/pages/reports'
import { ServicesPage } from '@/pages/services'
import { SettingsPage } from '@/pages/settings'
import { StatsPage } from '@/pages/stats'

/** Alle Pfade der App (HashRouter). */
export const PATHS = {
  home: '/',
  projects: '/projects',
  project: '/projects/:id',
  services: '/services',
  expenses: '/expenses',
  incomes: '/incomes',
  people: '/people',
  person: '/people/:id',
  campaigns: '/campaigns',
  metrics: '/metrics',
  stats: '/stats',
  reports: '/reports',
  settings: '/settings',
  print: '/print'
} as const

export interface AppRoute {
  path: string
  /** Schlüssel im `nav`-Wörterbuch (Seitentitel, Navigation). */
  titleKey: NavKey
  component: ComponentType
  /** Icon für die Seitenleiste; ohne Icon erscheint die Route nicht dort. */
  icon?: LucideIcon
  /** Route im Grundlayout (Seitenleiste + Kopfzeile); `false` z. B. für die Druckansicht. */
  withLayout: boolean
  /** Sichtbar im Menü (Detailseiten nicht; dort ist der übergeordnete Eintrag aktiv). */
  inNav: boolean
}

/** Routen- und Navigationsliste (§8 Regel 7). Fachpakete ersetzen nur ihre Seiten. */
export const routes: readonly AppRoute[] = [
  {
    path: PATHS.home,
    titleKey: 'home',
    component: HomePage,
    icon: House,
    withLayout: true,
    inNav: true
  },
  {
    path: PATHS.projects,
    titleKey: 'projects',
    component: ProjectsPage,
    icon: FolderKanban,
    withLayout: true,
    inNav: true
  },
  {
    path: PATHS.project,
    titleKey: 'project',
    component: ProjectDetailPage,
    withLayout: true,
    inNav: false
  },
  {
    path: PATHS.services,
    titleKey: 'services',
    component: ServicesPage,
    icon: Server,
    withLayout: true,
    inNav: true
  },
  {
    path: PATHS.expenses,
    titleKey: 'expenses',
    component: ExpensesPage,
    icon: TrendingDown,
    withLayout: true,
    inNav: true
  },
  {
    path: PATHS.incomes,
    titleKey: 'incomes',
    component: IncomesPage,
    icon: TrendingUp,
    withLayout: true,
    inNav: true
  },
  {
    path: PATHS.people,
    titleKey: 'people',
    component: PeoplePage,
    icon: Users,
    withLayout: true,
    inNav: true
  },
  {
    path: PATHS.person,
    titleKey: 'person',
    component: PersonDetailPage,
    withLayout: true,
    inNav: false
  },
  {
    path: PATHS.campaigns,
    titleKey: 'campaigns',
    component: CampaignsPage,
    icon: Megaphone,
    withLayout: true,
    inNav: true
  },
  {
    path: PATHS.metrics,
    titleKey: 'metrics',
    component: MetricsPage,
    icon: UsersRound,
    withLayout: true,
    inNav: true
  },
  {
    path: PATHS.stats,
    titleKey: 'stats',
    component: StatsPage,
    icon: ChartColumn,
    withLayout: true,
    inNav: true
  },
  {
    path: PATHS.reports,
    titleKey: 'reports',
    component: ReportsPage,
    icon: FileText,
    withLayout: true,
    inNav: true
  },
  {
    path: PATHS.settings,
    titleKey: 'settings',
    component: SettingsPage,
    icon: Settings,
    withLayout: true,
    inNav: true
  },
  { path: PATHS.print, titleKey: 'print', component: PrintPage, withLayout: false, inNav: false }
]

export const navRoutes: readonly AppRoute[] = routes.filter((route) => route.inNav)

/** Findet die Route zu einem Pfad (z. B. für den Seitentitel). */
export function findRoute(pathname: string): AppRoute | undefined {
  return routes.find((route) => matchPath({ path: route.path, end: true }, pathname) !== null)
}

/** Pfad zur Projekt-Detailseite. */
export function projectPath(id: string): string {
  return `/projects/${encodeURIComponent(id)}`
}

/** Pfad zur Personen-Detailseite. */
export function personPath(id: string): string {
  return `/people/${encodeURIComponent(id)}`
}
