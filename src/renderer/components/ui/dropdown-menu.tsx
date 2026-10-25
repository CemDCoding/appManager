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
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject
} from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'
import { useDismiss } from './use-dismiss'

interface MenuContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  menuId: string
  triggerRef: RefObject<HTMLButtonElement | null>
}

const MenuContext = createContext<MenuContextValue | null>(null)

function useMenu(): MenuContextValue {
  const value = useContext(MenuContext)
  if (!value) throw new Error('DropdownMenu parts must be used inside <DropdownMenu>')
  return value
}

export interface DropdownMenuProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
  children: ReactNode
}

/**
 * Aufklappmenü nach WAI-ARIA (Pfeiltasten, Pos1/Ende, Escape, Tab schließt).
 *
 * @example
 * <DropdownMenu>
 *   <DropdownMenuTrigger asChild><Button>…</Button></DropdownMenuTrigger>
 *   <DropdownMenuContent>
 *     <DropdownMenuItem onSelect={edit}>…</DropdownMenuItem>
 *   </DropdownMenuContent>
 * </DropdownMenu>
 */
export function DropdownMenu({ open, onOpenChange, className, children }: DropdownMenuProps) {
  const [innerOpen, setInnerOpen] = useState(false)
  const isOpen = open ?? innerOpen
  const menuId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const setOpen = useCallback(
    (next: boolean) => {
      if (open === undefined) setInnerOpen(next)
      onOpenChange?.(next)
    },
    [open, onOpenChange]
  )
  const value = useMemo(
    () => ({ open: isOpen, setOpen, menuId, triggerRef }),
    [isOpen, setOpen, menuId]
  )
  return (
    <MenuContext.Provider value={value}>
      <div data-slot="dropdown-menu" className={cn('relative inline-block', className)}>
        {children}
      </div>
    </MenuContext.Provider>
  )
}

export function DropdownMenuTrigger({
  asChild = false,
  onClick,
  onKeyDown,
  ...props
}: ComponentProps<'button'> & { asChild?: boolean }) {
  const { open, setOpen, menuId, triggerRef } = useMenu()
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      ref={triggerRef}
      data-slot="dropdown-menu-trigger"
      type={asChild ? undefined : 'button'}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={open ? menuId : undefined}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (!event.defaultPrevented) setOpen(!open)
      }}
      onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
        onKeyDown?.(event)
        if (event.key === 'ArrowDown' && !open) {
          event.preventDefault()
          setOpen(true)
        }
      }}
      {...props}
    />
  )
}

function menuItems(menu: HTMLElement): HTMLElement[] {
  return Array.from(
    menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')
  )
}

export function DropdownMenuContent({
  className,
  align = 'start',
  onKeyDown,
  ...props
}: ComponentProps<'div'> & { align?: 'start' | 'end' }) {
  const { open, setOpen, menuId, triggerRef } = useMenu()
  const contentRef = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [setOpen])
  useDismiss(open, close, contentRef, triggerRef)

  useEffect(() => {
    if (open && contentRef.current) menuItems(contentRef.current)[0]?.focus()
  }, [open])

  if (!open) return null

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    if (event.key === 'Tab') {
      close()
      return
    }
    const items = menuItems(event.currentTarget)
    if (items.length === 0) return
    const index = items.findIndex((item) => item === document.activeElement)
    let next = -1
    if (event.key === 'ArrowDown') next = (index + 1) % items.length
    else if (event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = items.length - 1
    if (next < 0) return
    event.preventDefault()
    items[next].focus()
  }

  return (
    <div
      ref={contentRef}
      id={menuId}
      data-slot="dropdown-menu-content"
      role="menu"
      onKeyDown={handleKeyDown}
      className={cn(
        'absolute top-full z-50 mt-1 min-w-40 rounded-md border bg-card p-1 text-card-foreground shadow-md',
        align === 'end' ? 'right-0' : 'left-0',
        className
      )}
      {...props}
    />
  )
}

export type DropdownMenuItemProps = Omit<ComponentProps<'button'>, 'onSelect'> & {
  onSelect?: () => void
  variant?: 'default' | 'destructive'
}

export function DropdownMenuItem({
  className,
  onSelect,
  onClick,
  disabled,
  variant = 'default',
  ...props
}: DropdownMenuItemProps) {
  const { setOpen, triggerRef } = useMenu()
  return (
    <button
      data-slot="dropdown-menu-item"
      type="button"
      role="menuitem"
      tabIndex={-1}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        onSelect?.()
        setOpen(false)
        triggerRef.current?.focus()
      }}
      className={cn(
        'flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none select-none hover:bg-muted focus:bg-muted disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
        variant === 'destructive' && 'text-destructive',
        className
      )}
      {...props}
    />
  )
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="dropdown-menu-label"
      className={cn('px-2 py-1.5 text-sm font-medium', className)}
      {...props}
    />
  )
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="dropdown-menu-separator"
      role="separator"
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  )
}
