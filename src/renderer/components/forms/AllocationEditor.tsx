import { useId, useMemo } from 'react'
import type { Project } from '@shared/schemas/project'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useFormat, useI18n, useT } from '@/i18n'
import { uiDict, type UiKey } from '@/i18n/shared-keys'
import { cn } from '@/lib/utils'
import {
  allocationPreview,
  FULL_PERCENT_BP,
  setAllocationMode,
  setAllocationPercent,
  setAllocationProjects,
  setAllocationSplit,
  validateAllocationDraft,
  type AllocationDraft
} from './allocation-logic'
import { FieldMessage } from './FieldMessage'
import { ProjectPicker } from './ProjectPicker'

export interface AllocationEditorProps {
  value: AllocationDraft
  onChange: (value: AllocationDraft) => void
  projects: readonly Project[]
  /** Betrag in Cent für die Vorschau (`null` = noch keiner eingegeben). */
  totalCents: number | null
  /** Währung des Betrags (nur für die Anzeige der Vorschau). */
  currency: string
  /** Stichtag für „alle aktiven Projekte“ (Buchungs- bzw. Starttag), "YYYY-MM-DD". */
  date: string
  disabled?: boolean
  className?: string
}

const ISSUE_KEYS: Record<string, UiKey> = {
  noProjectSelected: 'noProjectSelected',
  invalidPercent: 'invalidPercent',
  percentSumInvalid: 'percentSumInvalid'
}

/**
 * Aufteilung auf Projekte (PE-06): alle aktiven oder ausgewählte, gleichmäßig oder
 * nach Prozent, mit Live-Vorschau der Cent-Aufteilung (`splitCents`, Größter-Rest).
 * Speichern nur, wenn `validateAllocationDraft(value, language).allocation` nicht `null`
 * ist (z. B. Prozentsumme ≠ 100 %).
 *
 * @example
 * const [alloc, setAlloc] = useState(emptyAllocationDraft)
 * <AllocationEditor value={alloc} onChange={setAlloc} projects={projects}
 *   totalCents={10000} currency="EUR" date="2026-10-01" />
 * const { allocation } = validateAllocationDraft(alloc, language) // null → Speichern sperren
 */
export function AllocationEditor({
  value,
  onChange,
  projects,
  totalCents,
  currency,
  date,
  disabled,
  className
}: AllocationEditorProps) {
  const t = useT(uiDict)
  const fmt = useFormat()
  const { language } = useI18n()
  const id = useId()

  const validation = useMemo(() => validateAllocationDraft(value, language), [value, language])
  const preview = useMemo(
    () => allocationPreview(validation.allocation, projects, totalCents, date),
    [validation.allocation, projects, totalCents, date]
  )
  const names = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects])

  return (
    <fieldset className={cn('grid gap-4', className)} disabled={disabled}>
      <legend className="mb-2 text-sm font-medium">{t('allocation')}</legend>

      <RadioGroup
        aria-label={t('allocation')}
        value={value.mode}
        onValueChange={(m) => onChange(setAllocationMode(value, m === 'all' ? 'all' : 'selected'))}
        className="flex flex-wrap gap-4"
      >
        <Label>
          <RadioGroupItem value="all" /> {t('allocationAll')}
        </Label>
        <Label>
          <RadioGroupItem value="selected" /> {t('allocationSelected')}
        </Label>
      </RadioGroup>

      {value.mode === 'selected' && (
        <>
          <ProjectPicker
            multiple
            projects={projects}
            value={value.projectIds}
            onChange={(ids) => onChange(setAllocationProjects(value, ids, language))}
          />
          <RadioGroup
            aria-label={t('allocation')}
            value={value.split}
            onValueChange={(s) =>
              onChange(setAllocationSplit(value, s === 'percent' ? 'percent' : 'equal', language))
            }
            className="flex flex-wrap gap-4"
          >
            <Label>
              <RadioGroupItem value="equal" /> {t('splitEqual')}
            </Label>
            <Label>
              <RadioGroupItem value="percent" /> {t('splitPercent')}
            </Label>
          </RadioGroup>

          {value.split === 'percent' && value.projectIds.length > 0 && (
            <div className="grid gap-2">
              {value.projectIds.map((projectId) => {
                const name = names.get(projectId) ?? projectId
                const inputId = `${id}-${projectId}`
                return (
                  <div key={projectId} className="flex items-center gap-2">
                    <label htmlFor={inputId} className="flex-1 truncate text-sm">
                      {name}
                    </label>
                    <Input
                      id={inputId}
                      inputMode="decimal"
                      aria-label={t('percentOf', { name })}
                      value={value.percentTexts[projectId] ?? ''}
                      onChange={(e) =>
                        onChange(setAllocationPercent(value, projectId, e.target.value))
                      }
                      className="w-24 text-right"
                    />
                    <span aria-hidden="true" className="text-sm text-muted-foreground">
                      %
                    </span>
                  </div>
                )
              })}
              {validation.percentSumBasisPoints !== null && (
                <p
                  className={cn(
                    'text-right text-sm',
                    validation.percentSumBasisPoints === FULL_PERCENT_BP
                      ? 'text-muted-foreground'
                      : 'text-destructive'
                  )}
                >
                  {t('percentSum', {
                    sum: fmt.percent(validation.percentSumBasisPoints / FULL_PERCENT_BP, 2)
                  })}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {validation.issues.map((issue) => (
        <FieldMessage key={issue} error>
          {t(ISSUE_KEYS[issue] ?? 'percentSumInvalid')}
        </FieldMessage>
      ))}

      <div className="grid gap-1 rounded-md border bg-muted/30 p-3" aria-live="polite">
        <p className="text-sm font-medium">{t('preview')}</p>
        {totalCents === null ? (
          <p className="text-sm text-muted-foreground">{t('previewNeedsAmount')}</p>
        ) : preview.ok ? (
          <>
            <p className="text-xs text-muted-foreground">
              {t('previewHint', { amount: fmt.money(totalCents, currency) })}
            </p>
            <ul className="grid gap-0.5 text-sm">
              {preview.value.map((share) => (
                <li key={share.projectId} className="flex justify-between gap-4">
                  <span className="truncate">{names.get(share.projectId) ?? share.projectId}</span>
                  <span className="tabular-nums">{fmt.money(share.cents, currency)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : preview.error === 'unassignable' ? (
          <p className="text-sm text-destructive">{t('noActiveProjects')}</p>
        ) : null}
      </div>
    </fieldset>
  )
}
