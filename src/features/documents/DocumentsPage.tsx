import { AlertCircle, FileText, Inbox, Loader2, MoreHorizontal, Plus, Trash2, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { AppHeader } from '@/components/AppHeader'
import { StateMessage } from '@/components/StateMessage'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ImportDialog } from '@/features/file-import/ImportDialog'
import { ROLE_LABELS } from '@/features/sharing/api'
import { errorMessage } from '@/lib/errors'
import { formatRelativeTime } from '@/lib/format'
import type { DocumentSummary } from './api'
import { useCreateDocument, useDeleteDocument, useDocuments } from './hooks'

type Tab = 'mine' | 'shared'

export function DocumentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: Tab = searchParams.get('tab') === 'shared' ? 'shared' : 'mine'
  const documents = useDocuments()
  const createDocument = useCreateDocument()
  const navigate = useNavigate()
  const [pendingDelete, setPendingDelete] = useState<DocumentSummary | null>(null)

  const owned = documents.data?.filter((d) => d.role === 'owner') ?? []
  const shared = documents.data?.filter((d) => d.role !== 'owner') ?? []
  const visible = tab === 'mine' ? owned : shared

  function onCreate() {
    createDocument.mutate(
      {},
      {
        onSuccess: ({ id }) => navigate(`/d/${id}`, { state: { isNew: true } }),
        onError: (err) => toast.error(errorMessage(err, "Couldn't create a document.")),
      },
    )
  }

  return (
    <div className="min-h-svh bg-background">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <div className="flex gap-2">
            <ImportDialog />
            <Button onClick={onCreate} disabled={createDocument.isPending}>
              {createDocument.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
              New document
            </Button>
          </div>
        </div>

        <Tabs
          value={tab}
          onValueChange={(v) => setSearchParams(v === 'shared' ? { tab: 'shared' } : {}, { replace: true })}
          className="mt-6"
        >
          <TabsList>
            <TabsTrigger value="mine">
              My documents
              {documents.data && <Count n={owned.length} />}
            </TabsTrigger>
            <TabsTrigger value="shared">
              Shared with me
              {documents.data && <Count n={shared.length} />}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <section className="mt-4 overflow-hidden rounded-xl border" aria-label={tab === 'mine' ? 'My documents' : 'Shared with me'}>
          {documents.isPending ? (
            <ListSkeleton />
          ) : documents.isError ? (
            <StateMessage
              tone="error"
              icon={AlertCircle}
              title="Couldn't load your documents"
              description={errorMessage(documents.error)}
              action={<Button variant="outline" onClick={() => void documents.refetch()}>Try again</Button>}
            />
          ) : visible.length === 0 ? (
            tab === 'mine' ? (
              <StateMessage
                icon={FileText}
                title="No documents yet"
                description="Create a blank document, or import a .txt or .md file to get started."
                action={
                  <>
                    <ImportDialog />
                    <Button onClick={onCreate} disabled={createDocument.isPending}>
                      <Plus aria-hidden />
                      New document
                    </Button>
                  </>
                }
              />
            ) : (
              <StateMessage
                icon={Inbox}
                title="Nothing shared with you yet"
                description="When someone shares a document with you, it shows up here."
              />
            )
          ) : (
            <ul className="divide-y">
              {visible.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} onDelete={() => setPendingDelete(doc)} />
              ))}
            </ul>
          )}
        </section>
      </main>

      <DeleteDocumentDialog doc={pendingDelete} onClose={() => setPendingDelete(null)} />
    </div>
  )
}

function Count({ n }: { n: number }) {
  return <span className="ml-1 text-xs tabular-nums text-muted-foreground">{n}</span>
}

function DocumentRow({ doc, onDelete }: { doc: DocumentSummary; onDelete: () => void }) {
  const isOwner = doc.role === 'owner'

  return (
    <li className="group relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-within:bg-muted/50">
      <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <Link
          to={`/d/${doc.id}`}
          className="block truncate font-medium outline-none after:absolute after:inset-0 focus-visible:underline"
        >
          {doc.title}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          Edited {formatRelativeTime(doc.updatedAt)}
          {!isOwner && <> · Owner: {doc.ownerEmail ?? 'unknown'}</>}
        </p>
      </div>

      {doc.role === 'owner' ? (
        <>
          {doc.shareCount > 0 && (
            <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex" title="Shared with others">
              <Users className="size-3.5" aria-hidden />
              Shared with {doc.shareCount}
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="relative z-10" aria-label={`Actions for ${doc.title}`}>
                <MoreHorizontal aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                <Trash2 aria-hidden />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ) : (
        <Badge variant={doc.role === 'editor' ? 'secondary' : 'outline'}>{ROLE_LABELS[doc.role]}</Badge>
      )}
    </li>
  )
}

function DeleteDocumentDialog({ doc, onClose }: { doc: DocumentSummary | null; onClose: () => void }) {
  const deleteDocument = useDeleteDocument()

  return (
    <AlertDialog open={doc !== null} onOpenChange={(open) => !open && !deleteDocument.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{doc?.title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the document for you and everyone it's shared with. This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteDocument.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteDocument.isPending}
            onClick={(e) => {
              e.preventDefault()
              if (!doc) return
              deleteDocument.mutate(doc.id, {
                onSuccess: () => {
                  toast.success('Document deleted')
                  onClose()
                },
                onError: (err) => toast.error(errorMessage(err, "Couldn't delete the document.")),
              })
            }}
          >
            {deleteDocument.isPending && <Loader2 className="animate-spin" aria-hidden />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function ListSkeleton() {
  return (
    <ul className="divide-y" aria-busy="true" aria-label="Loading documents">
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-3.5">
          <Skeleton className="size-5 rounded" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/5" />
          </div>
        </li>
      ))}
    </ul>
  )
}
