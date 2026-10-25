import type { MouseEvent } from 'react'
import { Button, type ButtonProps } from './button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  useDialog,
  type DialogContentProps,
  type DialogProps
} from './dialog'

/**
 * Rückfrage-Dialog (z. B. vor dem Löschen): schließt nicht über den Hintergrund,
 * nur über Escape, Abbrechen oder Aktion.
 *
 * @example
 * <AlertDialog open={open} onOpenChange={setOpen}>
 *   <AlertDialogContent>
 *     <AlertDialogHeader><AlertDialogTitle>…</AlertDialogTitle></AlertDialogHeader>
 *     <AlertDialogFooter>
 *       <AlertDialogCancel>…</AlertDialogCancel>
 *       <AlertDialogAction onClick={remove}>…</AlertDialogAction>
 *     </AlertDialogFooter>
 *   </AlertDialogContent>
 * </AlertDialog>
 */
export function AlertDialog(props: DialogProps) {
  return <Dialog {...props} />
}

export const AlertDialogTrigger = DialogTrigger

export function AlertDialogContent(
  props: Omit<DialogContentProps, 'role' | 'dismissOnBackdrop' | 'showCloseButton'>
) {
  return (
    <DialogContent
      role="alertdialog"
      dismissOnBackdrop={false}
      showCloseButton={false}
      {...props}
    />
  )
}

export const AlertDialogHeader = DialogHeader
export const AlertDialogFooter = DialogFooter
export const AlertDialogTitle = DialogTitle
export const AlertDialogDescription = DialogDescription

function useCloseAfter(onClick?: (event: MouseEvent<HTMLButtonElement>) => void) {
  const { setOpen } = useDialog()
  return (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event)
    if (!event.defaultPrevented) setOpen(false)
  }
}

export function AlertDialogAction({ onClick, ...props }: ButtonProps) {
  const handleClick = useCloseAfter(onClick)
  return <Button data-slot="alert-dialog-action" onClick={handleClick} {...props} />
}

/** Abbrechen bekommt beim Öffnen den Fokus (sichere Voreinstellung). */
export function AlertDialogCancel({ onClick, variant = 'outline', ...props }: ButtonProps) {
  const handleClick = useCloseAfter(onClick)
  return (
    <Button
      data-slot="alert-dialog-cancel"
      variant={variant}
      onClick={handleClick}
      autoFocus
      {...props}
    />
  )
}
