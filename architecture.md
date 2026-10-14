# Architecture — Ajaia Docs

> Status: **initial design (Phase 0)**. Sections marked _(planned)_ are not implemented yet. This file is updated as the implementation lands.

---

## 1. High-level architecture

```
┌──────────────────────────── Browser (Vercel-hosted SPA) ─────────────────────────────┐
│ React 19 + TypeScript + Vite                                                        │
│  ├─ Auth (Supabase Auth session in localStorage)                                     │
│  ├─ Documents list  ── TanStack Query ──┐                                            │
│  ├─ Editor (Tiptap v3, JSON doc)        ├── supabase-js (publishable key + user JWT) │
│  ├─ Share dialog  ── rpc('share_document')                                           │
│  └─ Import (.txt/.md → Tiptap JSON, parsed in the browser)                           │
└──────────────────────────────────────────────┬───────────────────────────────────────┘
                                               │ HTTPS (PostgREST / GoTrue)
┌──────────────────────────────── Supabase (hosted) ───────────────────────────────────┐
│  Auth (GoTrue): email + password, JWT                                                │
│  PostgREST: auto REST API over `public` schema                                       │
│  Postgres 15+:                                                                       │
│    public.profiles, public.documents, public.document_shares                         │
│    RLS policies + column-level grants   ← the authorization boundary                │
│    public.share_document()  (SECURITY DEFINER RPC, owner-checked)                    │
│    private.*  helper functions (not exposed via the API)                            │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

There is **no custom application server**. The browser talks to Supabase with the public publishable key plus the signed-in user's JWT. Postgres decides what each user can read and write, via RLS.

## 2. Technology stack and rationale

| Layer | Choice | Why |
|---|---|---|
| Build / UI | **Vite 8, React 19, TypeScript** | Fast setup and HMR. Static output deploys anywhere. |
| Styling | **Tailwind CSS v4** + **shadcn/ui** (Radix primitives) + **Lucide** | Accessible primitives (Dialog, DropdownMenu, Select) without writing them. One neutral token set gives a coherent minimal look. |
| Editor | **Tiptap v3** (`@tiptap/react`, `@tiptap/starter-kit`) | Structured ProseMirror JSON. StarterKit v3 already includes Underline and Link. Mature React bindings. |
| Markdown import | **`@tiptap/markdown`** (`MarkdownManager.parse`) | Official package. Parses Markdown straight into JSON for the *same* schema as the editor, with no HTML step, so unknown constructs can't smuggle in markup. |
| Server state | **TanStack Query v5** | Handles loading, error, and cache invalidation for list, doc, and shares with little code. |
| Routing | **React Router** | `/login`, `/`, `/d/:id`. |
| Auth | **Supabase Auth** (email + password) | Smallest real login. Provides `auth.uid()` for RLS. |
| Database | **Supabase Postgres** | Required persistence. `jsonb` for rich text. RLS for authorization. |
| DB access | **supabase-js → PostgREST**, plus one RPC | See D1/D2. |
| Migrations | **Supabase CLI SQL migrations** (`supabase/migrations/*.sql`, applied with `supabase db push`) | Plain SQL expresses RLS, grants, triggers, and functions directly. |
| Tests | **Vitest** (+ jsdom) | Same toolchain as Vite. Unit tests plus RLS integration tests against the real project. |
| Hosting | **Vercel** (static SPA) + **Supabase** (managed backend) | Free tiers. Zero servers to operate. |

## 3. Key decisions and rejected alternatives

### D1 — Drizzle ORM: **rejected**
Drizzle needs a direct Postgres connection (connection string with the DB password) from a server runtime. Our only data path is browser → PostgREST, protected by RLS. Adding Drizzle would mean:
- adding a server tier (Edge Functions or a Node API) purely to host it;
- connecting as a privileged role, which **bypasses RLS** unless we re-implement per-request `set role` / JWT claims;
- verifying Postgres-driver compatibility inside the Deno edge runtime.

That adds complexity and risk and moves authorization out of the database. The schema is three tables, so typed access comes from `supabase gen types typescript` instead.
**One consistent strategy:** every read and write goes through supabase-js with the user's JWT. The one privileged operation (user lookup by email) is a `SECURITY DEFINER` Postgres function.

### D2 — Supabase Edge Functions: **not needed**
The only operation needing elevated rights is "find a user by email and create a share". A `SECURITY DEFINER` SQL function does this atomically, checks ownership inside the same transaction, and needs no extra deploy target, Deno runtime, or secret handling. Edge Functions would become the right tool if we later add side effects such as sending invitation emails.

### D3 — File import parsed in the browser, no Storage
The import workflow turns a file into a document. The original file has no further use, so Supabase Storage is not needed. Parsing client-side keeps the backend simple. Trust boundaries:
- Parsing is schema-constrained (`@tiptap/markdown` against the editor schema). Anything outside the schema is dropped.
- Rendering is done by Tiptap from JSON. We never `innerHTML` user content.
- The database enforces `content` shape and size limits (CHECK constraints), so a malicious client can't store arbitrary blobs.

### D4 — Roles: owner + viewer/editor
Both roles are cheap to enforce with RLS and make enforcement demonstrable (a viewer's update is denied by the database). Owner-only: share, change role, revoke, delete.

### D5 — Autosave, last-write-wins
Debounced autosave (~1 s), serialized per document (one request in flight; the latest content is queued). Concurrent editors overwrite each other. This is an explicit, disclosed trade-off versus CRDT real-time collaboration.

### D6 — Hosted Supabase only, no local Docker stack
Per project direction, there is no Docker. Development and production use one hosted Supabase project (free tier). Migrations are applied with `supabase db push`, or by pasting the SQL into the dashboard SQL editor; neither needs Docker. Trade-off: no disposable local DB. Integration tests create throwaway users and clean up after themselves.

### D7 — Profiles table instead of exposing `auth.users`
`public.profiles (id, email)` is populated by a trigger on `auth.users`. RLS lets you see only your own profile and the profiles of people you share a document with. There is no global user directory.

## 4. Data model

```
auth.users (Supabase-managed)
   │ 1:1  (trigger on insert)
   ▼
public.profiles ──────────────┐
  id uuid PK → auth.users.id  │
  email text unique           │
  created_at                  │
   │ 1:N (owner)              │ 1:N (collaborator)
   ▼                          ▼
public.documents          public.document_shares
  id uuid PK                document_id uuid → documents.id  ┐ PK
  owner_id uuid → profiles  user_id uuid → profiles.id        ┘
  title text                role share_role ('viewer'|'editor')
  content jsonb             created_at
  created_at, updated_at
```

| Table | Key constraints |
|---|---|
| `profiles` | `id` FK `auth.users` ON DELETE CASCADE. `email` unique (case-insensitive lookup). |
| `documents` | `owner_id` default `auth.uid()`, FK `profiles` ON DELETE CASCADE. `title` 1–200 chars after trim. `content` must be a JSON object with `type = 'doc'` and at most 2 MB serialized. `updated_at` maintained by trigger. Index on `owner_id`. |
| `document_shares` | PK `(document_id, user_id)`. Both FKs CASCADE. Index on `user_id`. Owner can't be a share target (enforced in RPC). |

Only three tables. No attachments table (D3) and no versions table (out of scope).

## 5. Rich-text persistence

- The editor state is serialized with `editor.getJSON()` → ProseMirror JSON (`{ type: 'doc', content: [...] }`) and stored in `documents.content jsonb`.
- On load: `useEditor({ content: doc.content })`. This round-trips losslessly within the schema (headings, marks, lists).
- New documents default to an empty doc: `{"type":"doc","content":[{"type":"paragraph"}]}`.
- Why JSON over HTML or Markdown: it is lossless for our schema, can be validated, carries no HTML injection surface, and the database can constrain it.

## 6. Authentication and authorization

**Authentication:** Supabase Auth email + password. The session lives in localStorage (supabase-js default). `AuthProvider` exposes `user` and gates routes. Email confirmation is disabled on the project (assumption A5).

**Authorization layers (defense in depth):**
1. **Table grants:** `anon` has no privileges. `authenticated` gets `SELECT/DELETE` on `documents`, column-limited `INSERT (title, content)` and `UPDATE (title, content)`, so `owner_id` / `id` / timestamps can't be set or changed by clients.
2. **RLS policies** (see below).
3. **`SECURITY DEFINER` functions** with `set search_path = ''`, `EXECUTE` revoked from `public`/`anon`.

**RLS policies** _(planned; implemented in `supabase/migrations/`)_

Helper functions in schema `private` (not exposed by PostgREST, `SECURITY DEFINER`, so they don't recurse into RLS):
- `private.is_document_owner(doc uuid) → bool`
- `private.document_role(doc uuid) → text` (`'owner' | 'editor' | 'viewer' | null`)
- `private.shares_document_with(other uuid) → bool`

| Table | Operation | Policy |
|---|---|---|
| documents | SELECT | `private.document_role(id) is not null` (owner or any share) |
| documents | INSERT | `owner_id = auth.uid()` |
| documents | UPDATE | `private.document_role(id) in ('owner','editor')` (USING + WITH CHECK) |
| documents | DELETE | `owner_id = auth.uid()` |
| document_shares | SELECT | `user_id = auth.uid() or private.is_document_owner(document_id)` |
| document_shares | INSERT/UPDATE | none (only via `share_document` RPC) |
| document_shares | DELETE | `private.is_document_owner(document_id)` (owner revokes) |
| profiles | SELECT | `id = auth.uid() or private.shares_document_with(id)` |
| profiles | INSERT/UPDATE/DELETE | none (trigger-managed) |

**Why helpers:** a `documents` policy that queries `document_shares`, combined with a `document_shares` policy that queries `documents`, triggers Postgres's "infinite recursion detected in policy" error. `SECURITY DEFINER` helpers read the base tables without re-entering RLS.

**Silent-denial gotcha:** an UPDATE blocked by RLS returns *success with 0 rows*, not an error. Every client update therefore requests `.select()` of the row back and treats 0 rows as "no edit access".

## 7. API contracts

All via `supabase-js` with the user's JWT.

| Operation | Call |
|---|---|
| List my + shared docs | `from('documents').select('id,title,owner_id,created_at,updated_at,owner:profiles(email),document_shares(user_id,role)').order('updated_at',{ascending:false})` (no `content`) |
| Get one doc | `from('documents').select('*,owner:profiles(email),document_shares(user_id,role)').eq('id',id).maybeSingle()` → `null` = not found / no access |
| Create | `from('documents').insert({title, content}).select('id').single()` |
| Rename / save | `from('documents').update({title}|{content}).eq('id',id).select('updated_at').single()` → PGRST116 (0 rows) ⇒ access denied |
| Delete | `from('documents').delete().eq('id',id).select('id')` → 0 rows ⇒ denied |
| List shares (owner) | `from('document_shares').select('user_id,role,created_at,profile:profiles(email)').eq('document_id',id)` |
| Share / change role | `rpc('share_document',{ p_document_id, p_email, p_role })` |
| Revoke | `from('document_shares').delete().eq('document_id',id).eq('user_id',uid).select()` |

**`share_document(p_document_id uuid, p_email text, p_role share_role)`** (`SECURITY DEFINER`):
1. Requires `auth.uid()`; caller must own the document, otherwise `42501` "Only the owner can share this document".
2. Looks up the profile by `lower(email)`; missing → "No user found with that email".
3. Rejects the owner's own email.
4. Upserts `(document_id, user_id, role)` and returns the share row.

## 8. Main application flows

- **Create:** "New document" → insert → navigate `/d/:id` → title input focused.
- **Edit/save:** editor `onUpdate` → mark dirty → debounce 1 s → `saveContent` (serialized queue) → status `Saved` / `Error (retry)`. Ctrl/Cmd+S flushes immediately. `beforeunload` warns if dirty. Unmount flushes pending changes.
- **Rename:** title input → on blur/Enter → validate (trim, 1–200) → update → invalidate list cache.
- **Import:** "Import" → dialog states the supported types (`.txt`, `.md`, max 500 KB) → `validateImportFile` → `fileToDocument` (txt → paragraphs/hard breaks; md → `MarkdownManager.parse`) → insert → navigate.
- **Share:** "Share" (owner only) → dialog: email + role → RPC → shares list refreshes. Owner can change roles with a Select and remove people with a button.
- **Open shared:** list query returns owned and shared docs in one round-trip; the client splits them by `owner_id === me`. A viewer opens the editor with `editable: false`, the toolbar hidden, and a "View only" badge.

## 9. Validation and error handling

| Concern | Client | Database |
|---|---|---|
| Title | trim, 1–200 chars, revert on invalid | `CHECK (char_length(btrim(title)) between 1 and 200)` |
| Content | produced only by Tiptap | `CHECK (jsonb_typeof(content)='object' and content->>'type'='doc' and octet_length(content::text) <= 2_000_000)` |
| Import file | extension allow-list, ≤ 500 KB, non-empty, UTF-8 (`TextDecoder` fatal) | content CHECK above |
| Share email | basic email format, not empty | RPC: exists, not self, caller is owner |
| Access | UI hides actions per role | RLS + grants (authoritative) |

Errors surface through toasts (mutations) and inline states (page loads). Supabase/PostgREST errors map to friendly messages in `lib/errors.ts`. Every page has loading, empty, and error states.

## 10. Security considerations

- Only the **publishable** key (`VITE_SUPABASE_PUBLISHABLE_KEY`) reaches the browser. The secret/service-role key is used **only** by the optional local integration tests and never has a `VITE_` prefix.
- RLS is enabled on every public table. `anon` has no table privileges.
- `SECURITY DEFINER` functions pin `search_path = ''`, fully qualify names, and revoke `EXECUTE` from `public`/`anon`.
- No user HTML is rendered via `innerHTML`. Tiptap renders from schema-validated JSON. Link hrefs are protocol-checked.
- Not-found and forbidden are indistinguishable for documents, so document IDs don't leak existence.
- Accepted risk: the share dialog reveals whether an email is registered (internal tool).

## 11. Testing strategy

| Layer | What | Where |
|---|---|---|
| Unit | Import validation (type/size/empty/encoding). txt → doc. md → doc preserves headings/lists/marks. `javascript:` links stripped. Output validates against the editor schema. | `src/features/file-import/*.test.ts` |
| Integration (DB) | Two throwaway users: no access by default. Viewer can read, can't update. Editor can update. Non-owner can't share/delete. Revoke removes access. | `tests/integration/access-control.test.ts` (skipped unless env vars present) |
| Manual | J1–J5 on the deployed URL, mobile width check, keyboard navigation | `plan.md` Phase 3 checklist |

## 12. Deployment

- **Frontend:** Vercel, framework preset Vite, build `npm run build`, output `dist/`. `vercel.json` rewrites all paths to `/index.html` for client-side routing. Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- **Backend:** hosted Supabase project. Schema via `supabase db push`. Auth settings: email confirmation off, Site URL set to the Vercel URL.
- **Accounts:** no seeded or demo users. Testers sign up through the app (requires "Confirm email" off).

## 13. Environment variables

| Variable | Used by | Secret? |
|---|---|---|
| `VITE_SUPABASE_URL` | browser | no |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | browser (anon/publishable key) | no (public by design, protected by RLS) |
| `SUPABASE_SECRET_KEY` | optional: integration tests only (local) | **yes**, never committed, never `VITE_` |

`.env.local` is gitignored. `.env.example` documents the names.

## 14. Folder structure _(planned; updated as built)_

```
ajaia-docs/
├── idea.md  PRD.md  architecture.md  plan.md  memory.md
├── README.md  SUBMISSION.md  AI_WORKFLOW.md  WALKTHROUGH_VIDEO_URL.txt
├── supabase/
│   ├── config.toml
│   └── migrations/<timestamp>_init.sql
├── tests/integration/access-control.test.ts
├── src/
│   ├── main.tsx  App.tsx  index.css
│   ├── components/ui/            # shadcn primitives
│   ├── components/               # AppShell, ProtectedRoute, EmptyState…
│   ├── features/auth/            # AuthProvider, LoginPage
│   ├── features/documents/       # api, hooks, DocumentsPage
│   ├── features/editor/          # EditorPage, Toolbar, extensions, useAutosave
│   ├── features/sharing/         # ShareDialog, api
│   ├── features/file-import/     # validate, convert, ImportDialog, tests
│   └── lib/                      # supabase client, errors, database.types, utils
├── vercel.json  .env.example  package.json  vite.config.ts
```

## 15. Trade-off summary

| We chose | Over | Because |
|---|---|---|
| RLS + PostgREST | Drizzle + API server | Authorization lives in one place (the DB). No server to host. |
| SQL RPC | Edge Function | Atomic, no extra runtime or deploy. |
| Client-side import | Storage + server parse | The file is transient. The schema-constrained parser is the safety boundary. |
| Autosave LWW | Yjs real-time | Fits the timebox. Disclosed limitation. |
| Viewer + editor | Single role | Makes enforcement visible and testable at low cost. |
| Hosted Supabase only | Local Docker stack | No Docker available. One environment is simpler for a 5-hour build. |
