import type { IpcErrorCode } from '@shared/ipc'
import type {
  DEFAULT_CAMPAIGN_FORMATS,
  DEFAULT_CAMPAIGN_PLATFORMS,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_PROJECT_PLATFORMS,
  DefaultListName,
  PROJECT_PHASES
} from '@shared/lists'
import type { Recurrence } from '@shared/schemas/common'
import { defineDictionary, type Dictionary } from './types'

/**
 * Wörterbücher für die stabilen Listen-Schlüssel aus `src/shared/lists.ts` (PE-26, PE-47).
 * Gespeichert werden nur Schlüssel; die Anzeige übersetzt sie hier. Eigene Einträge
 * (PE-54) bringen ihr `label` selbst mit und stehen nicht in diesen Wörterbüchern.
 *
 * @example
 * const t = useT(expenseCategoryDict)
 * t('hosting') // "Hosting/Server"
 */
type Keys<T extends readonly string[]> = T[number]

export const expenseCategoryDict = defineDictionary<Keys<typeof DEFAULT_EXPENSE_CATEGORIES>>(
  {
    hosting: 'Hosting/Server',
    database: 'Datenbank',
    domain: 'Domain',
    storageCdn: 'Storage/CDN',
    softwareLicense: 'Software-Lizenz',
    aiSubscription: 'KI-Abo',
    aiCredit: 'KI-Guthaben',
    staff: 'Mitarbeiter/Freelancer',
    advertising: 'Werbung',
    storeFee: 'Store-/Plattformgebühr',
    hardware: 'Hardware',
    other: 'Sonstiges'
  },
  {
    hosting: 'Hosting/Server',
    database: 'Database',
    domain: 'Domain',
    storageCdn: 'Storage/CDN',
    softwareLicense: 'Software license',
    aiSubscription: 'AI subscription',
    aiCredit: 'AI credit',
    staff: 'Staff/Freelancer',
    advertising: 'Advertising',
    storeFee: 'Store/platform fee',
    hardware: 'Hardware',
    other: 'Other'
  }
)

export const incomeCategoryDict = defineDictionary<Keys<typeof DEFAULT_INCOME_CATEGORIES>>(
  {
    storeSales: 'Store-Verkäufe',
    steam: 'Steam',
    inAppPurchase: 'In-App-Käufe',
    subscription: 'Abonnements',
    contract: 'Auftrag',
    donation: 'Spenden',
    other: 'Sonstiges'
  },
  {
    storeSales: 'Store sales',
    steam: 'Steam',
    inAppPurchase: 'In-app purchases',
    subscription: 'Subscriptions',
    contract: 'Contract work',
    donation: 'Donations',
    other: 'Other'
  }
)

export const projectPlatformDict = defineDictionary<Keys<typeof DEFAULT_PROJECT_PLATFORMS>>(
  { mobile: 'Mobil', web: 'Web-App', website: 'Webseite', desktop: 'Desktop', steam: 'Steam' },
  { mobile: 'Mobile', web: 'Web app', website: 'Website', desktop: 'Desktop', steam: 'Steam' }
)

export const campaignPlatformDict = defineDictionary<Keys<typeof DEFAULT_CAMPAIGN_PLATFORMS>>(
  {
    google: 'Google',
    meta: 'Meta',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    x: 'X',
    reddit: 'Reddit',
    linkedin: 'LinkedIn',
    appleSearchAds: 'Apple Search Ads',
    other: 'Sonstige'
  },
  {
    google: 'Google',
    meta: 'Meta',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    x: 'X',
    reddit: 'Reddit',
    linkedin: 'LinkedIn',
    appleSearchAds: 'Apple Search Ads',
    other: 'Other'
  }
)

export const campaignFormatDict = defineDictionary<Keys<typeof DEFAULT_CAMPAIGN_FORMATS>>(
  {
    search: 'Suchanzeige',
    banner: 'Banner',
    video: 'Video',
    socialPost: 'Social-Post',
    story: 'Story',
    influencer: 'Influencer',
    other: 'Sonstiges'
  },
  {
    search: 'Search ad',
    banner: 'Banner',
    video: 'Video',
    socialPost: 'Social post',
    story: 'Story',
    influencer: 'Influencer',
    other: 'Other'
  }
)

export const projectPhaseDict = defineDictionary<Keys<typeof PROJECT_PHASES>>(
  {
    idea: 'Idee',
    development: 'Entwicklung',
    live: 'Live',
    paused: 'Pausiert',
    discontinued: 'Eingestellt'
  },
  {
    idea: 'Idea',
    development: 'Development',
    live: 'Live',
    paused: 'Paused',
    discontinued: 'Discontinued'
  }
)

