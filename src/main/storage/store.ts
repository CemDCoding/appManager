import type { z } from 'zod'
import {
  COLLECTIONS,
  COLLECTION_NAMES,
  type CollectionName,
  type EntityCollectionName,
  type EntityMap
} from '@shared/collections'
import type { SettingsInput } from '@shared/ipc'
import { DEFAULT_LISTS, type DefaultListName } from '@shared/lists'
import { BASE_CURRENCY } from '@shared/money'
import { BASE_KEYS, LOCAL_OWNER } from '@shared/schemas/common'
import type { Allocation } from '@shared/schemas/common'
import type { ListSetting, Settings } from '@shared/schemas/settings'
import type { AtomicFs } from './atomic'
import { StorageError, silentLogger, type SafeLogger } from './errors'
import { CollectionRepository, type RepositoryStatus } from './repository'

export interface StoreDeps {
  /** Current time (injected for tests). */
  now: () => Date
  /** New UUID (injected for tests). */
  newId: () => string
  fs?: AtomicFs
  log?: SafeLogger
}

type Repos = { [C in CollectionName]: CollectionRepository<C> }

const LIST_NAMES = Object.keys(DEFAULT_LISTS) as DefaultListName[]

/** Prefix used in CONFLICT messages for the PE-35 delete rule (no IN_USE code in the contract). */
export const IN_USE_PREFIX = 'IN_USE'

function validationMessage(collection: string, error: z.ZodError): string {
  const first = error.issues[0]
  const where = first ? first.path.join('.') : ''
  return `${collection}: ${first?.message ?? 'invalid'}${where ? ` (${where})` : ''}`
}

function stripBaseKeys(data: Record<string, unknown>): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...data }
  for (const key of BASE_KEYS) delete copy[key]
  return copy
}

function allocationUses(allocation: Allocation, projectId: string): boolean {
  return allocation.shares.some((s) => s.projectId === projectId)
}

/**
 * All collections of one data folder. Each collection is its own file with its
 * own write queue; mutations of the store are additionally serialised so that
 * cross-collection rules (PE-35) see a consistent state.
 */
export class DataStore {
  readonly dir: string
  private readonly repos: Repos
  private readonly deps: StoreDeps
  private readonly log: SafeLogger
  private lock: Promise<unknown> = Promise.resolve()

  constructor(dir: string, deps: StoreDeps) {
    this.dir = dir
    this.deps = deps
    this.log = deps.log ?? silentLogger
    const opts = { fs: deps.fs, log: this.log }
    const repos: Partial<Record<CollectionName, CollectionRepository<CollectionName>>> = {}
    for (const name of COLLECTION_NAMES) {
      repos[name] = new CollectionRepository(dir, name, opts)
    }
    this.repos = repos as Repos
  }

  private repo<C extends CollectionName>(name: C): CollectionRepository<C> {
    return this.repos[name]
  }

  /** Loads all collections. Broken files are reported via `statuses()`, never repaired. */
  async loadAll(): Promise<void> {
    await this.exclusive(() => this.reloadUnlocked())
  }

  private async reloadUnlocked(): Promise<void> {
    await Promise.all(COLLECTION_NAMES.map((n) => this.repos[n].load()))
    const settings = this.repo('settings')
    if (settings.status.state === 'ok' && settings.items().length > 1) {
      settings.markInvalid('settings.json must contain exactly one item')
    }
  }

  statuses(): Record<CollectionName, RepositoryStatus> {
    const result = {} as Record<CollectionName, RepositoryStatus>
    for (const name of COLLECTION_NAMES) result[name] = this.repos[name].status
    return result
  }

  // ---------- entities ----------

  async list<C extends EntityCollectionName>(collection: C): Promise<EntityMap[C][]> {
    return this.repo(collection).items()
  }

  async get<C extends EntityCollectionName>(collection: C, id: string): Promise<EntityMap[C]> {
    const item = this.repo(collection)
      .items()
      .find((e) => e.id === id)
    if (!item) throw new StorageError('NOT_FOUND', `${collection}: not found`)
    return item
  }

