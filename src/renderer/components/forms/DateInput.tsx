import type { ComponentProps } from 'react'
import { isValidDateString } from '@shared/schemas/common'
import { Input } from '@/components/ui/input'

export type DateInputProps = Omit<ComponentProps<'input'>, 'type' | 'value' | 'onChange'> & {
  /** "YYYY-MM-DD" oder '' (leer). */
  value: string
  onValueChange: (value: string) => void
  /** Ungültige/leere Pflichtwerte markieren. */
  invalid?: boolean
}

/**
 * Datumsfeld (natives `<input type="date">`, Wert immer "YYYY-MM-DD", ohne Zeitzone).
 * Liefert '' bei leerem Feld; teilweise getippte Daten meldet der Browser als ''.
 *
 * @example
 * <DateInput value={date} onValueChange={setDate} required />
 */
export function DateInput({ value, onValueChange, invalid, min, max, ...props }: DateInputProps) {
  const isInvalid = invalid ?? (value !== '' && !isValidDateString(value))
  return (
    <Input
      type="date"
      value={value}
      min={min ?? '0001-01-01'}
      max={max ?? '9999-12-31'}
      aria-invalid={isInvalid || undefined}
      onChange={(e) => onValueChange(e.target.value)}
      {...props}
    />
  )
}
