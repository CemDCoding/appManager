import type { EntityCollectionName, EntityMap } from '@shared/collections'
import type { AppApi } from '@shared/ipc'
import type { Settings } from '@shared/schemas/settings'
import { createResourceStore, type ResourceStore } from './resource'

/**
 * App-weite Speicher je Sammlung und für die Einstellungen. Alle Hooks
 * (`useCollection`, `useSettings`, `useRates` …) teilen sich diese Instanzen,
 * damit eine Änderung überall sofort sichtbar ist.
 */
function api(): AppApi {
  return window.api
}

type CollectionStores = { [C in EntityCollectionName]?: ResourceStore<EntityMap[C][]> }
const collectionStores: CollectionStores = {}

/** Speicher einer Sammlung (wird beim ersten Zugriff angelegt). */
export function collectionStore<C extends EntityCollectionName>(
  name: C
): ResourceStore<EntityMap[C][]> {
  const existing = collectionStores[name] as ResourceStore<EntityMap[C][]> | undefined
  if (existing) return existing
  const store = createResourceStore(() => api().entity.list(name))
  ;(collectionStores as Record<string, unknown>)[name] = store
  return store
}

/** Lädt die genannten Sammlungen neu (nach create/update/delete). */
export async function invalidateCollections(names: readonly EntityCollectionName[]): Promise<void> {
  await Promise.all([...new Set(names)].map((name) => collectionStore(name).invalidate()))
}

let settings: ResourceStore<Settings> | null = null

/** Speicher der Einstellungen (ein Datensatz). */
export function settingsStore(): ResourceStore<Settings> {
  settings ??= createResourceStore(() => api().settings.get())
  return settings
}
