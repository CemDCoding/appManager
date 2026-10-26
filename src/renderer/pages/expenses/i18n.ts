import { defineDictionary } from '@/i18n/types'

/** Texte der Ausgaben-Seite (AP-14). */
export const expensesPageDict = defineDictionary(
  {
    title: 'Ausgaben',
    intro:
      'Alle Ausgaben inklusive KI-Abos und KI-Guthaben. Wiederkehrende Posten erscheinen an jedem Fälligkeitstag.',
    add: 'Ausgabe erfassen',
    caption: 'Ausgaben im gewählten Zeitraum'
  },
  {
    title: 'Expenses',
    intro:
      'All expenses including AI subscriptions and AI credit. Recurring items appear on every due date.',
    add: 'Add expense',
    caption: 'Expenses in the selected period'
  }
)
