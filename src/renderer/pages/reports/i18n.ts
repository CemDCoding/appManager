import { defineDictionary } from '@/i18n'

/** Texte der Berichtsseite (AP-24). */
export const reportsDict = defineDictionary(
  {
    intro:
      'Erstellt einen PDF-Bericht mit denselben Kennzahlen, Diagrammen und Tabellen wie die App.',
    scope: 'Bereich',
    scopePortfolio: 'Portfolio (alle Projekte)',
    scopeProject: 'Einzelnes Projekt',
    project: 'Projekt',
    language: 'Sprache des Berichts',
    languageDe: 'Deutsch',
    languageEn: 'Englisch',
    currency: 'Anzeigewährung',
    create: 'PDF erstellen',
    creating: 'PDF wird erstellt …',
    saved: 'PDF gespeichert.',
    cancelled: 'Speichern abgebrochen.',
    failed: 'PDF konnte nicht erstellt werden',
    projectRequired: 'Bitte ein Projekt wählen.',
    invalidPeriod: 'Bitte einen gültigen Zeitraum wählen.',
    invalid: 'Bitte die Eingaben prüfen.',
    saveHint: 'Der Speicherort wird nach dem Erstellen in einem Dialog gewählt.'
  },
  {
    intro: 'Creates a PDF report with the same figures, charts and tables as the app.',
    scope: 'Scope',
    scopePortfolio: 'Portfolio (all projects)',
    scopeProject: 'Single project',
    project: 'Project',
    language: 'Report language',
    languageDe: 'German',
    languageEn: 'English',
    currency: 'Display currency',
    create: 'Create PDF',
    creating: 'Creating PDF …',
    saved: 'PDF saved.',
    cancelled: 'Saving cancelled.',
    failed: 'The PDF could not be created',
    projectRequired: 'Please choose a project.',
    invalidPeriod: 'Please choose a valid period.',
    invalid: 'Please check your input.',
    saveHint: 'You choose where to save it in a dialog after it has been created.'
  }
)
