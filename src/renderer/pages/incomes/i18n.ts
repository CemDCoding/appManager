import { defineDictionary } from '@/i18n/types'

/** Texte der Einnahmen-Seite (AP-14). */
export const incomesPageDict = defineDictionary(
  {
    title: 'Einnahmen',
    intro:
      'Einnahmen netto, je einem Projekt zugeordnet. Wiederkehrende Posten erscheinen an jedem Fälligkeitstag.',
    add: 'Einnahme erfassen',
    caption: 'Einnahmen im gewählten Zeitraum'
  },
  {
    title: 'Incomes',
    intro: 'Net incomes, each assigned to one project. Recurring items appear on every due date.',
    add: 'Add income',
    caption: 'Incomes in the selected period'
  }
)
