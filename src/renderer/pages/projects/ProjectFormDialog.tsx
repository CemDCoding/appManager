import { useId, useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { CategorySelect, DateInput, FieldMessage } from '@/components/forms'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { fieldClassName, Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast-context'
import { useEntityMutation } from '@/hooks'
import { useT } from '@/i18n'
import { projectPhaseDict } from '@/i18n/shared-keys'
import { MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH } from '@shared/limits'
import type { Project } from '@shared/schemas/project'
import { PROJECT_PHASES, type ProjectPhase } from '@shared/lists'
import { projectsDict, type ProjectsKey } from './i18n'
import {
  MAX_LINKS,
  emptyForm,
  formFromProject,
  suggestEndDate,
  todayIso,
  toProjectInput,
  validateForm,
  type FieldError,
  type ProjectForm
} from './logic'

const ERROR_KEYS: Record<FieldError, ProjectsKey> = {
  required: 'errRequired',
  tooLong: 'errTooLong',
  invalidDate: 'errInvalidDate',
  endBeforeStart: 'errEndBeforeStart',
  invalidUrl: 'errInvalidUrl',
  tooMany: 'errTooMany'
}

export interface ProjectFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Zu bearbeitendes Projekt; ohne Wert wird ein neues angelegt. */
  project?: Project
  /** Wird nach erfolgreichem Speichern aufgerufen. */
  onSaved?: (project: Project) => void
}

/** Dialog zum Anlegen und Bearbeiten eines Projekts (PE-34). */
export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  onSaved
}: ProjectFormDialogProps) {
  const tp = useT(projectsDict)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" dismissOnBackdrop={false}>
        <DialogHeader>
          <DialogTitle>{project ? tp('editProject') : tp('newProject')}</DialogTitle>
        </DialogHeader>
        {/* Wird nur bei geöffnetem Dialog gemountet, der Formularstand startet jedes Mal neu. */}
        <ProjectFormBody project={project} onClose={() => onOpenChange(false)} onSaved={onSaved} />
      </DialogContent>
    </Dialog>
  )
}

