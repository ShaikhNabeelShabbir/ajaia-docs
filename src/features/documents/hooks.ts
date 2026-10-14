import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/auth-context'
import { createDocument, deleteDocument, getDocument, listDocuments, updateDocument } from './api'

export const documentKeys = {
  all: (userId: string) => ['documents', userId] as const,
  list: (userId: string) => [...documentKeys.all(userId), 'list'] as const,
  detail: (userId: string, id: string) => [...documentKeys.all(userId), 'detail', id] as const,
}

function useUserId(): string {
  const { user } = useAuth()
  if (!user) throw new Error('Document hooks require a signed-in user')
  return user.id
}

export function useDocuments() {
  const userId = useUserId()
  return useQuery({
    queryKey: documentKeys.list(userId),
    queryFn: () => listDocuments(userId),
  })
}

export function useDocument(id: string) {
  const userId = useUserId()
  return useQuery({
    queryKey: documentKeys.detail(userId, id),
    queryFn: () => getDocument(id, userId),
    // The open editor owns the content; never refetch underneath it, and always load fresh on open.
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
  })
}

export function useInvalidateDocumentList() {
  const userId = useUserId()
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: documentKeys.list(userId) })
}

export function useCreateDocument() {
  const invalidateList = useInvalidateDocumentList()
  return useMutation({ mutationFn: createDocument, onSuccess: invalidateList })
}

export function useRenameDocument(id: string) {
  const invalidateList = useInvalidateDocumentList()
  return useMutation({
    mutationFn: (title: string) => updateDocument(id, { title }),
    onSuccess: invalidateList,
  })
}

export function useDeleteDocument() {
  const invalidateList = useInvalidateDocumentList()
  return useMutation({ mutationFn: deleteDocument, onSuccess: invalidateList })
}
