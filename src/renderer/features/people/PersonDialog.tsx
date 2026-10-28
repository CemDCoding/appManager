import { useMemo, useState } from 'react'
import type { Person } from '@shared/schemas/person'
import { FieldMessage } from '@/components/forms'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useEntityMutation } from '@/hooks'
import { useT } from '@/i18n'
import { peopleDict, type PeopleKey } from './i18n'
import {
  emptyPersonInput,
  inputFromPerson,
  validatePersonInput,
  type PersonInput,
  type PersonIssue
} from './people-logic'

const ISSUE_KEYS: Record<PersonIssue, PeopleKey> = {
  nameRequired: 'issueNameRequired',
  nameTooLong: 'issueNameTooLong',
  roleTooLong: 'issueRoleTooLong',
  noteTooLong: 'issueNoteTooLong'
}

export interface PersonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Zu bearbeitende Person; `null` = neu anlegen. */
  person: Person | null
  onSaved?: (person: Person) => void
}

/** Dialog zum Anlegen und Bearbeiten einer Person (Name, Rolle, Status, Notiz; PE-36). */
export function PersonDialog({ open, onOpenChange, person, onSaved }: PersonDialogProps) {
  const tc = useT()
  const tp = useT(peopleDict)
  const { create, update, pending, errorText } = useEntityMutation('persons')
  const [draft, setDraft] = useState<PersonInput>(() =>
    person ? inputFromPerson(person) : emptyPersonInput()
  )
  const [submitted, setSubmitted] = useState(false)
  const result = useMemo(() => validatePersonInput(draft), [draft])
  const issues = result.ok ? [] : result.error
  const set = (patch: Partial<PersonInput>) => setDraft((d) => ({ ...d, ...patch }))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (!result.ok) return
    const res = person ? await update(person.id, result.value) : await create(result.value)
    if (res.ok) {
      onSaved?.(res.data)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <form onSubmit={(e) => void submit(e)} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{person ? tp('edit') : tp('add')}</DialogTitle>
            <DialogDescription>{tp('formHint')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="person-name">{tp('formName')}</Label>
            <Input
              id="person-name"
              value={draft.name}
              onChange={(e) => set({ name: e.target.value })}
              aria-invalid={
                submitted && !result.ok && issues.some((i) => i.startsWith('name'))
                  ? true
                  : undefined
              }
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="person-role">{tp('formRole')}</Label>
            <Input
              id="person-role"
              value={draft.role}
              onChange={(e) => set({ role: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="person-status">{tp('formStatus')}</Label>
            <Select
              id="person-status"
              value={draft.status}
              onValueChange={(v) => set({ status: v === 'inactive' ? 'inactive' : 'active' })}
            >
              <option value="active">{tp('statusActive')}</option>
              <option value="inactive">{tp('statusInactive')}</option>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="person-note">{tp('formNote')}</Label>
            <Input
              id="person-note"
              value={draft.note}
              onChange={(e) => set({ note: e.target.value })}
            />
          </div>
          {submitted &&
            issues.map((i) => (
              <FieldMessage key={i} error>
                {tp(ISSUE_KEYS[i])}
              </FieldMessage>
            ))}
          <FieldMessage error>{errorText}</FieldMessage>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tc('common.cancel')}
            </Button>
            <Button type="submit" disabled={pending}>
              {tc('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
