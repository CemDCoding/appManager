import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  type ComponentProps,
  type KeyboardEvent
} from 'react'
import { cn } from '@/lib/utils'

interface TabsContextValue {
  value: string
  setValue: (value: string) => void
  baseId: string
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabs(): TabsContextValue {
  const value = useContext(TabsContext)
  if (!value) throw new Error('Tabs parts must be used inside <Tabs>')
  return value
}

/** Ids für Tab und Panel; Werte werden für die Id lesbar gemacht. */
function partId(baseId: string, part: 'tab' | 'panel', value: string): string {
  return `${baseId}-${part}-${value.replace(/[^\w-]/g, '_')}`
}

export type TabsProps = Omit<ComponentProps<'div'>, 'defaultValue'> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

/**
 * Reiter nach WAI-ARIA (Pfeiltasten, Pos1/Ende).
 *
 * @example
 * <Tabs defaultValue="overview">
 *   <TabsList aria-label="…"><TabsTrigger value="overview">…</TabsTrigger></TabsList>
 *   <TabsContent value="overview">…</TabsContent>
 * </Tabs>
 */
export function Tabs({ value, defaultValue = '', onValueChange, className, ...props }: TabsProps) {
  const [innerValue, setInnerValue] = useState(defaultValue)
  const current = value ?? innerValue
  const baseId = useId()
  const setValue = useCallback(
    (next: string) => {
      if (value === undefined) setInnerValue(next)
      onValueChange?.(next)
    },
    [value, onValueChange]
  )
  const context = useMemo(() => ({ value: current, setValue, baseId }), [current, setValue, baseId])
  return (
    <TabsContext.Provider value={context}>
      <div data-slot="tabs" className={cn('flex flex-col gap-2', className)} {...props} />
    </TabsContext.Provider>
  )
}

export function TabsList({ className, onKeyDown, ...props }: ComponentProps<'div'>) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    const tabs = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)')
    )
    const index = tabs.findIndex((tab) => tab === document.activeElement)
    if (index < 0) return
    let next = -1
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = tabs.length - 1
    if (next < 0) return
    event.preventDefault()
    tabs[next].focus()
    tabs[next].click()
  }
  return (
    <div
      data-slot="tabs-list"
      role="tablist"
      onKeyDown={handleKeyDown}
      className={cn(
        'inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
        className
      )}
      {...props}
    />
  )
}

export function TabsTrigger({
  className,
  value,
  onClick,
  ...props
}: ComponentProps<'button'> & { value: string }) {
  const tabs = useTabs()
  const selected = tabs.value === value
  return (
    <button
      data-slot="tabs-trigger"
      type="button"
      role="tab"
      id={partId(tabs.baseId, 'tab', value)}
      aria-selected={selected}
      aria-controls={partId(tabs.baseId, 'panel', value)}
      data-state={selected ? 'active' : 'inactive'}
      tabIndex={selected ? 0 : -1}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) tabs.setValue(value)
      }}
      className={cn(
        'inline-flex h-full flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        className
      )}
      {...props}
    />
  )
}

export function TabsContent({
  className,
  value,
  ...props
}: ComponentProps<'div'> & { value: string }) {
  const tabs = useTabs()
  if (tabs.value !== value) return null
  return (
    <div
      data-slot="tabs-content"
      role="tabpanel"
      id={partId(tabs.baseId, 'panel', value)}
      aria-labelledby={partId(tabs.baseId, 'tab', value)}
      tabIndex={0}
      className={cn('flex-1 outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
      {...props}
    />
  )
}
