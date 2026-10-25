import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode
} from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

interface TooltipContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  tooltipId: string
}

const TooltipContext = createContext<TooltipContextValue | null>(null)

function useTooltip(): TooltipContextValue {
  const value = useContext(TooltipContext)
  if (!value) throw new Error('Tooltip parts must be used inside <Tooltip>')
  return value
}

/**
 * Kurzer Hinweis bei Maus-Hover und Tastatur-Fokus; Escape blendet ihn aus.
 *
 * @example
 * <Tooltip>
 *   <TooltipTrigger asChild><Button size="icon" aria-label="…">…</Button></TooltipTrigger>
 *   <TooltipContent>…</TooltipContent>
 * </Tooltip>
 */
export function Tooltip({ className, children }: { className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const tooltipId = useId()
  const value = useMemo(() => ({ open, setOpen, tooltipId }), [open, tooltipId])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <TooltipContext.Provider value={value}>
      <span data-slot="tooltip" className={cn('relative inline-flex', className)}>
        {children}
      </span>
    </TooltipContext.Provider>
  )
}

export function TooltipTrigger({
  asChild = false,
  ...props
}: ComponentProps<'button'> & { asChild?: boolean }) {
  const { open, setOpen, tooltipId } = useTooltip()
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      data-slot="tooltip-trigger"
      type={asChild ? undefined : 'button'}
      aria-describedby={open ? tooltipId : undefined}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      {...props}
    />
  )
}

export function TooltipContent({
  className,
  side = 'bottom',
  ...props
}: ComponentProps<'div'> & { side?: 'top' | 'bottom' }) {
  const { open, tooltipId } = useTooltip()
  if (!open) return null
  return (
    <div
      id={tooltipId}
      data-slot="tooltip-content"
      role="tooltip"
      className={cn(
        'pointer-events-none absolute left-1/2 z-50 w-max max-w-xs -translate-x-1/2 rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-md',
        side === 'bottom' ? 'top-full mt-1.5' : 'bottom-full mb-1.5',
        className
      )}
      {...props}
    />
  )
}
