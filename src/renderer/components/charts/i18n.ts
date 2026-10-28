import { defineDictionary } from '@/i18n'

/** Texte der Diagramm-Bausteine (PE-47). */
export const chartsDict = defineDictionary(
  {
    income: 'Einnahmen',
    expenses: 'Ausgaben',
    balance: 'Saldo',
    other: 'Sonstige',
    month: 'Monat',
    category: 'Kategorie',
    value: 'Wert',
    pointInTime: 'Zeitpunkt',
    share: 'Anteil',
    noData: 'Keine Daten für das Diagramm.'
  },
  {
    income: 'Income',
    expenses: 'Expenses',
    balance: 'Balance',
    other: 'Other',
    month: 'Month',
    category: 'Category',
    value: 'Value',
    pointInTime: 'Point in time',
    share: 'Share',
    noData: 'No data for this chart.'
  }
)

export type ChartsKey = keyof typeof chartsDict.de