  async create<C extends EntityCollectionName>(
    collection: C,
    data: Record<string, unknown>
  ): Promise<EntityMap[C]> {
    return this.exclusive(async () => {
      const now = this.deps.now().toISOString()
      const entity = this.parseEntity(collection, {
        ...stripBaseKeys(data),
        id: this.deps.newId(),
        ownerId: LOCAL_OWNER,
        createdAt: now,
        updatedAt: now
      })
      return this.repo(collection).update((items) => {
        if (items.some((e) => e.id === entity.id)) {
          throw new StorageError('CONFLICT', `${collection}: id already exists`)
        }
        return { items: [...items, entity], result: entity }
      })
    })
  }

  async update<C extends EntityCollectionName>(
    collection: C,
    id: string,
    data: Record<string, unknown>
  ): Promise<EntityMap[C]> {
    return this.exclusive(async () =>
      this.repo(collection).update((items) => {
        const index = items.findIndex((e) => e.id === id)
        const existing = items[index]
        if (!existing) throw new StorageError('NOT_FOUND', `${collection}: not found`)
        const entity = this.parseEntity(collection, {
          ...stripBaseKeys(data),
          id: existing.id,
          ownerId: existing.ownerId,
          createdAt: existing.createdAt,
          updatedAt: this.deps.now().toISOString()
        })
        const next = [...items]
        next[index] = entity
        return { items: next, result: entity }
      })
    )
  }

  /**
   * Delete rules (PE-35):
   * - projects: only without references, otherwise CONFLICT "IN_USE ...".
   * - services: `cascade` also deletes expenses with this serviceId; without
   *   it the expenses stay (dangling serviceId, like deleted persons).
   * - persons: expenses keep their personId ("deleted person").
   * - exchangeRates: never deleted (history), FORBIDDEN.
   */
  async delete(
    collection: EntityCollectionName,
    id: string,
    options: { cascade?: boolean } = {}
  ): Promise<void> {
    await this.exclusive(async () => {
      if (collection === 'exchangeRates') {
        throw new StorageError('FORBIDDEN', 'exchangeRates: entries are never deleted')
      }
      const repo = this.repos[collection] as CollectionRepository<EntityCollectionName>
      if (!repo.items().some((e) => e.id === id)) {
        throw new StorageError('NOT_FOUND', `${collection}: not found`)
      }
      if (collection === 'projects') {
        const usedIn = this.projectReferences(id)
        if (usedIn.length > 0) {
          throw new StorageError(
            'CONFLICT',
            `${IN_USE_PREFIX}: project is referenced in ${usedIn.join(', ')}`
          )
        }
      }
      if (collection === 'services' && options.cascade === true) {
        // Costs first: if the service write fails afterwards, a retry still works.
        await this.repo('expenses').update((items) => ({
          items: items.filter((e) => e.serviceId !== id),
          result: undefined
        }))
      }
      await repo.update((items) => ({ items: items.filter((e) => e.id !== id), result: undefined }))
    })
  }

  /** Collections that reference the project (throws if one of them is unreadable). */
  private projectReferences(projectId: string): EntityCollectionName[] {
    const used: EntityCollectionName[] = []
    if (
      this.repo('incomes')
        .items()
        .some((e) => e.projectId === projectId)
    )
      used.push('incomes')
    if (
      this.repo('expenses')
        .items()
        .some((e) => allocationUses(e.allocation, projectId))
    ) {
      used.push('expenses')
    }
    if (
      this.repo('services')
        .items()
        .some((e) => allocationUses(e.allocation, projectId))
    ) {
      used.push('services')
    }
    if (
      this.repo('campaigns')
        .items()
        .some((e) => allocationUses(e.allocation, projectId))
    ) {
      used.push('campaigns')
    }
    if (
      this.repo('goals')
        .items()
        .some((e) => e.projectId === projectId)
    )
      used.push('goals')
    if (
      this.repo('userMetrics')
        .items()
        .some((e) => e.projectId === projectId)
    ) {
      used.push('userMetrics')
    }
    return used
  }

