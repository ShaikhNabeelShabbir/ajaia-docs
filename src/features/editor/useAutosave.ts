import type { JSONContent } from '@tiptap/core'
import { useEffect, useState } from 'react'
import { updateDocument } from '@/features/documents/api'
import { useInvalidateDocumentList } from '@/features/documents/hooks'
import { errorMessage } from '@/lib/errors'
import { SaveQueue, type SaveStatus } from './saveQueue'

const AUTOSAVE_DELAY_MS = 1000

/** Debounced, serialized autosave for one document's content, with a leave-page guard. */
export function useAutosave(documentId: string) {
  const invalidateList = useInvalidateDocumentList()
  const [status, setStatus] = useState<SaveStatus>('saved')
  const [error, setError] = useState<string | null>(null)

  const [queue] = useState(
    () =>
      new SaveQueue<JSONContent>(
        async (content) => {
          await updateDocument(documentId, { content })
          void invalidateList()
        },
        (next, err) => {
          setStatus(next)
          setError(next === 'error' ? errorMessage(err, "Couldn't save your changes.") : null)
        },
        AUTOSAVE_DELAY_MS,
      ),
  )

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!queue.hasUnsavedChanges()) return
      void queue.flush()
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      // Leaving the editor in-app (e.g. back to the list): save whatever is pending.
      void queue.flush()
      queue.dispose()
    }
  }, [queue])

  return {
    status,
    error,
    schedule: (content: JSONContent) => queue.schedule(content),
    flush: () => queue.flush(),
  }
}
