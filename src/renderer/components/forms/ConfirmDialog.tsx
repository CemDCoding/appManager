import { useState, type ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n'
import { uiDict } from '@/i18n/shared-keys'
import { FieldMessage } from './FieldMessage'

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  /** Beschriftung der Aktion (Standard „Bestätigen“). */
  confirmLabel?: string
  /** Rote Aktion (z. B. Löschen). */
  destructive?: boolean
  /**
   * Wird beim Bestätigen aufgerufen. Gibt sie `false` zurück (z. B. `IN_USE`), bleibt der
   * Dialog offen und zeigt `error`.
   */
  onConfirm: () => boolean | void | Promise<boolean | void>
  /** Fehlertext, z. B. `errorText` aus `useEntityMutation`. */
  error?: string | null
  /** Zusätzlicher Inhalt (z. B. Checkbox „verknüpfte Kosten mitlöschen“). */
  children?: ReactNode
}

/**
 * Rückfrage vor folgenreichen Aktionen. Abbrechen hat den Fokus; während `onConfirm`
 * läuft, sind die Knöpfe gesperrt.
 *
 * @example
 * <ConfirmDialog open={open} onOpenChange={setOpen} destructive
 *   title={tp('deleteTitle')} confirmLabel={t('common.delete')} error={errorText}
 *   onConfirm={async () => (await remove(id)).ok} />
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive = false,
  onConfirm,
  error,
  children
}: ConfirmDialogProps) {
  const t = useT()
  const tu = useT(uiDict)
  const [pending, setPending] = useState(false)

  const confirm = async () => {
    setPending(true)
    try {
      const result = await onConfirm()
      if (result !== false) onOpenChange(false)
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description !== undefined && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        {children}
        <FieldMessage error>{error}</FieldMessage>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t('common.cancel')}</AlertDialogCancel>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={() => void confirm()}
          >
            {pending ? tu('working') : (confirmLabel ?? t('common.confirm'))}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
