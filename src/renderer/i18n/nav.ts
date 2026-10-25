import { defineDictionary } from './types'

/** Namen der Bereiche (Seitenleiste und Seitentitel). */
export const nav = defineDictionary(
  {
    home: 'Start',
    projects: 'Projekte',
    project: 'Projekt',
    services: 'Dienste',
    expenses: 'Ausgaben',
    incomes: 'Einnahmen',
    people: 'Personen',
    person: 'Person',
    campaigns: 'Kampagnen',
    metrics: 'Nutzerzahlen',
    stats: 'Statistik',
    reports: 'Berichte',
    settings: 'Einstellungen',
    print: 'Druckansicht',
    transfer: 'Export und Import'
  },
  {
    home: 'Home',
    projects: 'Projects',
    project: 'Project',
    services: 'Services',
    expenses: 'Expenses',
    incomes: 'Income',
    people: 'People',
    person: 'Person',
    campaigns: 'Campaigns',
    metrics: 'User numbers',
    stats: 'Statistics',
    reports: 'Reports',
    settings: 'Settings',
    print: 'Print view',
    transfer: 'Export and import'
  }
)

export type NavKey = keyof typeof nav.de
