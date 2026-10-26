import { TransferSection } from '@/features/transfer/TransferSection'
import { DataSection } from './DataSection'
import { DisplaySection } from './DisplaySection'
import { ListsSection } from './ListsSection'
import { RatesSection } from './RatesSection'

/** Einstellungen: Daten, Anzeige, Kurse, Listen (AP-11). */
export function SettingsPage() {
  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <DataSection />
      <TransferSection />
      <DisplaySection />
      <RatesSection />
      <ListsSection />
    </div>
  )
}
