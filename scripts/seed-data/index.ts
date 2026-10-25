/**
 * Fixed, fully invented seed dataset (AP-08, PE-18). Pure data, no I/O, no randomness:
 * ids and timestamps are constants, so every call returns the same content.
 * Only service providers (Railway, Vercel, Supabase) are real names; everything else is fictional.
 */
import type { CollectionName, EntityMap } from '@shared/collections'
import type { Allocation } from '@shared/schemas/common'

export type SeedData = { [K in CollectionName]: EntityMap[K][] }

const STAMP = '2026-01-01T00:00:00.000Z'

/** Deterministic valid UUID (v4 layout): group 1 encodes the kind, the tail the running number. */
function uid(kind: number, n: number): string {
  const a = kind.toString(16).padStart(8, '0')
  const d = n.toString(16).padStart(12, '0')
  return `${a}-0000-4000-8000-${d}`
}

const base = (kind: number, n: number) => ({
  id: uid(kind, n),
  ownerId: 'local' as const,
  createdAt: STAMP,
  updatedAt: STAMP
})

const P = [uid(1, 1), uid(1, 2), uid(1, 3), uid(1, 4)] as const
const S = [uid(2, 1), uid(2, 2), uid(2, 3), uid(2, 4), uid(2, 5)] as const
const PERSON = [uid(3, 1), uid(3, 2), uid(3, 3)] as const

const all: Allocation = { mode: 'all', split: 'equal', shares: [] }
const equal = (...ids: string[]): Allocation => ({
  mode: 'selected',
  split: 'equal',
  shares: ids.map((projectId) => ({ projectId, percentBasisPoints: 0 }))
})
const percent = (...parts: [string, number][]): Allocation => ({
  mode: 'selected',
  split: 'percent',
  shares: parts.map(([projectId, percentBasisPoints]) => ({ projectId, percentBasisPoints }))
})

const eur = (cents: number) => ({ amount: { cents, currency: 'EUR' }, rateToEur: '1' })
const usd = (cents: number) => ({ amount: { cents, currency: 'USD' }, rateToEur: '0.92' })

function buildProjects(): SeedData['projects'] {
  return [
    {
      ...base(1, 1),
      name: 'Demo Notes',
      description: 'Invented note-taking app for testing.',
      platforms: ['mobile', 'web'],
      phase: 'live',
      startDate: '2025-03-01',
      links: [{ label: 'Website', url: 'https://example.com/demo-notes' }],
      archived: false
    },
    {
      ...base(1, 2),
      name: 'Demo Quest',
      description: 'Invented game in development.',
      platforms: ['steam', 'desktop'],
      phase: 'development',
      startDate: '2025-09-15',
      links: [],
      archived: false
    },
    {
      ...base(1, 3),
      name: 'Demo Planner',
      description: 'Invented planning web app.',
      platforms: ['web'],
      phase: 'live',
      startDate: '2025-06-01',
      links: [{ label: 'Docs', url: 'https://example.com/demo-planner/docs' }],
      archived: false
    },
    {
      ...base(1, 4),
      name: 'Demo Legacy',
      description: 'Invented discontinued project.',
      platforms: ['website'],
      phase: 'discontinued',
      startDate: '2024-01-10',
      endDate: '2025-11-30',
      links: [],
      archived: true
    }
  ]
}

function buildServices(): SeedData['services'] {
  return [
    {
      ...base(2, 1),
      provider: 'Railway',
      purpose: 'Backend hosting (shared by two projects)',
      plan: 'Hobby',
      url: 'https://railway.com',
      note: '',
      allocation: percent([P[0], 6000], [P[1], 4000])
    },
    {
      ...base(2, 2),
      provider: 'Vercel',
      purpose: 'Web frontend hosting',
      plan: 'Pro',
      url: 'https://vercel.com',
      note: '',
      allocation: equal(P[0])
    },
    {
      ...base(2, 3),
      provider: 'Supabase',
      purpose: 'Database and auth for all projects',
      plan: 'Pro',
      url: 'https://supabase.com',
      note: 'Invented test note.',
      allocation: all
    },
    {
      ...base(2, 4),
      provider: 'Example Registrar',
      purpose: 'Domain registration',
      plan: 'Standard',
      note: '',
      allocation: equal(P[0])
    },
    {
      ...base(2, 5),
      provider: 'Example CDN Co',
      purpose: 'Asset delivery',
      plan: 'Basic',
      note: '',
      allocation: equal(P[2])
    }
  ]
}

function buildPersons(): SeedData['persons'] {
  return [
    { ...base(3, 1), name: 'Coder A', role: 'Developer', status: 'active', note: '' },
    { ...base(3, 2), name: 'Designer B', role: 'Designer', status: 'active', note: '' },
    { ...base(3, 3), name: 'Tester C', role: 'QA', status: 'inactive', note: 'Invented person.' }
  ]
}

