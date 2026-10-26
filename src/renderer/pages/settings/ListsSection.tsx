import { useState, type FormEvent } from 'react'
import type { DefaultListName } from '@shared/lists'
import type { ListSetting } from '@shared/schemas/settings'
import { FieldMessage, listOptions } from '@/components/forms'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSettings } from '@/hooks'
import { useI18n, useT } from '@/i18n'
import { settingsDict } from './i18n'
import { addCustomEntry, setEntryHidden } from './settings-logic'

const LISTS = [
  'expenseCategories',
  'incomeCategories',
  'projectPlatforms',
  'campaignPlatforms',
  'campaignFormats'
] as const satisfies readonly DefaultListName[]

const EMPTY: ListSetting = { custom: [], hiddenDefaults: [] }

function ListEditor({ list }: { list: (typeof LISTS)[number] }) {
  const t = useT()
  const ts = useT(settingsDict)
  const { language } = useI18n()
  const { settings, save, saving, saveErrorText } = useSettings()
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | null>(null)

  const setting = settings?.[list] ?? EMPTY
  const options = listOptions(list, setting, language)

  const toggle = (key: string, hidden: boolean) => {
    setError(null)
    void save({ [list]: setEntryHidden(list, setting, key, hidden) })
  }

  const add = async (event: FormEvent) => {
    event.preventDefault()
    const result = addCustomEntry(
      list,
      setting,
      label,
      options.map((o) => o.label)
    )
    if (!result.ok) {
      setError(ts(result.error))
      return
    }
    setError(null)
    const res = await save({ [list]: result.value })
    if (res.ok) setLabel('')
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">{ts(list)}</h3>
      <ul className="flex flex-col divide-y rounded-md border">
        {options.map((o) => (
          <li key={o.key} className="flex items-center justify-between gap-3 px-3 py-1.5 text-sm">
            <span className="flex items-center gap-2">
              <span className={o.hidden ? 'text-muted-foreground line-through' : undefined}>
                {o.label}
              </span>
              {o.custom && <Badge variant="secondary">{ts('own')}</Badge>}
              {o.hidden && <Badge variant="outline">{ts('hiddenBadge')}</Badge>}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={saving || !settings}
              aria-label={`${o.hidden ? ts('show') : ts('hide')}: ${o.label}`}
              onClick={() => toggle(o.key, !o.hidden)}
            >
              {o.hidden ? ts('show') : ts('hide')}
            </Button>
          </li>
        ))}
      </ul>
      <form onSubmit={(e) => void add(e)} className="flex gap-2" noValidate>
        <Input
          aria-label={`${ts('newEntry')}: ${ts(list)}`}
          placeholder={ts('newEntry')}
          maxLength={200}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="max-w-xs"
        />
        <Button type="submit" variant="outline" disabled={saving || !settings}>
          {t('common.add')}
        </Button>
      </form>
      <FieldMessage error>{error ?? saveErrorText}</FieldMessage>
    </div>
  )
}

/** Listen mit Standardschlüsseln und eigenen Einträgen: hinzufügen, aus-/einblenden (PE-54). */
export function ListsSection() {
  const ts = useT(settingsDict)
  return (
    <section aria-labelledby="settings-lists" className="flex flex-col gap-3">
      <h2 id="settings-lists" className="text-base font-semibold">
        {ts('listsTitle')}
      </h2>
      <FieldMessage>{ts('listsHint')}</FieldMessage>
      <div className="grid gap-6 lg:grid-cols-2">
        {LISTS.map((list) => (
          <ListEditor key={list} list={list} />
        ))}
      </div>
    </section>
  )
}
