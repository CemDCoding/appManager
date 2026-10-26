import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Hinweis- oder Fehlertext unter einem Feld. Fehler werden per `role="alert"` angesagt;
 * `id` für `aria-describedby` am Feld.
 *
 * @example
 * <Input aria-describedby="amount-msg" aria-invalid={!!error} />
 * <FieldMessage id="amount-msg" error>{error}</FieldMessage>
 */
export function FieldMessage({
  id,
  error = false,
  className,
  children
}: {
  id?: string
  error?: boolean
  className?: string
  children?: ReactNode
}) {
  if (children === null || children === undefined || children === false || children === '')
    return null
  return (
    <p
      id={id}
      role={error ? 'alert' : undefined}
      className={cn('text-xs', error ? 'text-destructive' : 'text-muted-foreground', className)}
    >
      {children}
    </p>
  )
}
