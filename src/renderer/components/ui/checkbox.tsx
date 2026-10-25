import type { ChangeEvent, ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export type CheckboxProps = Omit<ComponentProps<'input'>, 'type'> & {
  onCheckedChange?: (checked: boolean) => void
}

/** Checkbox auf Basis des nativen Eingabefelds (ohne zusätzliche Abhängigkeit). */
export function Checkbox({ className, onChange, onCheckedChange, ...props }: CheckboxProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event)
    onCheckedChange?.(event.target.checked)
  }
  return (
    <input
      data-slot="checkbox"
      type="checkbox"
      className={cn(
        'peer size-4 shrink-0 cursor-pointer rounded-sm border-input accent-primary outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      onChange={handleChange}
      {...props}
    />
  )
}
