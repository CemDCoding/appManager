import { useId, useMemo } from 'react'
import type { DefaultListName } from '@shared/lists'
import { Checkbox } from '@/components/ui/checkbox'
import { Select } from '@/components/ui/select'
import { useI18n, useT } from '@/i18n'
import { uiDict } from '@/i18n/shared-keys'
import { useSettings } from '@/hooks/useSettings'
import { cn } from '@/lib/utils'
import { listOptions, selectableOptions } from './list-options'

interface CommonProps {
  /** Welche Liste: Ausgaben-/Einnahmenkategorien, Plattformen, Kampagnen-Formate … */
  list: DefaultListName
  disabled?: boolean
  className?: string
  'aria-label'?: string
  /** Nur bestimmte Schlüssel anbieten (z. B. Dienstkategorien). */
  filter?: (key: string) => boolean
}

export type CategorySelectProps =
  | (CommonProps & {
      multiple?: false
      value: string
      onChange: (key: string) => void
    })
  | (CommonProps & {
      multiple: true
      value: readonly string[]
      onChange: (keys: string[]) => void
    })

/**
 * Auswahl aus einer Liste (PE-26, PE-54): Startliste (übersetzt) + eigene Einträge aus
 * den Einstellungen. Ausgeblendete sind nicht neu wählbar; ein bereits gespeicherter,
 * inzwischen ausgeblendeter Wert bleibt sichtbar (Hinweis „ausgeblendet“).
 *
 * @example
 * <CategorySelect list="expenseCategories" value={category} onChange={setCategory} />
 * <CategorySelect multiple list="projectPlatforms" value={platforms} onChange={setPlatforms} />
 */
export function CategorySelect(props: CategorySelectProps) {
  const { list, disabled, className, filter } = props
  const t = useT(uiDict)
  const { language } = useI18n()
  const { settings } = useSettings()
  const setting = settings?.[list]
  const { multiple, value: rawValue } = props
  const current = useMemo<readonly string[]>(() => {
    if (multiple) return rawValue as readonly string[]
    return rawValue ? [rawValue as string] : []
  }, [multiple, rawValue])
  const groupId = useId()

  const options = useMemo(() => {
    const all = selectableOptions(listOptions(list, setting, language), current)
    return filter ? all.filter((o) => filter(o.key) || current.includes(o.key)) : all
  }, [list, setting, language, current, filter])

  const text = (label: string, hidden: boolean) =>
    hidden ? `${label} (${t('hiddenEntry')})` : label

  if (!props.multiple) {
    return (
      <Select
        aria-label={props['aria-label']}
        value={props.value}
        disabled={disabled}
        onValueChange={props.onChange}
        className={className}
      >
        <option value="" disabled>
          {t('selectPlaceholder')}
        </option>
        {options.map((o) => (
          <option key={o.key} value={o.key} disabled={o.hidden && o.key !== props.value}>
            {text(o.label, o.hidden)}
          </option>
        ))}
      </Select>
    )
  }

  const { value, onChange } = props
  const selected = new Set(value)
  return (
    <div
      role="group"
      aria-label={props['aria-label']}
      className={cn('flex flex-wrap gap-x-4 gap-y-2', className)}
    >
      {options.map((o) => {
        const id = `${groupId}-${o.key}`
        return (
          <label key={o.key} htmlFor={id} className="flex items-center gap-2 text-sm">
            <Checkbox
              id={id}
              checked={selected.has(o.key)}
              disabled={disabled || (o.hidden && !selected.has(o.key))}
              onCheckedChange={(checked) =>
                onChange(checked ? [...value, o.key] : value.filter((k) => k !== o.key))
              }
            />
            {text(o.label, o.hidden)}
          </label>
        )
      })}
    </div>
  )
}

/**
 * Anzeigetext für gespeicherte Schlüssel einer Liste (Tabellen, Details).
 *
 * @example
 * const label = useListLabel('expenseCategories')
 * label(expense.category) // "Hosting/Server" oder eigenes Label
 */
export function useListLabel(list: DefaultListName): (key: string) => string {
  const { language } = useI18n()
  const { settings } = useSettings()
  const setting = settings?.[list]
  return useMemo(() => {
    const labels = new Map(listOptions(list, setting, language).map((o) => [o.key, o.label]))
    return (key: string) => labels.get(key) ?? key
  }, [list, setting, language])
}
