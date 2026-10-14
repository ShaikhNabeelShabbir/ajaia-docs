import { FileUp, Loader2, Upload } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { useNavigate } from 'react-router'
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
import { useCreateDocument } from '@/features/documents/hooks'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { IMPORT_ACCEPT, SUPPORTED_TYPES_LABEL } from './validate'

export function ImportDialog() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const createDocument = useCreateDocument()
  const navigate = useNavigate()

  async function importFile(file: File) {
    setError(null)
    setBusy(true)
    try {
      // The Markdown parser is only needed here, so load it on demand.
      const { fileToDocument } = await import('./convert')
      const { title, content } = await fileToDocument(file)
      const { id } = await createDocument.mutateAsync({ title, content })
      toast.success(`Imported “${title}”`)
      setOpen(false)
      navigate(`/d/${id}`)
    } catch (err) {
      setError(errorMessage(err, "We couldn't import that file. Please try again."))
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && !busy) void importFile(file)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return
        setOpen(next)
        setError(null)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload aria-hidden />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import a file</DialogTitle>
          <DialogDescription>
            Creates a new document from a text or Markdown file. Markdown headings, lists, links and
            formatting are kept.
          </DialogDescription>
        </DialogHeader>

        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          aria-describedby="import-types"
          className={cn(
            'flex w-full flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center transition-colors outline-none',
            'hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-70',
            dragging && 'border-primary bg-muted',
          )}
        >
          {busy ? (
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
          ) : (
            <FileUp className="size-6 text-muted-foreground" aria-hidden />
          )}
          <span className="text-sm font-medium">{busy ? 'Importing…' : 'Choose a file or drag it here'}</span>
          <span id="import-types" className="text-xs text-muted-foreground">
            Supported: {SUPPORTED_TYPES_LABEL}
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={IMPORT_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void importFile(file)
          }}
        />

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