export const intervalDict = defineDictionary<Recurrence['interval']>(
  { daily: 'Täglich', weekly: 'Wöchentlich', monthly: 'Monatlich', yearly: 'Jährlich' },
  { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }
)

/** Wörterbuch je Standardliste (für `CategorySelect` und Tabellen-Anzeigen). */
export const LIST_DICTIONARIES: Record<DefaultListName, Dictionary<string>> = {
  expenseCategories: expenseCategoryDict,
  incomeCategories: incomeCategoryDict,
  projectPlatforms: projectPlatformDict,
  campaignPlatforms: campaignPlatformDict,
  campaignFormats: campaignFormatDict
}

/** Texte zu IPC-Fehlercodes (für `useEntityMutation`, `useCollection`, `useSettings`). */
export const ipcErrorDict = defineDictionary<IpcErrorCode>(
  {
    VALIDATION: 'Die Eingaben sind ungültig.',
    NOT_FOUND: 'Der Eintrag wurde nicht gefunden.',
    CONFLICT: 'Der Eintrag steht im Konflikt mit vorhandenen Daten.',
    IN_USE: 'Der Eintrag wird noch verwendet und kann nicht gelöscht werden.',
    IO: 'Die Daten konnten nicht gelesen oder gespeichert werden.',
    INVALID_DATA: 'Die gespeicherten Daten sind ungültig.',
    CANCELLED: 'Abgebrochen.',
    FORBIDDEN: 'Diese Aktion ist nicht erlaubt.',
    INTERNAL: 'Ein unerwarteter Fehler ist aufgetreten.'
  },
  {
    VALIDATION: 'The input is invalid.',
    NOT_FOUND: 'The entry was not found.',
    CONFLICT: 'The entry conflicts with existing data.',
    IN_USE: 'The entry is still in use and cannot be deleted.',
    IO: 'The data could not be read or saved.',
    INVALID_DATA: 'The stored data is invalid.',
    CANCELLED: 'Cancelled.',
    FORBIDDEN: 'This action is not allowed.',
    INTERNAL: 'An unexpected error occurred.'
  }
)

