import { useRef, useState } from 'react'
import { ENTITY_COLLECTION_NAMES } from '@shared/collections'
import { ConfirmDialog, FieldMessage } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n'
import { ipcErrorDict } from '@/i18n/shared-keys'
import { invalidateCollections, settingsStore } from '@/state/stores'
import { transferDict } from './i18n'
import {
  notifyDataReplaced,
  transferOutcome,
  type TransferAction,
  type TransferOutcome
} from './transfer-logic'

const FAILED: TransferOutcome = { kind: 'error', key: null, code: 'INTERNAL', changed: false }

/**
 * Export/Import aller Daten als ZIP (F-14, AP-25). Dateien wählt nur der native Dialog
 * im Main-Prozess; der Renderer sendet keine Pfade. Beide Aktionen fragen vorher nach.
 * Während eine Aktion läuft, sind beide Knöpfe gesperrt.
 */
export function TransferSection() {
  const t = useT()
  const tt = useT(transferDict)
  const tErr = useT(ipcErrorDict)
  const [confirm, setConfirm] = useState<TransferAction | null>(null)
  const [outcome, setOutcome] = useState<TransferOutcome | null>(null)
  const [running, setRunning] = useState<TransferAction | null>(null)
  // Sperre unabhängig vom Render-Zeitpunkt (Doppelklick).
  const lock = useRef(false)

  const run = async (action: TransferAction): Promise<boolean> => {
    if (lock.current) return true
    lock.current = true
    setRunning(action)
    setOutcome(null)
    try {
      let next: TransferOutcome
      try {
        const result =
          action === 'export' ? await window.api.export.zip() : await window.api.import.zip()
        next = transferOutcome(action, result)
      } catch {
        // Ausgang unbekannt: nach einem Importversuch vorsichtshalber neu laden.
        next = { ...FAILED, changed: action === 'import' }
      }
      if (next.changed) {
        await Promise.all([
          invalidateCollections(ENTITY_COLLECTION_NAMES),
          settingsStore().invalidate()
        ])
      }
      // Jeder Importversuch kann ein Backup angelegt haben: Backup-Liste neu laden.
      if (action === 'import' && next.kind !== 'cancelled') notifyDataReplaced()
      setOutcome(next)
    } finally {
      lock.current = false
      setRunning(null)
    }
    return true
  }

  const message =
    outcome === null
      ? null
      : outcome.key !== null
        ? tt(outcome.key)
        : outcome.kind === 'error'
          ? tErr(outcome.code)
          : null

  return (
    <section aria-labelledby="transfer-section-title" className="flex flex-col gap-3">
      <h2 id="transfer-section-title" className="text-base font-semibold">
        {t('nav.transfer')}
      </h2>
      <p className="text-sm text-muted-foreground">{tt('intro')}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={running !== null}
          aria-busy={running === 'export' || undefined}
          onClick={() => setConfirm('export')}
        >
          {running === 'export' ? tt('running') : tt('export')}
        </Button>
        <Button
          variant="outline"
          disabled={running !== null}
          aria-busy={running === 'import' || undefined}
          onClick={() => setConfirm('import')}
        >
          {running === 'import' ? tt('running') : tt('import')}
        </Button>
      </div>
      <div role="status" aria-live="polite" data-testid="transfer-result">
        <FieldMessage error={outcome?.kind === 'error'}>{message}</FieldMessage>
      </div>

      <ConfirmDialog
        open={confirm === 'export'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={tt('exportTitle')}
        description={tt('exportDescription')}
        confirmLabel={tt('exportConfirm')}
        onConfirm={() => run('export')}
      />
      <ConfirmDialog
        open={confirm === 'import'}
        onOpenChange={(open) => !open && setConfirm(null)}
        destructive
        title={tt('importTitle')}
        description={tt('importDescription')}
        confirmLabel={tt('importConfirm')}
        onConfirm={() => run('import')}
      />
    </section>
  )
}
