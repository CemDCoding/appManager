export const MAX_STARS = 5

/** Begrenzt eine Sternzahl auf eine Ganzzahl 0–5 (ungültig → 0). */
export function clampStars(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(MAX_STARS, Math.max(0, Math.round(value)))
}

/** Tastatur: Pfeile ±1, Pos1 = 0, Ende = 5. Andere Tasten → `null`. */
export function starsForKey(current: number, key: string): number | null {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowUp':
      return clampStars(current + 1)
    case 'ArrowLeft':
    case 'ArrowDown':
      return clampStars(current - 1)
    case 'Home':
      return 0
    case 'End':
      return MAX_STARS
    default:
      return null
  }
}
