import { Loader2, UserPlus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import type { ShareRole } from '@/lib/database.types'
import { errorMessage } from '@/lib/errors'
import { ROLE_LABELS, type Collaborator } from './api'
import { useCollaborators, useRevokeAccess, useShareDocument } from './hooks'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ShareDialog({
  documentId,
  documentTitle,
  ownerEmail,
}: {
  documentId: string
  documentTitle: string
  ownerEmail: string | null
}) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ShareRole>('editor')
  const [formError, setFormError] = useState<string | null>(null)
  const collaborators = useCollaborators(documentId, open)
  const share = useShareDocument(documentId)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!EMAIL_RE.test(trimmed)) {
      setFormError('Enter a valid email address.')
      return
    }
    if (ownerEmail && trimmed.toLowerCase() === ownerEmail.toLowerCase()) {
      setFormError('You already own this document.')
      return
    }
    setFormError(null)
    share.mutate(
      { documentId, email: trimmed, role },
      {
        onSuccess: () => {
          toast.success(`Shared with ${trimmed} as ${ROLE_LABELS[role].toLowerCase()}`)
          setEmail('')
        },
        onError: (err) => setFormError(errorMessage(err, "Couldn't share the document.")),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus aria-hidden />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">Share “{documentTitle}”</DialogTitle>
          <DialogDescription>People you add must already have an Ajaia Docs account.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-2" noValidate>
          <Label htmlFor="share-email">Add people</Label>
          <div className="flex gap-2">
            <Input
              id="share-email"
              type="email"
              autoComplete="off"
              placeholder="teammate@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setFormError(null)
              }}
              aria-invalid={formError ? true : undefined}
              aria-describedby={formError ? 'share-error' : undefined}
              className="flex-1"
            />
            <RoleSelect value={role} onChange={setRole} label="Access level for new person" />
          </div>
          {formError && (
            <p id="share-error" role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
          <div className="flex justify-end pt-1">
            <Button type="submit" disabled={share.isPending || !email.trim()}>
              {share.isPending && <Loader2 className="animate-spin" aria-hidden />}
              Share
            </Button>
          </div>
        </form>

        <Separator />

        <section aria-labelledby="people-heading" className="space-y-3">
          <h3 id="people-heading" className="text-sm font-medium">
            People with access
          </h3>
          <ul className="space-y-2">
            <li className="flex items-center gap-3">
              <Avatar email={ownerEmail} />
              <span className="min-w-0 flex-1 truncate text-sm">
                {ownerEmail ?? 'You'} <span className="text-muted-foreground">(you)</span>
              </span>
              <span className="text-sm text-muted-foreground">Owner</span>
            </li>
            {collaborators.isPending ? (
              <li>
                <Skeleton className="h-8 w-full" />
              </li>
            ) : collaborators.isError ? (
              <li role="alert" className="text-sm text-destructive">
                {errorMessage(collaborators.error, "Couldn't load collaborators.")}
              </li>
            ) : (
              collaborators.data.map((person) => (
                <CollaboratorRow key={person.userId} documentId={documentId} person={person} />
              ))
            )}
          </ul>
        </section>
      </DialogContent>
    </Dialog>
  )
}

function CollaboratorRow({ documentId, person }: { documentId: string; person: Collaborator }) {
  const share = useShareDocument(documentId)
  const revoke = useRevokeAccess(documentId)
  const label = person.email ?? 'Unknown user'

  return (
    <li className="flex items-center gap-3">
      <Avatar email={person.email} />
      <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
      <RoleSelect
        value={person.role}
        label={`Access level for ${label}`}
        disabled={share.isPending || revoke.isPending || !person.email}
        onChange={(role) =>
          share.mutate(
            { documentId, email: person.email!, role },
            {
              onSuccess: () => toast.success(`${label} is now ${role === 'editor' ? 'an editor' : 'a viewer'}`),
              onError: (err) => toast.error(errorMessage(err, "Couldn't change access.")),
            },
          )
        }
      />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Remove access for ${label}`}
        disabled={revoke.isPending}
        onClick={() =>
          revoke.mutate(
            { documentId, userId: person.userId },
            {
              onSuccess: () => toast.success(`Removed ${label}`),
              onError: (err) => toast.error(errorMessage(err, "Couldn't remove access.")),
            },
          )
        }
      >
        {revoke.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <X aria-hidden />}
      </Button>
    </li>
  )
}

function RoleSelect({
  value,
  onChange,
  label,
  disabled,
}: {
  value: ShareRole
  onChange: (role: ShareRole) => void
  label: string
  disabled?: boolean
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ShareRole)} disabled={disabled}>
      <SelectTrigger className="w-26 shrink-0" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="viewer">{ROLE_LABELS.viewer}</SelectItem>
        <SelectItem value="editor">{ROLE_LABELS.editor}</SelectItem>
      </SelectContent>
    </Select>
  )
}

function Avatar({ email }: { email: string | null }) {
  return (
    <span
      aria-hidden
      className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium uppercase text-muted-foreground"
    >
      {email?.[0] ?? '?'}
    </span>
  )
}
