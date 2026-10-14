import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useRenameDocument } from '@/features/documents/hooks'
import { errorMessage } from '@/lib/errors'

const MAX_TITLE_LENGTH = 200

/** Inline-editable title. Saves on blur or Enter; Escape reverts. Empty titles are rejected. */
export function TitleInput({
  documentId,
  initialTitle,
  autoFocus,
  onSaved,
}: {
  documentId: string
  initialTitle: string
  autoFocus?: boolean
  onSaved?: (title: string) => void
}) {
  const [value, setValue] = useState(initialTitle)
  const savedTitle = useRef(initialTitle)
  const inputRef = useRef<HTMLInputElement>(null)
  const rename = useRenameDocument(documentId)

  useEffect(() => {
    if (autoFocus) inputRef.current?.select()
  }, [autoFocus])

  function commit() {
    const next = value.trim()
    if (next === savedTitle.current) {
      setValue(next)
      return
    }
    if (!next) {
      setValue(savedTitle.current)
      toast.error("Title can't be empty.")
      return
    }
    rename.mutate(next, {
      onSuccess: () => {
        savedTitle.current = next
        setValue(next)
        onSaved?.(next)
      },
      onError: (err) => {
        setValue(savedTitle.current)
        toast.error(errorMessage(err, "Couldn't rename the document."))
      },
    })
  }

  return (
    <input
      ref={inputRef}
      aria-label="Document title"
      value={value}
      maxLength={MAX_TITLE_LENGTH}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          setValue(savedTitle.current)
          // Blur after the state update so commit() sees the reverted value.
          requestAnimationFrame(() => inputRef.current?.blur())
        }
      }}
      className="h-8 min-w-0 flex-1 truncate rounded-md bg-transparent px-2 text-base font-medium outline-none transition-colors hover:bg-muted focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-ring/50"
    />
  )
}
