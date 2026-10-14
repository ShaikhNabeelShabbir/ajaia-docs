import type { ShareRole } from '@/lib/database.types'
import { UserFacingError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'

export type Collaborator = {
  userId: string
  email: string | null
  role: ShareRole
  createdAt: string
}

export const ROLE_LABELS: Record<ShareRole, string> = { viewer: 'Viewer', editor: 'Editor' }

/** Owner-only in practice: RLS returns every share to the owner, and just their own row to others. */
export async function listCollaborators(documentId: string): Promise<Collaborator[]> {
  const { data, error } = await supabase
    .from('document_shares')
    .select('user_id, role, created_at, profile:profiles(email)')
    .eq('document_id', documentId)
    .order('created_at')
  if (error) throw error
  return data.map((row) => ({
    userId: row.user_id,
    email: row.profile?.email ?? null,
    role: row.role,
    createdAt: row.created_at,
  }))
}

/** Grants access, or changes the role if already shared. Ownership is checked inside the SQL function. */
export async function shareDocument(input: { documentId: string; email: string; role: ShareRole }): Promise<void> {
  const { error } = await supabase.rpc('share_document', {
    p_document_id: input.documentId,
    p_email: input.email.trim(),
    p_role: input.role,
  })
  if (error) throw error
}

export async function revokeAccess(input: { documentId: string; userId: string }): Promise<void> {
  const { data, error } = await supabase
    .from('document_shares')
    .delete()
    .eq('document_id', input.documentId)
    .eq('user_id', input.userId)
    .select('user_id')
  if (error) throw error
  if (!data.length) throw new UserFacingError('Only the owner can remove people from this document.')
}
