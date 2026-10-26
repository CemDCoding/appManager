import { useRef, type KeyboardEvent } from 'react'
import { Star, X } from 'lucide-react'
import { useT } from '@/i18n'
import { uiDict } from '@/i18n/shared-keys'
import { cn } from '@/lib/utils'
import { clampStars, MAX_STARS, starsForKey } from './star-logic'

export interface StarRatingProps {
  /** 0–5 (0 = keine Bewertung). */
  value: number
  onChange?: (value: number) => void
  /** Nur anzeigen, nicht ändern. */
  readOnly?: boolean
  disabled?: boolean
  className?: string
  'aria-label'?: string
}

/**
 * Sterne 0–5 (Kampagnen, PE-49). Bedienbar mit Maus und Tastatur (Pfeile, Pos1, Ende).
 *
 * @example
 * <StarRating value={stars} onChange={setStars} />
 * <StarRating value={campaign.stars} readOnly />
 */
export function StarRating({
  value,
  onChange,
  readOnly = false,
  disabled = false,
  className,
  'aria-label': ariaLabel
}: StarRatingProps) {
  const t = useT(uiDict)
  const current = clampStars(value)
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const label = ariaLabel ?? t('rating')

  if (readOnly || !onChange) {
    return (
      <span
        role="img"
        aria-label={`${label}: ${t('ratingStars', { count: current })}`}
        className={cn('inline-flex gap-0.5', className)}
      >
        {Array.from({ length: MAX_STARS }, (_, i) => (
          <Star
            key={i}
            aria-hidden="true"
            className={cn(
              'size-4',
              i < current ? 'fill-primary text-primary' : 'text-muted-foreground'
            )}
          />
        ))}
      </span>
    )
  }

  const select = (next: number) => {
    onChange(next)
    refs.current[next]?.focus()
  }
  const onKeyDown = (event: KeyboardEvent) => {
    const next = starsForKey(current, event.key)
    if (next === null) return
    event.preventDefault()
    select(next)
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn('inline-flex items-center gap-0.5', className)}
    >
      {Array.from({ length: MAX_STARS + 1 }, (_, n) => {
        const checked = n === current
        const common = {
          role: 'radio' as const,
          'aria-checked': checked,
          tabIndex: checked ? 0 : -1,
          disabled,
          ref: (el: HTMLButtonElement | null) => {
            refs.current[n] = el
          },
          onClick: () => select(n),
          className:
            'inline-flex size-7 items-center justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'
        }
        if (n === 0) {
          return (
            <button
              key={n}
              type="button"
              aria-label={t('ratingClear')}
              title={t('ratingClear')}
              {...common}
            >
              <X aria-hidden="true" className="size-3.5 text-muted-foreground" />
            </button>
          )
        }
        return (
          <button
            key={n}
            type="button"
            aria-label={t('ratingStars', { count: n })}
            title={t('ratingStars', { count: n })}
            {...common}
          >
            <Star
              aria-hidden="true"
              className={cn(
                'size-5',
                n <= current ? 'fill-primary text-primary' : 'text-muted-foreground'
              )}
            />
          </button>
        )
      })}
    </div>
  )
}