/** Texte der gemeinsamen Form- und Datenbausteine (`components/forms`, `components/data`). */
export const uiDict = defineDictionary(
  {
    amount: 'Betrag',
    currency: 'Währung',
    rateToEur: 'Kurs (1 {currency} = … EUR)',
    rateSuggested: 'Vorschlag aus der Kurstabelle vom {date}',
    rateMissing: 'Für {currency} ist kein Kurs hinterlegt. Bitte Kurs eintragen.',
    rateResetSuggestion: 'Vorschlag übernehmen',
    invalidAmount: 'Bitte einen gültigen Betrag eingeben (höchstens 2 Nachkommastellen).',
    invalidRate: 'Bitte einen gültigen Kurs größer 0 eingeben.',
    invalidCurrency: 'Bitte eine gültige Währung wählen.',
    invalidDate: 'Bitte ein gültiges Datum eingeben.',
    required: 'Pflichtfeld',
    allocation: 'Aufteilung',
    allocationAll: 'Alle aktiven Projekte',
    allocationSelected: 'Ausgewählte Projekte',
    splitEqual: 'Gleichmäßig',
    splitPercent: 'Nach Prozent',
    percentOf: 'Anteil in % für {name}',
    percentSum: 'Summe: {sum}',
    percentSumInvalid: 'Die Prozente müssen zusammen genau 100 % ergeben.',
    invalidPercent: 'Bitte gültige Prozente eingeben (0–100, höchstens 2 Nachkommastellen).',
    noProjectSelected: 'Bitte mindestens ein Projekt auswählen.',
    noActiveProjects: 'Am Stichtag ist kein Projekt aktiv; der Betrag bleibt unverteilt.',
    preview: 'Vorschau',
    previewHint: 'Aufteilung von {amount}',
    previewNeedsAmount: 'Für die Vorschau einen Betrag eingeben.',
    projects: 'Projekte',
    project: 'Projekt',
    selectProject: 'Projekt wählen',
    noProjects: 'Noch keine Projekte angelegt.',
    archived: 'archiviert',
    hiddenEntry: 'ausgeblendet',
    selectPlaceholder: 'Bitte wählen',
    recurrence: 'Wiederholung',
    interval: 'Intervall',
    startDate: 'Start',
    endDate: 'Ende (optional)',
    endBeforeStart: 'Das Ende liegt vor dem Start.',
    priceChanges: 'Preisänderungen',
    priceChangeFrom: 'Ab',
    priceChangeAmount: 'Neuer Betrag ({currency})',
    priceChangeBeforeStart: 'Die Preisänderung liegt vor dem Start.',
    priceChangeDuplicate: 'Für dieses Datum gibt es schon eine Preisänderung.',
    addPriceChange: 'Preisänderung hinzufügen',
    removePriceChange: 'Preisänderung entfernen',
    rating: 'Bewertung',
    ratingStars: '{count} von 5 Sternen',
    ratingClear: 'Keine Bewertung',
    loading: 'Lädt …',
    empty: 'Keine Einträge vorhanden.',
    emptyFiltered: 'Keine Einträge für diesen Filter.',
    sortAscending: 'aufsteigend sortiert',
    sortDescending: 'absteigend sortiert',
    sortBy: 'Nach {column} sortieren',
    retry: 'Erneut versuchen',
    period: 'Zeitraum',
    periodMonth: 'Monat',
    periodQuarter: 'Quartal',
    periodYear: 'Jahr',
    periodCustom: 'Frei',
    periodPrevious: 'Vorheriger Zeitraum',
    periodNext: 'Nächster Zeitraum',
    periodFrom: 'Von',
    periodTo: 'Bis',
    quarterLabel: 'Q{quarter} {year}',
    converted: 'umgerechnet',
    convertedHint: 'Beträge aus EUR mit dem neuesten Kurs in {currency} umgerechnet.',
    displayMissingRate: 'Kein Kurs für {currency}: Beträge können nicht umgerechnet werden.',
    valueUnavailable: 'n. v.',
    saving: 'Speichert …',
    working: 'Bitte warten …'
  },
  {
    amount: 'Amount',
    currency: 'Currency',
    rateToEur: 'Rate (1 {currency} = … EUR)',
    rateSuggested: 'Suggested from the rate table of {date}',
    rateMissing: 'There is no rate for {currency}. Please enter a rate.',
    rateResetSuggestion: 'Use suggestion',
    invalidAmount: 'Please enter a valid amount (at most 2 decimals).',
    invalidRate: 'Please enter a valid rate greater than 0.',
    invalidCurrency: 'Please choose a valid currency.',
    invalidDate: 'Please enter a valid date.',
    required: 'Required',
    allocation: 'Allocation',
    allocationAll: 'All active projects',
    allocationSelected: 'Selected projects',
    splitEqual: 'Equal',
    splitPercent: 'By percent',
    percentOf: 'Share in % for {name}',
    percentSum: 'Total: {sum}',
    percentSumInvalid: 'The percentages must add up to exactly 100%.',
    invalidPercent: 'Please enter valid percentages (0–100, at most 2 decimals).',
    noProjectSelected: 'Please select at least one project.',
    noActiveProjects: 'No project is active on that day; the amount stays unallocated.',
    preview: 'Preview',
    previewHint: 'Split of {amount}',
    previewNeedsAmount: 'Enter an amount to see the preview.',
    projects: 'Projects',
    project: 'Project',
    selectProject: 'Choose project',
    noProjects: 'No projects yet.',
    archived: 'archived',
    hiddenEntry: 'hidden',
    selectPlaceholder: 'Please choose',
    recurrence: 'Recurrence',
    interval: 'Interval',
    startDate: 'Start',
    endDate: 'End (optional)',
    endBeforeStart: 'The end is before the start.',
    priceChanges: 'Price changes',
    priceChangeFrom: 'From',
    priceChangeAmount: 'New amount ({currency})',
    priceChangeBeforeStart: 'The price change is before the start.',
    priceChangeDuplicate: 'There is already a price change on this date.',
    addPriceChange: 'Add price change',
    removePriceChange: 'Remove price change',
    rating: 'Rating',
    ratingStars: '{count} of 5 stars',
    ratingClear: 'No rating',
    loading: 'Loading …',
    empty: 'No entries yet.',
    emptyFiltered: 'No entries match this filter.',
    sortAscending: 'sorted ascending',
    sortDescending: 'sorted descending',
    sortBy: 'Sort by {column}',
    retry: 'Try again',
    period: 'Period',
    periodMonth: 'Month',
    periodQuarter: 'Quarter',
    periodYear: 'Year',
    periodCustom: 'Custom',
    periodPrevious: 'Previous period',
    periodNext: 'Next period',
    periodFrom: 'From',
    periodTo: 'To',
    quarterLabel: 'Q{quarter} {year}',
    converted: 'converted',
    convertedHint: 'Amounts converted from EUR to {currency} with the newest rate.',
    displayMissingRate: 'No rate for {currency}: amounts cannot be converted.',
    valueUnavailable: 'n/a',
    saving: 'Saving …',
    working: 'Please wait …'
  }
)

export type UiKey = keyof typeof uiDict.de
