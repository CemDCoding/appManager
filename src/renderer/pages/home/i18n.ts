import { defineDictionary } from '@/i18n'

export const homeDict = defineDictionary(
  {
    title: 'Übersicht',
    income: 'Einnahmen',
    expenses: 'Ausgaben',
    balance: 'Saldo',
    fixedCosts: 'Fixkosten/Monat',
    fixedCostsHint: 'Stand {date}',
    projectsBySaldo: 'Projekte nach Saldo',
    project: 'Projekt',
    unallocatedName: 'Nicht zuordenbar',
    noProjects: 'Noch keine Projekte vorhanden.',
    unallocatedWarning:
      '{count} Buchung(en) konnten keinem aktiven Projekt zugeordnet werden. Sie zählen im Gesamtergebnis, erscheinen aber unter „Nicht zuordenbar“.',
    ledgerErrors:
      '{count} Buchung(en) konnten nicht umgerechnet werden und fehlen in den Summen (Kurs prüfen).',
    fixedCostErrors:
      '{count} wiederkehrende Ausgabe(n) konnten nicht umgerechnet werden und fehlen in den Fixkosten.',
    invalidPeriod: 'Der Zeitraum ist ungültig (Von darf nicht nach Bis liegen).',
    loadFailed: 'Daten konnten nicht geladen werden.'
  },
  {
    title: 'Overview',
    income: 'Income',
    expenses: 'Expenses',
    balance: 'Balance',
    fixedCosts: 'Fixed costs/month',
    fixedCostsHint: 'As of {date}',
    projectsBySaldo: 'Projects by balance',
    project: 'Project',
    unallocatedName: 'Unallocated',
    noProjects: 'No projects yet.',
    unallocatedWarning:
      '{count} booking(s) could not be assigned to an active project. They count in the total but appear under "Unallocated".',
    ledgerErrors:
      '{count} booking(s) could not be converted and are missing from the totals (check the rate).',
    fixedCostErrors:
      '{count} recurring expense(s) could not be converted and are missing from the fixed costs.',
    invalidPeriod: 'The period is invalid (From must not be after To).',
    loadFailed: 'Data could not be loaded.'
  }
)