function buildExpenses(): SeedData['expenses'] {
  const monthly = (startDate: string) => ({
    interval: 'monthly' as const,
    startDate,
    priceChanges: [] as { fromDate: string; cents: number }[]
  })
  return [
    {
      ...base(4, 1),
      kind: 'recurring',
      category: 'hosting',
      ...eur(1000),
      allocation: percent([P[0], 6000], [P[1], 4000]),
      description: 'Railway plan',
      serviceId: S[0],
      recurrence: {
        ...monthly('2025-04-01'),
        priceChanges: [{ fromDate: '2026-02-01', cents: 1200 }]
      }
    },
    {
      ...base(4, 2),
      kind: 'recurring',
      category: 'hosting',
      ...usd(2000),
      allocation: equal(P[0]),
      description: 'Vercel Pro (USD)',
      serviceId: S[1],
      recurrence: monthly('2025-04-01')
    },
    {
      ...base(4, 3),
      kind: 'recurring',
      category: 'database',
      ...eur(2500),
      allocation: all,
      description: 'Supabase Pro',
      serviceId: S[2],
      recurrence: monthly('2025-05-01')
    },
    {
      ...base(4, 4),
      kind: 'recurring',
      category: 'domain',
      ...eur(1500),
      allocation: equal(P[0]),
      description: 'Domain renewal',
      serviceId: S[3],
      recurrence: { interval: 'yearly', startDate: '2025-03-01', priceChanges: [] }
    },
    {
      ...base(4, 5),
      kind: 'recurring',
      category: 'aiSubscription',
      ...usd(2000),
      allocation: all,
      description: 'AI assistant subscription',
      recurrence: monthly('2025-07-01')
    },
    {
      ...base(4, 6),
      kind: 'oneTime',
      category: 'aiCredit',
      ...usd(5000),
      allocation: all,
      description: 'AI API credit top-up',
      date: '2026-03-10'
    },
    {
      ...base(4, 7),
      kind: 'oneTime',
      category: 'hardware',
      ...eur(129900),
      allocation: equal(P[1]),
      description: 'Test laptop',
      date: '2025-10-05'
    },
    {
      ...base(4, 8),
      kind: 'recurring',
      category: 'storeFee',
      ...eur(9900),
      allocation: equal(P[0]),
      description: 'Developer program fee',
      recurrence: { interval: 'yearly', startDate: '2025-03-15', priceChanges: [] }
    },
    {
      ...base(4, 9),
      kind: 'oneTime',
      category: 'staff',
      ...eur(40000),
      allocation: equal(P[0]),
      description: 'Contract work, milestone 1',
      personId: PERSON[0],
      date: '2025-12-15'
    },
    {
      ...base(4, 10),
      kind: 'oneTime',
      category: 'staff',
      ...eur(25000),
      allocation: percent([P[1], 5000], [P[2], 5000]),
      description: 'Design work',
      personId: PERSON[1],
      date: '2026-01-20'
    },
    {
      ...base(4, 11),
      kind: 'recurring',
      category: 'staff',
      ...eur(30000),
      allocation: percent([P[0], 7000], [P[2], 3000]),
      description: 'Monthly retainer',
      personId: PERSON[0],
      recurrence: monthly('2026-02-01')
    },
    {
      ...base(4, 12),
      kind: 'oneTime',
      category: 'softwareLicense',
      ...eur(4900),
      allocation: equal(P[2]),
      description: 'Design tool license',
      date: '2026-02-12'
    },
    {
      ...base(4, 13),
      kind: 'oneTime',
      category: 'other',
      ...eur(1990),
      allocation: equal(P[3]),
      description: 'Shutdown housekeeping',
      date: '2025-11-30'
    },
    {
      ...base(4, 14),
      kind: 'recurring',
      category: 'storageCdn',
      ...eur(500),
      allocation: equal(P[2]),
      description: 'CDN plan',
      serviceId: S[4],
      recurrence: monthly('2025-06-01')
    },
    {
      ...base(4, 15),
      kind: 'oneTime',
      category: 'staff',
      ...eur(35000),
      allocation: equal(P[2]),
      description: 'Contract work, QA round',
      personId: PERSON[2],
      date: '2025-09-30'
    }
  ]
}

function buildIncomes(): SeedData['incomes'] {
  const rec = (startDate: string) => ({
    interval: 'monthly' as const,
    startDate,
    priceChanges: [] as { fromDate: string; cents: number }[]
  })
  return [
    {
      ...base(5, 1),
      kind: 'recurring',
      category: 'subscription',
      ...eur(19900),
      projectId: P[0],
      description: 'Subscriptions (net)',
      recurrence: rec('2025-05-01')
    },
    {
      ...base(5, 2),
      kind: 'recurring',
      category: 'storeSales',
      ...usd(8000),
      projectId: P[0],
      description: 'Store payout (USD)',
      recurrence: rec('2025-06-01')
    },
    {
      ...base(5, 3),
      kind: 'oneTime',
      category: 'contract',
      ...eur(150000),
      projectId: P[2],
      description: 'Customization contract',
      date: '2026-01-31'
    },
    {
      ...base(5, 4),
      kind: 'oneTime',
      category: 'donation',
      ...eur(2500),
      projectId: P[0],
      description: 'Donation',
      date: '2026-02-14'
    },
    {
      ...base(5, 5),
      kind: 'oneTime',
      category: 'steam',
      ...eur(45000),
      projectId: P[1],
      description: 'Early access payout',
      date: '2026-03-20'
    },
    {
      ...base(5, 6),
      kind: 'recurring',
      category: 'inAppPurchase',
      ...eur(7500),
      projectId: P[2],
      description: 'In-app purchases',
      recurrence: { ...rec('2025-09-01'), endDate: '2026-03-31' }
    }
  ]
}

