import { defineDictionary } from './types'

/** Allgemeine Texte, die viele Bereiche brauchen. */
export const common = defineDictionary(
  {
    appName: 'appManager',
    comingSoon: 'folgt',
    comingSoonHint: 'Dieser Bereich wird in einem späteren Schritt umgesetzt.',
    save: 'Speichern',
    cancel: 'Abbrechen',
    close: 'Schließen',
    delete: 'Löschen',
    edit: 'Bearbeiten',
    add: 'Hinzufügen',
    confirm: 'Bestätigen',
    language: 'Sprache',
    languageDe: 'Deutsch',
    languageEn: 'English',
    theme: 'Darstellung',
    themeLight: 'Hell',
    themeDark: 'Dunkel',
    themeSystem: 'System',
    displayCurrency: 'Anzeigewährung',
    mainNavigation: 'Hauptnavigation',
    skipToContent: 'Zum Inhalt springen',
    notFound: 'Seite nicht gefunden'
  },
  {
    appName: 'appManager',
    comingSoon: 'coming soon',
    comingSoonHint: 'This area will be implemented in a later step.',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    confirm: 'Confirm',
    language: 'Language',
    languageDe: 'Deutsch',
    languageEn: 'English',
    theme: 'Appearance',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    displayCurrency: 'Display currency',
    mainNavigation: 'Main navigation',
    skipToContent: 'Skip to content',
    notFound: 'Page not found'
  }
)

export type CommonKey = keyof typeof common.de
