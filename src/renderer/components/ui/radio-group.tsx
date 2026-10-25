import { createContext, useContext, useId, type ComponentProps } from 'react'
import { cn } from '@/lib/utils'

interface RadioGroupContextValue {
  name: string
  value: string | undefined
  disabled: boolean
  onValueChange?: (value: string) => void
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null)

export type RadioGroupProps = Omit<ComponentProps<'div'>, 'onChange'> & {
  value?: string
  name?: string
  disabled?: boolean
  onValueChange?: (value: string) => void
}

/**
 * Optionsgruppe auf Basis nativer Radio-Buttons (Pfeiltasten wechseln die Auswahl).
 *
 * @example
 * <RadioGroup value={v} onValueChange={setV} aria-label="…">
 *   <Label><RadioGroupItem value="a" /> A</Label>
 * </RadioGroup>
 */
export function RadioGroup({
  className,
  value,
  name,
  disabled = false,
  onValueChange,
  ...props
}: RadioGroupProps) {
  const fallbackName = useId()
  return (
    <RadioGroupContext.Provider
      value={{ name: name ?? fallbackName, value, disabled, onValueChange }}
    >
      <div
        data-slot="radio-group"
        role="radiogroup"
        className={cn('grid gap-3', className)}
        {...props}
      />
    </RadioGroupContext.Provider>
  )
}

export type RadioGroupItemProps = Omit<ComponentProps<'input'>, 'type' | 'name' | 'value'> & {
  value: string
}

export function RadioGroupItem({ className, value, disabled, ...props }: RadioGroupItemProps) {
  const group = useContext(RadioGroupContext)
  if (!group) throw new Error('RadioGroupItem must be used inside <RadioGroup>')
  return (
    <input
      data-slot="radio-group-item"
      type="radio"
      name={group.name}
      value={value}
      checked={group.value === undefined ? undefined : group.value === value}
      disabled={disabled ?? group.disabled}
      onChange={(event) => {
        if (event.target.checked) group.onValueChange?.(value)
      }}
      className={cn(
        'size-4 shrink-0 cursor-pointer accent-primary outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}
