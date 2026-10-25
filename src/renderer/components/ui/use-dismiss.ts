import { useEffect, type RefObject } from 'react'

/**
 * Schließt ein schwebendes Element bei Klick außerhalb oder Escape.
 * Bei Escape geht der Fokus zurück an den Auslöser.
 */
export function useDismiss(
  open: boolean,
  close: () => void,
  contentRef: RefObject<HTMLElement | null>,
  triggerRef: RefObject<HTMLElement | null>
): void {
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (contentRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      close()
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close, contentRef, triggerRef])
}
