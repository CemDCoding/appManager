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
  type ReactNode
} from 'react'
import { Slot } from '@radix-ui/react-slot'
import { XIcon } from 'lucide-react'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'

interface DialogContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  titleId: string
  descriptionId: string
}

const DialogContext = createContext<DialogContextValue | null>(null)

export function useDialog(): DialogContextValue {
  const value = useContext(DialogContext)
  if (!value) throw new Error('Dialog parts must be used inside <Dialog>')
  return value
}

export interface DialogProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}

/**
 * Modaler Dialog auf Basis des nativen `<dialog>` (Fokusfalle, Escape, Fokus-Rückgabe
 * übernimmt der Browser). Gesteuert über `open`/`onOpenChange` oder `DialogTrigger`.
 *
 * @example
 * <Dialog open={open} onOpenChange={setOpen}>
 *   <DialogContent>
 *     <DialogHeader><DialogTitle>…</DialogTitle></DialogHeader>
 *   </DialogContent>
 * </Dialog>
 */
export function Dialog({ open, defaultOpen = false, onOpenChange, children }: DialogProps) {
  const [innerOpen, setInnerOpen] = useState(defaultOpen)
  const isOpen = open ?? innerOpen
  const titleId = useId()
  const descriptionId = useId()

  const setOpen = useCallback(
    (next: boolean) => {
      if (open === undefined) setInnerOpen(next)
      onOpenChange?.(next)
    },
    [open, onOpenChange]
  )

  const value = useMemo(
    () => ({ open: isOpen, setOpen, titleId, descriptionId }),
    [isOpen, setOpen, titleId, descriptionId]
  )
  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>
}

type TriggerProps = ComponentProps<'button'> & { asChild?: boolean }

export function DialogTrigger({ asChild = false, onClick, ...props }: TriggerProps) {
  const { open, setOpen } = useDialog()
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      data-slot="dialog-trigger"
      type={asChild ? undefined : 'button'}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (!event.defaultPrevented) setOpen(true)
      }}
      {...props}
    />
  )
}

export function DialogClose({ asChild = false, onClick, ...props }: TriggerProps) {
  const { setOpen } = useDialog()
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      data-slot="dialog-close"
      type={asChild ? undefined : 'button'}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (!event.defaultPrevented) setOpen(false)
      }}
      {...props}
    />
  )
}

export type DialogContentProps = Omit<ComponentProps<'dialog'>, 'open'> & {
  /** Klick auf den abgedunkelten Hintergrund schließt den Dialog. */
  dismissOnBackdrop?: boolean
  showCloseButton?: boolean
  role?: 'dialog' | 'alertdialog'
}

export function DialogContent({
  className,
  children,
  dismissOnBackdrop = true,
  showCloseButton = true,
  role = 'dialog',
  ...props
}: DialogContentProps) {
  const { open, setOpen, titleId, descriptionId } = useDialog()
  const t = useT()
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      data-slot="dialog-content"
      role={role}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault()
        setOpen(false)
      }}
      onClick={(event) => {
        if (dismissOnBackdrop && event.target === event.currentTarget) setOpen(false)
      }}
      className={cn(
        'm-auto w-full max-w-lg rounded-lg border bg-card p-0 text-card-foreground shadow-lg backdrop:bg-overlay',
        className
      )}
      {...props}
    >
      {open && (
        <div className="relative grid gap-4 p-6">
          {children}
          {showCloseButton && (
            <DialogClose
              aria-label={t('common.close')}
              className="absolute top-4 right-4 rounded-sm opacity-70 outline-none hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4"
            >
              <XIcon aria-hidden="true" />
            </DialogClose>
          )}
        </div>
      )}
    </dialog>
  )
}

export function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-2 pr-6', className)}
      {...props}
    />
  )
}

export function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  )
}

export function DialogTitle({ className, ...props }: ComponentProps<'h2'>) {
  const { titleId } = useDialog()
  return (
    <h2
      id={titleId}
      data-slot="dialog-title"
      className={cn('text-lg leading-none font-semibold', className)}
      {...props}
    />
  )
}

export function DialogDescription({ className, ...props }: ComponentProps<'p'>) {
  const { descriptionId } = useDialog()
  return (
    <p
      id={descriptionId}
      data-slot="dialog-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}