function ProjectFormBody({
  project,
  onClose,
  onSaved
}: {
  project?: Project
  onClose: () => void
  onSaved?: (project: Project) => void
}) {
  const tp = useT(projectsDict)
  const tc = useT()
  const tPhase = useT(projectPhaseDict)
  const { toast } = useToast()
  const { create, update, pending, errorText } = useEntityMutation('projects')
  const id = useId()
  const [form, setForm] = useState<ProjectForm>(() =>
    project ? formFromProject(project) : emptyForm(todayIso())
  )
  const [submitted, setSubmitted] = useState(false)
  const [endSuggested, setEndSuggested] = useState(false)

  const { errors } = validateForm(form)
  const show = <K extends 'name' | 'description' | 'startDate' | 'endDate' | 'links'>(key: K) =>
    submitted && errors[key] ? tp(ERROR_KEYS[errors[key]]) : null
  const patch = (changes: Partial<ProjectForm>) => setForm((f) => ({ ...f, ...changes }))

  const changePhase = (next: ProjectPhase) => {
    const endDate = suggestEndDate(form.phase, next, form.endDate, todayIso())
    setEndSuggested(endDate !== form.endDate)
    patch({ phase: next, endDate })
  }

  const setLink = (index: number, changes: Partial<ProjectForm['links'][number]>) =>
    patch({ links: form.links.map((l, i) => (i === index ? { ...l, ...changes } : l)) })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (!validateForm(form).ok) return
    const input = toProjectInput(form, project?.archived ?? false)
    const result = project ? await update(project.id, input) : await create(input)
    if (result.ok) {
      toast({ title: tp('saved') })
      onSaved?.(result.data)
      onClose()
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="grid gap-4">
      <div className="grid gap-1">
        <Label htmlFor={`${id}-name`}>{tp('fName')}</Label>
        <Input
          id={`${id}-name`}
          value={form.name}
          maxLength={MAX_NAME_LENGTH}
          required
          aria-invalid={show('name') ? true : undefined}
          aria-describedby={`${id}-name-msg`}
          onChange={(e) => patch({ name: e.target.value })}
        />
        <FieldMessage id={`${id}-name-msg`} error>
          {show('name')}
        </FieldMessage>
      </div>

      <div className="grid gap-1">
        <Label htmlFor={`${id}-desc`}>{tp('fDescription')}</Label>
        <textarea
          id={`${id}-desc`}
          className={`${fieldClassName} h-24 py-2`}
          value={form.description}
          maxLength={MAX_DESCRIPTION_LENGTH}
          aria-invalid={show('description') ? true : undefined}
          aria-describedby={`${id}-desc-msg`}
          onChange={(e) => patch({ description: e.target.value })}
        />
        <FieldMessage id={`${id}-desc-msg`} error>
          {show('description')}
        </FieldMessage>
      </div>

      <div className="grid gap-1">
        <span id={`${id}-platforms`} className="text-sm font-medium">
          {tp('fPlatforms')}
        </span>
        <CategorySelect
          multiple
          list="projectPlatforms"
          value={form.platforms}
          onChange={(platforms) => patch({ platforms })}
          aria-label={tp('fPlatforms')}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-1">
          <Label htmlFor={`${id}-phase`}>{tp('fPhase')}</Label>
          <Select
            id={`${id}-phase`}
            value={form.phase}
            onValueChange={(v) => {
              const next = PROJECT_PHASES.find((p) => p === v)
              if (next) changePhase(next)
            }}
          >
            {PROJECT_PHASES.map((p) => (
              <option key={p} value={p}>
                {tPhase(p)}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${id}-start`}>{tp('fStartDate')}</Label>
          <DateInput
            id={`${id}-start`}
            value={form.startDate}
            required
            invalid={show('startDate') ? true : undefined}
            aria-describedby={`${id}-start-msg`}
            onValueChange={(startDate) => patch({ startDate })}
          />
          <FieldMessage id={`${id}-start-msg`} error>
            {show('startDate')}
          </FieldMessage>
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${id}-end`}>{tp('fEndDate')}</Label>
          <DateInput
            id={`${id}-end`}
            value={form.endDate}
            invalid={show('endDate') ? true : undefined}
            aria-describedby={`${id}-end-msg`}
            onValueChange={(endDate) => {
              setEndSuggested(false)
              patch({ endDate })
            }}
          />
          <FieldMessage id={`${id}-end-msg`} error={show('endDate') !== null}>
            {show('endDate') ?? (endSuggested ? tp('endDateSuggested') : null)}
          </FieldMessage>
        </div>
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">{tp('fLinks')}</legend>
        {form.links.map((link, index) => {
          const row = errors.linkRows[index] ?? {}
          const urlError = submitted && row.url ? tp(ERROR_KEYS[row.url]) : null
          return (
            <div key={index} className="grid grid-cols-[1fr_2fr_auto] items-start gap-2">
              <Input
                aria-label={`${tp('linkLabel')} ${index + 1}`}
                value={link.label}
                maxLength={MAX_NAME_LENGTH}
                placeholder={tp('linkLabel')}
                onChange={(e) => setLink(index, { label: e.target.value })}
              />
              <div className="grid gap-1">
                <Input
                  aria-label={`${tp('linkUrl')} ${index + 1}`}
                  value={link.url}
                  inputMode="url"
                  placeholder="https://"
                  aria-invalid={urlError ? true : undefined}
                  aria-describedby={`${id}-link-${index}-msg`}
                  onChange={(e) => setLink(index, { url: e.target.value })}
                />
                <FieldMessage id={`${id}-link-${index}-msg`} error>
                  {urlError}
                </FieldMessage>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={tp('removeLink', { index: index + 1 })}
                title={tp('removeLink', { index: index + 1 })}
                onClick={() => patch({ links: form.links.filter((_, i) => i !== index) })}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          )
        })}
        <FieldMessage error>{show('links')}</FieldMessage>
        <div>
          <Button
            variant="outline"
            size="sm"
            disabled={form.links.length >= MAX_LINKS}
            onClick={() => patch({ links: [...form.links, { label: '', url: '' }] })}
          >
            <Plus aria-hidden="true" />
            {tp('addLink')}
          </Button>
        </div>
      </fieldset>

      <FieldMessage error>{errorText}</FieldMessage>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={pending}>
          {tc('common.cancel')}
        </Button>
        <Button type="submit" disabled={pending}>
          {tc('common.save')}
        </Button>
      </DialogFooter>
    </form>
  )
}
