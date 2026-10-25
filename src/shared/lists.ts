/**
 * Default lists with stable keys (PE-26, PE-11, PE-34, PE-47).
 * The UI translates keys to display texts; stored data only contains keys.
 */
export const DEFAULT_EXPENSE_CATEGORIES = [
  'hosting',
  'database',
  'domain',
  'storageCdn',
  'softwareLicense',
  'aiSubscription',
  'aiCredit',
  'staff',
  'advertising',
  'storeFee',
  'hardware',
  'other'
] as const

export const DEFAULT_INCOME_CATEGORIES = [
  'storeSales',
  'steam',
  'inAppPurchase',
  'subscription',
  'contract',
  'donation',
  'other'
] as const

export const DEFAULT_PROJECT_PLATFORMS = ['mobile', 'web', 'website', 'desktop', 'steam'] as const

export const DEFAULT_CAMPAIGN_PLATFORMS = [
  'google',
  'meta',
  'tiktok',
  'youtube',
  'x',
  'reddit',
  'linkedin',
  'appleSearchAds',
  'other'
] as const

export const DEFAULT_CAMPAIGN_FORMATS = [
  'search',
  'banner',
  'video',
  'socialPost',
  'story',
  'influencer',
  'other'
] as const

/** Expense category that campaigns count into automatically (PE-26). */
export const ADVERTISING_CATEGORY = 'advertising' as const

export const PROJECT_PHASES = ['idea', 'development', 'live', 'paused', 'discontinued'] as const
export type ProjectPhase = (typeof PROJECT_PHASES)[number]

export type DefaultListName =
  | 'expenseCategories'
  | 'incomeCategories'
  | 'projectPlatforms'
  | 'campaignPlatforms'
  | 'campaignFormats'

export const DEFAULT_LISTS: Record<DefaultListName, readonly string[]> = {
  expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
  incomeCategories: DEFAULT_INCOME_CATEGORIES,
  projectPlatforms: DEFAULT_PROJECT_PLATFORMS,
  campaignPlatforms: DEFAULT_CAMPAIGN_PLATFORMS,
  campaignFormats: DEFAULT_CAMPAIGN_FORMATS
}
