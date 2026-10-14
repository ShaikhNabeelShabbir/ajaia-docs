import type { JSONContent } from '@tiptap/core'
import type { DocumentRole, Json } from '@/lib/database.types'
import { UserFacingError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'

export type DocumentSummary = {
  id: string
  title: string
  ownerId: string
  ownerEmail: string | null
  /** The current user's access level. */
  role: DocumentRole
  /** Number of collaborators (only known to the owner). */
  shareCount: number
  createdAt: string
  updatedAt: string
}

export type DocumentDetail = DocumentSummary & { content: JSONContent }

// `document_shares` links documents and profiles, so PostgREST sees two paths from
// documents to profiles; the FK hint picks the owner relationship explicitly.
const SUMMARY_COLUMNS =
  'id, title, owner_id, created_at, updated_at, owner:profiles!documents_owner_id_fkey(email), document_shares(user_id, role)'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type SummaryRow = {
  id: string
  title: string
  owner_id: string
  created_at: string
  updated_at: string
  owner: { email: string } | null
  document_shares: { user_id: string; role: 'viewer' | 'editor' }[]
}

function toSummary(row: SummaryRow, userId: string): DocumentSummary {
  const isOwner = row.owner_id === userId
  // RLS returns all share rows to the owner, and only their own row to a collaborator.
  const myShare = row.document_shares.find((s) => s.user_id === userId)
  return {
    id: row.id,
    title: row.title,
    ownerId: row.owner_id,
    ownerEmail: row.owner?.email ?? null,
    role: isOwner ? 'owner' : (myShare?.role ?? 'viewer'),
    shareCount: isOwner ? row.document_shares.length : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** Owned and shared documents in one query (RLS filters to what the user may see). No bodies. */
export async function listDocuments(userId: string): Promise<DocumentSummary[]> {
  const { data, error } = await supabase
    .from('documents')
    .select(SUMMARY_COLUMNS)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data as SummaryRow[]).map((row) => toSummary(row, userId))
}

/** Returns null when the document doesn't exist *or* the user has no access (indistinguishable by design). */
export async function getDocument(id: string, userId: string): Promise<DocumentDetail | null> {
  if (!UUID_RE.test(id)) return null
  const { data, error } = await supabase
    .from('documents')
    .select(`${SUMMARY_COLUMNS}, content`)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const row = data as SummaryRow & { content: Json }
  return { ...toSummary(row, userId), content: row.content as JSONContent }
}

export async function createDocument(input: { title?: string; content?: JSONContent } = {}): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('documents')
    .insert({ title: input.title, content: input.content as Json | undefined })
    .select('id')
    .single()
  if (error) throw error
  return data
}

export async function updateDocument(
  id: string,
  patch: { title?: string; content?: JSONContent },
): Promise<{ updatedAt: string }> {
  // An update blocked by RLS "succeeds" with zero rows, so ask for the row back to detect it.
  const { data, error } = await supabase
    .from('documents')
    .update({ title: patch.title, content: patch.content as Json | undefined })
    .eq('id', id)
    .select('updated_at')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new UserFacingError('This document was deleted, or you no longer have permission to edit it.')
  return { updatedAt: data.updated_at }
}

export async function deleteDocument(id: string): Promise<void> {
  const { data, error } = await supabase.from('documents').delete().eq('id', id).select('id')
  if (error) throw error
  if (!data.length) throw new UserFacingError('Only the owner can delete this document.')
}
