/**
 * Proves sharing permissions are enforced by Postgres (RLS + grants + RPC), not just hidden in the UI.
 * Runs against a real Supabase project using two throwaway users that are deleted afterwards.
 *
 *   npm run test:integration   (needs VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY)
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '../../src/lib/database.types'

const url = process.env.VITE_SUPABASE_URL
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const secretKey = process.env.SUPABASE_SECRET_KEY
const configured = Boolean(url && publishableKey && secretKey)

type Client = SupabaseClient<Database>
const noSession = { auth: { persistSession: false, autoRefreshToken: false } }

describe.skipIf(!configured)('document access control (RLS)', () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const password = `rls-test-${runId}`
  const ownerEmail = `rls-owner-${runId}@example.com`
  const otherEmail = `rls-other-${runId}@example.com`

  let admin: Client
  let owner: Client
  let other: Client
  let anon: Client
  let ownerId: string
  let otherId: string
  let docId: string

  async function signedInClient(email: string): Promise<Client> {
    const client = createClient<Database>(url!, publishableKey!, noSession)
    const { error } = await client.auth.signInWithPassword({ email, password })
    if (error) throw error
    return client
  }

  async function ownerReadsContent() {
    const { data } = await owner.from('documents').select('content').eq('id', docId).single()
    return data?.content
  }

  beforeAll(async () => {
    admin = createClient<Database>(url!, secretKey!, noSession)
    anon = createClient<Database>(url!, publishableKey!, noSession)
    for (const email of [ownerEmail, otherEmail]) {
      const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
      if (error) throw error
    }
    owner = await signedInClient(ownerEmail)
    other = await signedInClient(otherEmail)
    ownerId = (await owner.auth.getUser()).data.user!.id
    otherId = (await other.auth.getUser()).data.user!.id

    const { data, error } = await owner
      .from('documents')
      .insert({ title: 'RLS test doc', content: { type: 'doc', content: [{ type: 'paragraph' }] } })
      .select('id, owner_id')
      .single()
    if (error) throw error
    expect(data.owner_id).toBe(ownerId) // owner_id comes from auth.uid(), not the client
    docId = data.id
  })

  afterAll(async () => {
    // Deleting the users cascades to their profiles, documents and shares.
    for (const id of [ownerId, otherId]) if (id) await admin.auth.admin.deleteUser(id)
  })

  it('hides documents from users they are not shared with, and from anonymous clients', async () => {
    const asOther = await other.from('documents').select('id').eq('id', docId)
    expect(asOther.error).toBeNull()
    expect(asOther.data).toEqual([])

    const asAnon = await anon.from('documents').select('id').eq('id', docId)
    expect(asAnon.data ?? []).toEqual([])

    const update = await other.from('documents').update({ title: 'hijacked' }).eq('id', docId).select('id')
    expect(update.data).toEqual([])
  })

  it('does not expose other users’ profiles before anything is shared', async () => {
    const { data } = await other.from('profiles').select('id')
    expect(data?.map((p) => p.id)).toEqual([otherId])
  })

  it('only lets the owner share, and validates the recipient', async () => {
    const byStranger = await other.rpc('share_document', { p_document_id: docId, p_email: otherEmail, p_role: 'editor' })
    expect(byStranger.error?.code).toBe('42501')

    const unknown = await owner.rpc('share_document', { p_document_id: docId, p_email: 'nobody@example.com' })
    expect(unknown.error?.message).toMatch(/no user found/i)

    const self = await owner.rpc('share_document', { p_document_id: docId, p_email: ownerEmail })
    expect(self.error?.message).toMatch(/already own/i)

    const direct = await other.from('document_shares').insert({ document_id: docId, user_id: otherId, role: 'editor' })
    expect(direct.error?.code).toBe('42501') // no INSERT grant: shares only via the RPC
  })

  it('lets a viewer read but not modify, share, or delete', async () => {
    const shared = await owner.rpc('share_document', { p_document_id: docId, p_email: otherEmail.toUpperCase(), p_role: 'viewer' })
    expect(shared.error).toBeNull()

    const read = await other.from('documents').select('title, owner:profiles!documents_owner_id_fkey(email)').eq('id', docId).single()
    expect(read.data?.title).toBe('RLS test doc')
    expect(read.data?.owner?.email).toBe(ownerEmail) // collaborators can see the owner's email

    const before = await ownerReadsContent()
    const update = await other
      .from('documents')
      .update({ content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'viewer edit' }] }] } })
      .eq('id', docId)
      .select('id')
    expect(update.data).toEqual([]) // RLS silently matches zero rows…
    expect(await ownerReadsContent()).toEqual(before) // …and nothing changed

    const del = await other.from('documents').delete().eq('id', docId).select('id')
    expect(del.data).toEqual([])

    const reshare = await other.rpc('share_document', { p_document_id: docId, p_email: ownerEmail, p_role: 'editor' })
    expect(reshare.error?.code).toBe('42501')
  })

  it('lets an editor change content and title, but not ownership, sharing, or deletion', async () => {
    await owner.rpc('share_document', { p_document_id: docId, p_email: otherEmail, p_role: 'editor' })

    const content = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'editor edit' }] }] }
    const update = await other.from('documents').update({ content, title: 'Edited by editor' }).eq('id', docId).select('id')
    expect(update.data).toHaveLength(1)
    expect(await ownerReadsContent()).toEqual(content)

    const takeover = await other.from('documents').update({ owner_id: otherId }).eq('id', docId)
    expect(takeover.error?.code).toBe('42501') // column not grantable to clients

    const del = await other.from('documents').delete().eq('id', docId).select('id')
    expect(del.data).toEqual([])

    const revokeOthers = await other.from('document_shares').delete().eq('document_id', docId).select('user_id')
    expect(revokeOthers.data).toEqual([])
  })

  it('rejects invalid titles and non-document content at the database', async () => {
    const blank = await owner.from('documents').update({ title: '   ' }).eq('id', docId)
    expect(blank.error?.code).toBe('23514')

    const notADoc = await owner.from('documents').update({ content: { type: 'paragraph' } }).eq('id', docId)
    expect(notADoc.error?.code).toBe('23514')
  })

  it('removes access when the owner revokes it', async () => {
    const revoke = await owner.from('document_shares').delete().eq('document_id', docId).eq('user_id', otherId).select('user_id')
    expect(revoke.data).toHaveLength(1)

    const read = await other.from('documents').select('id').eq('id', docId)
    expect(read.data).toEqual([])
  })
})
