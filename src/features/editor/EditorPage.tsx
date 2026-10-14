import { Placeholder } from '@tiptap/extensions'
import { EditorContent, useEditor } from '@tiptap/react'
import { AlertCircle, ArrowLeft, Check, CircleAlert, Eye, FileQuestion, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { StateMessage } from '@/components/StateMessage'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { DocumentDetail } from '@/features/documents/api'
import { useDocument } from '@/features/documents/hooks'
import { ShareDialog } from '@/features/sharing/ShareDialog'
import { ROLE_LABELS } from '@/features/sharing/api'
import { errorMessage } from '@/lib/errors'
import type { SaveStatus } from './saveQueue'
import { schemaExtensions } from './schema'
import { TitleInput } from './TitleInput'
import { Toolbar } from './Toolbar'
import { useAutosave } from './useAutosave'

export function EditorPage() {
  const { id = '' } = useParams()
  const document = useDocument(id)

  if (document.isPending) return <EditorSkeleton />
  if (document.isError) {
    return (
      <CenteredState>
        <StateMessage
          tone="error"
          icon={AlertCircle}
          title="Couldn't load this document"
          description={errorMessage(document.error)}
          action={
            <>
              <Button variant="outline" asChild>
                <Link to="/">Back to documents</Link>
              </Button>
              <Button onClick={() => void document.refetch()}>Try again</Button>
            </>
          }
        />
      </CenteredState>
    )
  }
  if (!document.data) {
    return (
      <CenteredState>
        <StateMessage
          icon={FileQuestion}
          title="Document not found"
          description="It may have been deleted, or you don't have access to it. Ask the owner to share it with you."
          action={
            <Button asChild>
              <Link to="/">Back to documents</Link>
            </Button>
          }
        />
      </CenteredState>
    )
  }
  return <DocumentEditor key={document.data.id} doc={document.data} />
}

function DocumentEditor({ doc }: { doc: DocumentDetail }) {
  const location = useLocation()
  const isNew = (location.state as { isNew?: boolean } | null)?.isNew === true
  const canEdit = doc.role !== 'viewer'
  const [title, setTitle] = useState(doc.title)
  const autosave = useAutosave(doc.id)

  const editor = useEditor({
    extensions: [...schemaExtensions, Placeholder.configure({ placeholder: canEdit ? 'Start writing…' : '' })],
    content: doc.content,
    editable: canEdit,
    autofocus: canEdit && !isNew ? 'end' : false,
    editorProps: {
      attributes: { class: 'doc-content', 'aria-label': 'Document content' },
    },
    onUpdate: ({ editor: e }) => autosave.schedule(e.getJSON()),
  })

  useEffect(() => {
    window.document.title = `${title} · Ajaia Docs`
    return () => {
      window.document.title = 'Ajaia Docs'
    }
  }, [title])

  // Ctrl/Cmd+S saves immediately instead of opening the browser's "Save page" dialog.
  const { flush } = autosave
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (canEdit) void flush()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canEdit, flush])

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-3 sm:px-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/" aria-label="Back to documents">
              <ArrowLeft aria-hidden />
            </Link>
          </Button>

          {canEdit ? (
            <TitleInput documentId={doc.id} initialTitle={doc.title} autoFocus={isNew} onSaved={setTitle} />
          ) : (
            <h1 className="min-w-0 flex-1 truncate px-2 text-base font-medium">{doc.title}</h1>
          )}

          <div className="flex shrink-0 items-center gap-2">
            {canEdit && <SaveIndicator status={autosave.status} error={autosave.error} onRetry={() => void autosave.flush()} />}
            {doc.role !== 'owner' && (
              <Badge variant="outline" className="hidden sm:inline-flex">
                {doc.role === 'viewer' && <Eye aria-hidden />}
                {ROLE_LABELS[doc.role]}
              </Badge>
            )}
            {doc.role === 'owner' && <ShareDialog documentId={doc.id} documentTitle={title} ownerEmail={doc.ownerEmail} />}
          </div>
        </div>
        {canEdit && editor && (
          <div className="border-t">
            <Toolbar editor={editor} />
          </div>
        )}
      </header>

      {!canEdit && (
        <div className="border-b bg-muted/50 px-4 py-2 text-center text-sm text-muted-foreground" role="status">
          <Eye className="mr-1.5 inline size-4 align-[-3px]" aria-hidden />
          View only · Shared by {doc.ownerEmail ?? 'the owner'}
        </div>
      )}
      {doc.role === 'editor' && (
        <p className="mx-auto max-w-3xl px-4 pt-4 text-xs text-muted-foreground sm:px-8">
          Shared by {doc.ownerEmail ?? 'the owner'} · You can edit
        </p>
      )}

      <main className="mx-auto max-w-3xl px-4 pt-8 pb-32 sm:px-8 sm:pt-12">
        <EditorContent editor={editor} />
      </main>
    </div>
  )
}

function SaveIndicator({ status, error, onRetry }: { status: SaveStatus; error: string | null; onRetry: () => void }) {
  return (
    <div aria-live="polite" className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {status === 'saved' && (
        <>
          <Check className="size-3.5" aria-hidden />
          <span>Saved</span>
        </>
      )}
      {status === 'pending' && <span>Unsaved changes</span>}
      {status === 'saving' && (
        <>
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          <span>Saving…</span>
        </>
      )}
      {status === 'error' && (
        <>
          <CircleAlert className="size-3.5 text-destructive" aria-hidden />
          <span className="text-destructive" title={error ?? undefined}>
            Not saved
          </span>
          <Button variant="link" size="xs" className="h-auto px-0" onClick={onRetry}>
            Retry
          </Button>
          <span className="sr-only">{error}</span>
        </>
      )}
    </div>
  )
}

function CenteredState({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-svh place-items-center px-4">{children}</div>
}

function EditorSkeleton() {
  return (
    <div className="min-h-svh" aria-busy="true" aria-label="Loading document">
      <div className="flex h-14 items-center gap-3 border-b px-4">
        <Skeleton className="size-8" />
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="mx-auto max-w-3xl space-y-3 px-4 pt-12 sm:px-8">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  )
}
