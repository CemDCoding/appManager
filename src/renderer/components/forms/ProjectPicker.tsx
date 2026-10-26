import { useId } from 'react'
import type { Project } from '@shared/schemas/project'
import { Checkbox } from '@/components/ui/checkbox'
import { Select } from '@/components/ui/select'
import { useT } from '@/i18n'
import { uiDict } from '@/i18n/shared-keys'
import { cn } from '@/lib/utils'

type PickerProject = Pick<Project, 'id' | 'name' | 'archived'>

interface CommonProps {
  /** Projekte zur Auswahl (z. B. aus `useCollection('projects')`). */
  projects: readonly PickerProject[]
  /** Archivierte Projekte anbieten? Bereits gewählte bleiben immer sichtbar. */
  includeArchived?: boolean
  disabled?: boolean
  className?: string
  'aria-label'?: string
}

export type ProjectPickerProps =
  | (CommonProps & {
      multiple: true
      value: readonly string[]
      onChange: (ids: string[]) => void
    })
  | (CommonProps & {
      multiple?: false
      value: string
      onChange: (id: string) => void
      /** Leere Auswahl erlauben (Text „Bitte wählen“). */
      allowEmpty?: boolean
    })

/** Sichtbare Projekte: ohne Archivierte, außer sie sind gewählt. */
export function visibleProjects<P extends PickerProject>(
  projects: readonly P[],
  selected: readonly string[],
  includeArchived: boolean
): P[] {
  const keep = new Set(selected)
  return projects.filter((p) => includeArchived || !p.archived || keep.has(p.id))
}

/**
 * Projektauswahl: einzeln (Auswahlfeld) oder mehrfach (Checkbox-Liste, Reihenfolge
 * der Auswahl bleibt erhalten).
 *
 * @example
 * <ProjectPicker projects={projects} value={projectId} onChange={setProjectId} allowEmpty />
 * <ProjectPicker multiple projects={projects} value={ids} onChange={setIds} />
 */
export function ProjectPicker(props: ProjectPickerProps) {
  const t = useT(uiDict)
  const groupId = useId()
  const { projects, includeArchived = false, disabled, className } = props
  const label = props['aria-label'] ?? (props.multiple ? t('projects') : t('project'))

  if (!props.multiple) {
    const list = visibleProjects(projects, props.value ? [props.value] : [], includeArchived)
    return (
      <Select
        aria-label={label}
        value={props.value}
        disabled={disabled}
        onValueChange={props.onChange}
        className={className}
      >
        {(props.allowEmpty || props.value === '') && <option value="">{t('selectProject')}</option>}
        {list.map((p) => (
          <option key={p.id} value={p.id}>
            {p.archived ? `${p.name} (${t('archived')})` : p.name}
          </option>
        ))}
      </Select>
    )
  }

  const { value, onChange } = props
  const list = visibleProjects(projects, value, includeArchived)
  if (list.length === 0) {
    return <p className={cn('text-sm text-muted-foreground', className)}>{t('noProjects')}</p>
  }
  const selected = new Set(value)
  return (
    <div role="group" aria-label={label} className={cn('grid gap-2', className)}>
      {list.map((p) => {
        const id = `${groupId}-${p.id}`
        return (
          <label key={p.id} htmlFor={id} className="flex items-center gap-2 text-sm">
            <Checkbox
              id={id}
              checked={selected.has(p.id)}
              disabled={disabled}
              onCheckedChange={(checked) =>
                onChange(checked ? [...value, p.id] : value.filter((v) => v !== p.id))
              }
            />
            <span>{p.name}</span>
            {p.archived && <span className="text-xs text-muted-foreground">({t('archived')})</span>}
          </label>
        )
      })}
    </div>
  )
}
