import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
  type RefObject
} from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'
import { useDismiss } from './use-dismiss'

interface PopoverContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  contentId: string
  triggerRef: RefObject<HTMLButtonElement | null>
}

const PopoverContext = createContext<PopoverContextValue | null>(null)

function usePopover(): PopoverContextValue {
  const value = useContext(PopoverContext)
  if (!value) throw new Error('Popover parts must be used inside <Popover>')
  return value
}

export interface PopoverProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
  children: ReactNode
}

/**
 * Schwebendes Feld unter einem Auslöser; schließt bei Klick außerhalb und Escape.
 *
 * @example
 * <Popover>
 *   <PopoverTrigger asChild><Button>…</Button></PopoverTrigger>
 *   <PopoverContent>…</PopoverContent>
 * </Popover>
 */
export function Popover({
  open,
  defaultOpen = false,
  onOpenChange,
  className,
  children
}: PopoverProps) {
  const [innerOpen, setInnerOpen] = useState(defaultOpen)
  const isOpen = open ?? innerOpen
  const contentId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const setOpen = useCallback(
    (next: boolean) => {
      if (open === undefined) setInnerOpen(next)
      onOpenChange?.(next)
    },
    [open, onOpenChange]
  )
  const value = useMemo(
    () => ({ open: isOpen, setOpen, contentId, triggerRef }),
    [isOpen, setOpen, contentId]
  )
  return (
    <PopoverContext.Provider value={value}>
      <div data-slot="popover" className={cn('relative inline-block', className)}>
        {children}
      </div>
    </PopoverContext.Provider>
  )
}

export function PopoverTrigger({
  asChild = false,
  onClick,
  ...props
}: ComponentProps<'button'> & { asChild?: boolean }) {
  const { open, setOpen, contentId, triggerRef } = usePopover()
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      ref={triggerRef}
      data-slot="popover-trigger"
      type={asChild ? undefined : 'button'}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={open ? contentId : undefined}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (!event.defaultPrevented) setOpen(!open)
      }}
      {...props}
    />
  )
}

export function PopoverContent({
  className,
  align = 'start',
  ...props
}: ComponentProps<'div'> & { align?: 'start' | 'end' }) {
  const { open, setOpen, contentId, triggerRef } = usePopover()
  const contentRef = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [setOpen])
  useDismiss(open, close, contentRef, triggerRef)

  useEffect(() => {
    if (open) contentRef.current?.focus()
  }, [open])

  if (!open) return null
  return (
    <div
      ref={contentRef}
      id={contentId}
      data-slot="popover-content"
      role="dialog"
      tabIndex={-1}
      className={cn(
        'absolute top-full z-50 mt-2 w-72 rounded-md border bg-card p-4 text-card-foreground shadow-md outline-none',
        align === 'end' ? 'right-0' : 'left-0',
        className
      )}
      {...props}
    />
  )
}
