import type { ChangeEvent, ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { fieldClassName } from './input'

export type SelectProps = ComponentProps<'select'> & {
  /** Bequemer Rückruf mit dem gewählten Wert. */
  onValueChange?: (value: string) => void
}

/**
 * Auswahlfeld auf Basis des nativen `<select>` (tastatur- und screenreaderfreundlich,
 * ohne zusätzliche Abhängigkeit).
 *
 * @example
 * <Select value={v} onValueChange={setV}><option value="a">A</option></Select>
 */
export function Select({ className, onChange, onValueChange, ...props }: SelectProps) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange?.(event)
    onValueChange?.(event.target.value)
  }
  return (
    <select
      data-slot="select"
      className={cn(fieldClassName, 'pr-8', className)}
      onChange={handleChange}
      {...props}
    />
  )
}
