import { createContext, useContext } from 'react'

export type ToastVariant = 'default' | 'destructive'

export interface ToastInput {
  title: string
  description?: string
  variant?: ToastVariant
  /** Anzeigedauer in ms (Standard 5000). */
  duration?: number
}

export interface ToastItem extends Required<Omit<ToastInput, 'description'>> {
  id: number
  description?: string
}

export interface ToastContextValue {
  toast: (input: ToastInput) => number
  dismiss: (id: number) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

/**
 * Kurze Rückmeldung anzeigen (Texte vorher übersetzen).
 *
 * @example
 * const { toast } = useToast()
 * toast({ title: t('saved') })
 */
export function useToast(): ToastContextValue {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast must be used inside <Toaster>')
  return value
}
