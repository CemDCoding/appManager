import { defineDictionary } from '@/i18n'

/** Texte für Export/Import als ZIP (F-14, AP-25). */
export const transferDict = defineDictionary(
  {
    intro:
      'Sichere alle Daten als ZIP-Datei oder spiele eine solche Sicherung wieder ein. Die Datei wird nur auf deinem Rechner gespeichert.',
    export: 'Als ZIP exportieren',
    import: 'ZIP importieren',
    exportTitle: 'Alle Daten exportieren?',
    exportDescription:
      'Die ZIP-Datei enthält alle Daten unverschlüsselt, auch Personen und Notizen. Bewahre sie sicher auf und gib sie nicht weiter.',
    exportConfirm: 'Exportieren',
    importTitle: 'Daten aus ZIP importieren?',
    importDescription:
      'Alle aktuellen Daten werden durch den Inhalt der ZIP-Datei ersetzt. Die Datei wird vorher vollständig geprüft; vor dem Ersetzen wird ein Backup des aktuellen Stands angelegt.',
    importConfirm: 'Importieren',
    exported: 'Export gespeichert.',
    exportCancelled: 'Export abgebrochen.',
    imported: 'Import abgeschlossen. Die Daten wurden ersetzt.',
    importCancelled: 'Import abgebrochen. Es wurde nichts geändert.',
    invalidZip:
      'Die ZIP-Datei ist ungültig, beschädigt, zu groß (max. 50 MB) oder enthält unerwartete Dateien. Es wurde nichts geändert.',
    exportInvalid:
      'Mindestens eine Datendatei ist ungültig und kann nicht exportiert werden. Stelle zuerst ein Backup wieder her.',
    importIo:
      'Beim Import ist ein Dateifehler aufgetreten. Prüfe die Daten und stelle bei Bedarf ein Backup wieder her.',
    importReadFailed: 'Die ZIP-Datei konnte nicht gelesen werden. Es wurde nichts geändert.',
    importBackupFailed:
      'Vor dem Import konnte kein Backup angelegt werden. Der Import wurde abgebrochen, es wurde nichts geändert.',
    importWriteFailed:
      'Die neuen Daten konnten nicht geschrieben werden. Es wurde nichts geändert.',
    importRolledBack:
      'Die Dateien konnten nicht ersetzt werden. Der vorherige Stand wurde wiederhergestellt.',
    importRollbackFailed:
      'Die Dateien konnten nicht ersetzt werden, und der vorherige Stand ließ sich nicht vollständig wiederherstellen. Prüfe die Daten und stelle das neueste Backup wieder her.',
    running: 'Läuft …',
    busy: 'Ein Export oder Import läuft bereits.'
  },
  {
    intro:
      'Save all data as a ZIP file or restore such a backup. The file is stored on your computer only.',
    export: 'Export as ZIP',
    import: 'Import ZIP',
    exportTitle: 'Export all data?',
    exportDescription:
      'The ZIP file contains all data unencrypted, including people and notes. Keep it safe and do not share it.',
    exportConfirm: 'Export',
    importTitle: 'Import data from ZIP?',
    importDescription:
      'All current data will be replaced by the contents of the ZIP file. The file is fully checked first; a backup of the current state is created before replacing.',
    importConfirm: 'Import',
    exported: 'Export saved.',
    exportCancelled: 'Export cancelled.',
    imported: 'Import finished. The data has been replaced.',
    importCancelled: 'Import cancelled. Nothing was changed.',
    invalidZip:
      'The ZIP file is invalid, damaged, too large (max. 50 MB) or contains unexpected files. Nothing was changed.',
    exportInvalid:
      'At least one data file is invalid and cannot be exported. Restore a backup first.',
    importIo:
      'A file error occurred during the import. Check the data and restore a backup if needed.',
    importReadFailed: 'The ZIP file could not be read. Nothing was changed.',
    importBackupFailed:
      'No backup could be created before the import. The import was cancelled; nothing was changed.',
    importWriteFailed: 'The new data could not be written. Nothing was changed.',
    importRolledBack: 'The files could not be replaced. The previous state was restored.',
    importRollbackFailed:
      'The files could not be replaced and the previous state could not be fully restored. Check the data and restore the latest backup.',
    running: 'Running …',
    busy: 'An export or import is already running.'
  }
)

export type TransferKey = keyof (typeof transferDict)['de']