  private parseEntity<C extends CollectionName>(collection: C, candidate: unknown): EntityMap[C] {
    const schema = COLLECTIONS[collection].schema as unknown as z.ZodType<EntityMap[C]>
    const res = schema.safeParse(candidate)
    if (!res.success) {
      throw new StorageError('VALIDATION', validationMessage(collection, res.error))
    }
    return res.data
  }

  // ---------- settings ----------

  /** Returns the single settings item; creates and stores defaults on first use. */
  async getSettings(): Promise<Settings> {
    const existing = this.repo('settings').items()[0]
    if (existing) return existing
    return this.exclusive(async () =>
      this.repo('settings').update((items) => {
        const first = items[0]
        if (first) return { items, result: first }
        const created = this.defaultSettings()
        return { items: [created], result: created }
      })
    )
  }

  async setSettings(input: SettingsInput): Promise<Settings> {
    return this.exclusive(async () =>
      this.repo('settings').update((items) => {
        const previous = items[0] ?? this.defaultSettings()
        for (const list of LIST_NAMES) checkListSetting(list, previous[list], input[list])
        const next = this.parseEntity('settings', {
          ...input,
          id: previous.id,
          ownerId: previous.ownerId,
          createdAt: previous.createdAt,
          updatedAt: this.deps.now().toISOString()
        })
        return { items: [next], result: next }
      })
    )
  }

  private defaultSettings(): Settings {
    const now = this.deps.now().toISOString()
    const emptyList = (): ListSetting => ({ custom: [], hiddenDefaults: [] })
    return {
      id: this.deps.newId(),
      ownerId: LOCAL_OWNER,
      createdAt: now,
      updatedAt: now,
      displayCurrency: BASE_CURRENCY,
      expenseCategories: emptyList(),
      incomeCategories: emptyList(),
      projectPlatforms: emptyList(),
      campaignPlatforms: emptyList(),
      campaignFormats: emptyList()
    }
  }

  /**
   * Runs `task` (which replaces files on disk, e.g. a backup restore) while no
   * store mutation is in progress, then reloads all collections. The reload
   * also runs if the task failed halfway, so memory always matches the disk.
   */
  async replaceFiles(task: () => Promise<void>): Promise<void> {
    await this.exclusive(async () => {
      try {
        await task()
      } finally {
        await this.reloadUnlocked()
      }
    })
  }

  /** Resolves once all queued mutations are done. */
  async idle(): Promise<void> {
    await this.exclusive(async () => {})
  }

  /** Runs store mutations one after another. */
  private exclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = this.lock.then(task, task)
    this.lock = run.catch(() => undefined)
    return run
  }
}

/**
 * List rules (PE-54): custom keys must not collide with default keys, hidden
 * defaults must be default keys, existing custom entries can be hidden but not
 * removed or renamed (old bookings stay valid).
 */
export function checkListSetting(
  list: DefaultListName,
  previous: ListSetting,
  next: ListSetting
): void {
  const defaults = new Set(DEFAULT_LISTS[list])
  for (const entry of next.custom) {
    if (defaults.has(entry.key)) {
      throw new StorageError('VALIDATION', `${list}: custom key collides with a default key`)
    }
  }
  for (const key of next.hiddenDefaults) {
    if (!defaults.has(key)) {
      throw new StorageError('VALIDATION', `${list}: hiddenDefaults contains an unknown key`)
    }
  }
  const nextByKey = new Map(next.custom.map((e) => [e.key, e]))
  for (const old of previous.custom) {
    const kept = nextByKey.get(old.key)
    if (!kept) {
      throw new StorageError('CONFLICT', `${list}: custom entries cannot be removed`)
    }
    if (kept.label !== old.label) {
      throw new StorageError('CONFLICT', `${list}: custom entries cannot be renamed`)
    }
  }
}
