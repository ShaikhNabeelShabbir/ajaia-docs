import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useInvalidateDocumentList } from '@/features/documents/hooks'
import { listCollaborators, revokeAccess, shareDocument } from './api'

const collaboratorKey = (documentId: string) => ['collaborators', documentId] as const

export function useCollaborators(documentId: string, enabled = true) {
  return useQuery({
    queryKey: collaboratorKey(documentId),
    queryFn: () => listCollaborators(documentId),
    enabled,
  })
}

function useOnSharesChanged(documentId: string) {
  const queryClient = useQueryClient()
  const invalidateList = useInvalidateDocumentList()
  return () =>
    Promise.all([queryClient.invalidateQueries({ queryKey: collaboratorKey(documentId) }), invalidateList()])
}

export function useShareDocument(documentId: string) {
  const onChanged = useOnSharesChanged(documentId)
  return useMutation({ mutationFn: shareDocument, onSuccess: onChanged })
}

export function useRevokeAccess(documentId: string) {
  const onChanged = useOnSharesChanged(documentId)
  return useMutation({ mutationFn: revokeAccess, onSuccess: onChanged })
}
