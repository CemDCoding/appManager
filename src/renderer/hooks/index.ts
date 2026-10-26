/** Daten-Hooks (AP-10) auf Basis von `window.api`. */
export { ipcErrorText, type ErrorMessages } from './errors'
export { currencyOptions, latestRatesByCurrency } from './rates'
export { useCollection, type CollectionState } from './useCollection'
export {
  useEntityMutation,
  type EntityMutation,
  type EntityMutationOptions
} from './useEntityMutation'
export { useRates, type RatesState } from './useRates'
export { toSettingsInput, useSettings, type SettingsState } from './useSettings'
export {
  DisplayCurrencyProvider,
  useDisplayCurrency,
  type DisplayCurrencyValue
} from '@/state/DisplayCurrencyProvider'