function buildCampaigns(): SeedData['campaigns'] {
  return [
    {
      ...base(6, 1),
      name: 'Spring Search Push',
      platform: 'google',
      format: 'search',
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      cost: { cents: 30000, currency: 'EUR' },
      rateToEur: '1',
      allocation: equal(P[0]),
      impressions: 120000,
      clicks: 3400,
      usersGained: 410,
      rating: 4,
      note: ''
    },
    {
      ...base(6, 2),
      name: 'Social Video Test',
      platform: 'meta',
      format: 'video',
      startDate: '2026-02-01',
      endDate: '2026-02-14',
      cost: { cents: 15000, currency: 'USD' },
      rateToEur: '0.92',
      allocation: all,
      impressions: 80000,
      clicks: 1200,
      usersGained: 95,
      rating: 2,
      note: 'Invented test campaign.'
    },
    {
      ...base(6, 3),
      name: 'Creator Shoutout',
      platform: 'youtube',
      format: 'influencer',
      startDate: '2026-04-05',
      endDate: '2026-04-05',
      cost: { cents: 50000, currency: 'EUR' },
      rateToEur: '1',
      allocation: percent([P[1], 5000], [P[2], 5000]),
      impressions: 0,
      clicks: 0,
      usersGained: 0,
      rating: 0,
      note: ''
    }
  ]
}

function buildExchangeRates(): SeedData['exchangeRates'] {
  return [
    { ...base(7, 1), currency: 'USD', rate: '0.9', enteredOn: '2025-04-01' },
    { ...base(7, 2), currency: 'USD', rate: '0.92', enteredOn: '2026-01-15' }
  ]
}

function buildGoals(): SeedData['goals'] {
  return [
    {
      ...base(8, 1),
      projectId: P[0],
      kind: 'revenue',
      title: 'Reach 5000 EUR revenue',
      targetValue: 500000,
      fromDate: '2026-01-01',
      dueDate: '2026-12-31',
      done: false
    },
    { ...base(8, 2), projectId: P[2], kind: 'breakEven', title: 'Break even', done: false },
    {
      ...base(8, 3),
      projectId: null,
      kind: 'costLimit',
      title: 'Monthly cost limit',
      targetValue: 150000,
      done: false
    },
    {
      ...base(8, 4),
      projectId: P[1],
      kind: 'free',
      title: 'Release demo build',
      dueDate: '2026-09-30',
      done: true
    }
  ]
}

function buildUserMetrics(): SeedData['userMetrics'] {
  const months = ['2025-11-30', '2025-12-31', '2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']
  const out: SeedData['userMetrics'] = []
  months.forEach((date, i) => {
    out.push({
      ...base(9, i + 1),
      projectId: P[0],
      date,
      usersTotal: 1000 + i * 250,
      usersActive: 400 + i * 120,
      usersPaying: 40 + i * 15,
      perPlatform: [
        { platform: 'mobile', users: 700 + i * 150 },
        { platform: 'web', users: 300 + i * 100 }
      ]
    })
    out.push({
      ...base(9, i + 7),
      projectId: P[2],
      date,
      usersTotal: 200 + i * 60,
      usersActive: 90 + i * 25,
      usersPaying: 10 + i * 4
    })
  })
  return out
}

function buildSettings(): SeedData['settings'] {
  const empty = { custom: [], hiddenDefaults: [] }
  return [
    {
      ...base(10, 1),
      displayCurrency: 'EUR',
      expenseCategories: { custom: [{ key: 'coffee', label: 'Coffee', hidden: false }], hiddenDefaults: [] },
      incomeCategories: empty,
      projectPlatforms: empty,
      campaignPlatforms: empty,
      campaignFormats: empty
    }
  ]
}

/** Builds the complete dataset. Pure and deterministic. */
export function buildSeedData(): SeedData {
  return {
    projects: buildProjects(),
    services: buildServices(),
    persons: buildPersons(),
    expenses: buildExpenses(),
    incomes: buildIncomes(),
    campaigns: buildCampaigns(),
    exchangeRates: buildExchangeRates(),
    goals: buildGoals(),
    userMetrics: buildUserMetrics(),
    settings: buildSettings()
  }
}
