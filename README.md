# Ajaia Docs

A lightweight collaborative document editor: create and format documents, import `.txt` / `.md` files, and share documents with teammates as **viewers** or **editors**. Built for the Ajaia Full Stack Product Engineer assignment.

> **Status: in development.** Commands below reflect the planned setup and are re-verified from a clean clone before submission (see `plan.md` Phase 4). Live URL and reviewer accounts are listed in [`SUBMISSION.md`](SUBMISSION.md).

## Features

- **Documents:** create, rename, edit, delete (owner), autosave with save-status indicator
- **Rich text:** headings (H1–H3), bold, italic, underline, bulleted and numbered lists, quotes, undo/redo
- **Import:** upload a `.txt` or `.md` file (max 500 KB) → new editable document; Markdown structure preserved
- **Sharing:** owner shares by email as Viewer (read-only) or Editor; change role or revoke; "My documents" vs "Shared with me"
- **Persistence:** Postgres (Supabase); rich text stored as structured Tiptap JSON
- **Security:** authorization enforced by Postgres Row Level Security, not just the UI

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · shadcn/ui · Lucide · Tiptap v3 · TanStack Query · Supabase (Auth, Postgres, RLS) · Vitest · Vercel

See [`architecture.md`](architecture.md) for design and trade-offs.

## Prerequisites

- Node.js ≥ 20 and npm
- A Supabase project (free tier is fine)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (to apply migrations), or use the dashboard SQL editor instead
- No Docker required

## Setup

```bash
git clone <repo-url> ajaia-docs && cd ajaia-docs
npm install
cp .env.example .env.local      # then fill in values (see below)
```

### Environment variables

| Variable | Where to find it | Exposed to browser |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase dashboard → Project Settings → API | yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys → publishable (or legacy `anon`) key | yes (safe: protected by RLS) |
| `SUPABASE_SECRET_KEY` | Project Settings → API Keys → secret (or legacy `service_role`) key | **no** — only for `npm run seed` and integration tests; never commit |

### Supabase configuration

1. **Apply the schema** (tables, RLS policies, sharing function):
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
   _Alternative:_ paste the contents of `supabase/migrations/*.sql` into Dashboard → SQL Editor and run it.
2. **Disable email confirmation** so sign-up works instantly: Dashboard → Authentication → Sign In / Providers → Email → turn off "Confirm email".
3. **(Deployment only)** Authentication → URL Configuration → set Site URL to your deployed URL.

### Seed reviewer accounts (optional)

```bash
npm run seed   # requires SUPABASE_SECRET_KEY in .env.local
```
Creates two demo users and a sample document shared between them (credentials printed by the script and listed in `SUBMISSION.md`).

## Running locally

```bash
npm run dev            # http://localhost:5173
```

## Build and test

```bash
npm run build              # typecheck + production build
npm run lint
npm test                   # unit tests (no network needed)
npm run test:integration   # RLS/access-control tests against your Supabase project (needs SUPABASE_SECRET_KEY)
```

## Supported file types (import)

| Type | Extensions | Behaviour |
|---|---|---|
| Plain text | `.txt` | Blank-line-separated blocks → paragraphs; single line breaks preserved |
| Markdown | `.md`, `.markdown` | Headings, bold/italic/strike, lists, blockquotes, code, links → rich text. Images and tables are not supported and are dropped or flattened to text. |

Limits: max 500 KB, UTF-8 text only. Other types (e.g. `.docx`, `.pdf`) are rejected with a message.

## Deployment

- Frontend: Vercel (Vite preset, build `npm run build`, output `dist`). `vercel.json` rewrites routes to `index.html`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel project env vars.
- Backend: hosted Supabase project (schema applied as above).

## Known limitations

- No real-time co-editing: concurrent edits are last-write-wins.
- Sharing requires the recipient to have an account; no email invitations.
- Import supports `.txt` and `.md` only.

More in [`SUBMISSION.md`](SUBMISSION.md).
