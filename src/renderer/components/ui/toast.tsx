import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { XIcon } from 'lucide-react'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'
import { ToastContext, type ToastInput, type ToastItem } from './toast-context'

const DEFAULT_DURATION = 5000
const MAX_TOASTS = 3

/** Einfacher eigener Toast (ohne zusätzliche Abhängigkeit); Ausgabe in einer Live-Region. */
export function Toaster({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)
  const t = useT()

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback((input: ToastInput) => {
    const id = nextId.current++
    const item: ToastItem = {
      id,
      title: input.title,
      description: input.description,
      variant: input.variant ?? 'default',
      duration: input.duration ?? DEFAULT_DURATION
    }
    setItems((current) => [...current, item].slice(-MAX_TOASTS))
    return id
  }, [])

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        data-slot="toaster"
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2"
      >
        {items.map((item) => (
          <ToastView key={item.id} item={item} onDismiss={dismiss} closeLabel={t('common.close')} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastView({
  item,
  onDismiss,
  closeLabel
}: {
  item: ToastItem
  onDismiss: (id: number) => void
  closeLabel: string
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(item.id), item.duration)
    return () => window.clearTimeout(timer)
  }, [item.id, item.duration, onDismiss])

  return (
    <div
      data-slot="toast"
      className={cn(
        'pointer-events-auto relative rounded-md border bg-card p-4 pr-10 text-card-foreground shadow-lg',
        item.variant === 'destructive' && 'border-destructive'
      )}
    >
      <p
        className={cn(
          'text-sm font-semibold',
          item.variant === 'destructive' && 'text-destructive'
        )}
      >
        {item.title}
      </p>
      {item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}
      <button
        type="button"
        aria-label={closeLabel}
        onClick={() => onDismiss(item.id)}
        className="absolute top-3 right-3 rounded-sm opacity-70 outline-none hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4"
      >
        <XIcon aria-hidden="true" />
      </button>
    </div>
  )
}
