import { defineDictionary } from '@/i18n'

/** Texte der Ledger-Hinweise (Texte unverändert aus `pages/projects`, AP-33). */
export const ledgerDict = defineDictionary(
  {
    ledgerErrors: '{count} Buchung(en) konnten nicht umgerechnet werden und fehlen in den Summen.',
    fixedErrors:
      '{count} wiederkehrende Ausgabe(n) konnten nicht umgerechnet werden und fehlen bei den Fixkosten.'
  },
  {
    ledgerErrors: '{count} booking(s) could not be converted and are missing from the totals.',
    fixedErrors:
      '{count} recurring expense(s) could not be converted and are missing from the fixed costs.'
  }
)

export type LedgerKey = keyof (typeof ledgerDict)['de']
