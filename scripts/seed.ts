/**
 * Creates (or resets) the reviewer demo accounts and two sample documents shared between them.
 * Idempotent: safe to re-run, e.g. if a reviewer changed something.
 *
 *   npm run seed   (needs VITE_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local)
 *
 * Uses the secret key, which bypasses RLS: run locally only, never ship it to the browser.
 */
import { createClient } from '@supabase/supabase-js'
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../src/features/auth/demoAccounts'
import { markdownToDoc } from '../src/features/file-import/convert'
import type { Database, Json, ShareRole } from '../src/lib/database.types'

const url = process.env.VITE_SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY
if (!url || !secretKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY (see .env.example).')
  process.exit(1)
}

const admin = createClient<Database>(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })

const WELCOME = `# Welcome to Ajaia Docs

This sample document is owned by **Alice** and shared with **Bob** as a *viewer*.

## Try it

1. Sign in as Alice and click **Share** to change Bob's access to *Editor*.
2. Sign in as Bob in a private window: the document is under **Shared with me**.
3. Edit as Bob, then reload as Alice to see the changes.

## Formatting

- **Bold**, *italic*, <u>underline</u> and ~~strikethrough~~
- Headings, bulleted and numbered lists, and quotes

> Changes save automatically. Press Ctrl/⌘ + S to save immediately.
`

const NOTES = `# Weekly sync notes

Owned by **Bob**, shared with **Alice** as an *editor*.

## Decisions

- Ship the document editor MVP first
- Real-time collaboration comes later

## Action items

1. Alice: review the import flow
2. Bob: write the release notes
`

async function ensureUser(email: string): Promise<string> {
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (listError) throw listError
  const existing = list.users.find((u) => u.email?.toLowerCase() === email)

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, { password: DEMO_PASSWORD, email_confirm: true })
    if (error) throw error
    return existing.id
  }
  const { data, error } = await admin.auth.admin.createUser({ email, password: DEMO_PASSWORD, email_confirm: true })
  if (error) throw error
  return data.user.id
}

async function ensureDocument(ownerId: string, title: string, markdown: string): Promise<string> {
  const content = markdownToDoc(markdown) as Json
  const { data: existing, error: findError } = await admin
    .from('documents')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('title', title)
    .limit(1)
  if (findError) throw findError

  if (existing.length) {
    const { error } = await admin.from('documents').update({ content }).eq('id', existing[0].id)
    if (error) throw error
    return existing[0].id
  }
  const { data, error } = await admin.from('documents').insert({ owner_id: ownerId, title, content }).select('id').single()
  if (error) throw error
  return data.id
}

async function ensureShare(documentId: string, userId: string, role: ShareRole) {
  const { error } = await admin
    .from('document_shares')
    .upsert({ document_id: documentId, user_id: userId, role }, { onConflict: 'document_id,user_id' })
  if (error) throw error
}

async function main() {
  const [alice, bob] = DEMO_ACCOUNTS
  const aliceId = await ensureUser(alice.email)
  const bobId = await ensureUser(bob.email)

  const welcomeId = await ensureDocument(aliceId, 'Welcome to Ajaia Docs', WELCOME)
  await ensureShare(welcomeId, bobId, 'viewer')

  const notesId = await ensureDocument(bobId, 'Weekly sync notes', NOTES)
  await ensureShare(notesId, aliceId, 'editor')

  console.log('Seeded demo data:')
  for (const account of DEMO_ACCOUNTS) console.log(`  ${account.name.padEnd(6)} ${account.email} / ${DEMO_PASSWORD}`)
  console.log('  "Welcome to Ajaia Docs" (Alice) → shared with Bob as viewer')
  console.log('  "Weekly sync notes" (Bob)       → shared with Alice as editor')
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
