/**
 * UI-Präferenzen (Sprache, Theme) in `localStorage` – keine Fachdaten (PE-47).
 */
export const STORAGE_KEYS = {
  language: 'appManager.language',
  theme: 'appManager.theme'
} as const

/** Minimaler Speicher-Vertrag, damit die Logik ohne DOM testbar ist. */
export interface PreferenceStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function defaultStorage(): PreferenceStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** Liest eine Präferenz; ungültige oder fehlende Werte ergeben `fallback`. */
export function readPreference<T extends string>(
  key: string,
  isValid: (value: unknown) => value is T,
  fallback: T,
  storage: PreferenceStorage | null = defaultStorage()
): T {
  try {
    const raw = storage?.getItem(key)
    return isValid(raw) ? raw : fallback
  } catch {
    return fallback
  }
}

/** Speichert eine Präferenz; Fehler (z. B. gesperrter Speicher) werden ignoriert. */
export function writePreference(
  key: string,
  value: string,
  storage: PreferenceStorage | null = defaultStorage()
): void {
  try {
    storage?.setItem(key, value)
  } catch {
    // Präferenz ist nicht kritisch; ohne Speicher gilt der Standard beim nächsten Start.
  }
}
