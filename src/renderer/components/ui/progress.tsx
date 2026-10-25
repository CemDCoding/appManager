import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export type ProgressProps = ComponentProps<'div'> & {
  /** Wert 0–100; Werte außerhalb werden begrenzt. */
  value?: number
}

export function Progress({ className, value = 0, ...props }: ProgressProps) {
  const clamped = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0
  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted', className)}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className="h-full bg-primary transition-[width]"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
