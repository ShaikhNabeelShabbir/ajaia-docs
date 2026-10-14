# Ajaia Docs

A lightweight collaborative document editor: create and format documents, import `.txt` / `.md` files, and share documents with teammates as **viewers** or **editors**. Built for the Ajaia Full Stack Product Engineer assignment.

> **Status:** live and deployed at https://ajaia-docs-nu-peach.vercel.app. The reviewer guide, walkthrough video, and submission checklist are in [`SUBMISSION.md`](SUBMISSION.md).

## Features

- **Documents:** create, rename, edit, delete (owner only), autosave with a save-status indicator
- **Rich text:** headings (H1–H3), bold, italic, underline, strikethrough, bulleted and numbered lists, quotes, undo/redo
- **Import:** upload a `.txt` or `.md` file (max 500 KB) to create a new editable document. Markdown structure is preserved.
- **Sharing:** the owner shares by email as Viewer (read-only) or Editor, and can change roles or revoke access. Documents are split into "My documents" and "Shared with me".
- **Persistence:** Postgres (Supabase). Rich text is stored as structured Tiptap JSON.
- **Security:** authorization is enforced by Postgres Row Level Security, not just the UI

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · shadcn/ui · Lucide · Tiptap v3 · TanStack Query · Supabase (Auth, Postgres, RLS) · Vitest · Vercel

See [`architecture.md`](architecture.md) for design and trade-offs.

## Prerequisites

- Node.js **20.19+ or 22.12+** (required by Vite 8) and npm
- A Supabase project (the free tier is fine)
- [Supabase CLI](https://supabase.com/docs/guides/cli), used by `npm run db:push` to apply the schema
- Docker is **not** needed, unless you choose the [local database](#using-a-local-database-instead-of-hosted-supabase) option

## Quick start (hosted Supabase)

### 1. Install

```bash
git clone <repo-url> ajaia-docs && cd ajaia-docs
npm install
cp .env.example .env.local
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local` (Supabase → Project Settings → API Keys).

### 2. Database setup (one time, from your machine)

The schema (tables, RLS policies, the sharing function) lives in `supabase/migrations/`. Apply it with a temporary database connection string:

1. Copy the connection string from Supabase → **Connect** → **Session pooler**. The transaction pooler string also works, because the script switches it to session mode.
2. Add it to `.env.local`:
   ```bash
   DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
   ```
3. Preview, then apply:
   ```bash
   npm run db:push -- --dry-run
   npm run db:push
   ```
4. **Delete the `DATABASE_URL` line from `.env.local`.** The app never uses it, and it is a full-privilege credential.

`db:push` URL-encodes special characters in the password, rejects the `[YOUR-PASSWORD]` placeholder, and never prints the connection string.

Alternatives that skip `DATABASE_URL`:
- `supabase link --project-ref <ref>` then `supabase db push` (the CLI prompts for the password)
- Paste `supabase/migrations/*.sql` into Dashboard → SQL Editor. The CLI's migration history won't record it, so stick to one method.

### 3. Auth settings (Supabase dashboard)

- Authentication → Sign In / Providers → Email → turn **off** "Confirm email", so new accounts work immediately.
- For deployments: Authentication → URL Configuration → set the Site URL to your deployed URL.

### 4. Run

```bash
npm run dev            # http://localhost:5173
```

## Environment variables

| Variable | Purpose | `.env.local` | Production (Vercel) | In the browser bundle |
|---|---|---|---|---|
| `VITE_SUPABASE_URL` | Supabase API URL | ✅ | ✅ | yes (public) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable (or legacy `anon`) key | ✅ | ✅ | yes (public by design; RLS protects the data) |
| `DATABASE_URL` | Applying migrations (`npm run db:push`) | only while setting up; then delete | ❌ never | ❌ never |
| `SUPABASE_SECRET_KEY` | Optional integration tests | optional | ❌ never | ❌ never |

**How secrets stay out of the browser and production:**
- **Only `VITE_*` variables reach the browser.** Vite bundles only those, so `DATABASE_URL` and `SUPABASE_SECRET_KEY` are never shipped to users.
- **The build refuses to leak secrets.** It fails if any `VITE_*` variable holds a Postgres URL, an `sb_secret_` key, or a `service_role` JWT, which catches mistakes like `VITE_DATABASE_URL`.
- **`.env.local` never leaves your machine.** It is gitignored, so Vercel, which builds from git, never sees it. You only add the two `VITE_` variables in Vercel.
- **Tests don't load the database URL.** They only read `VITE_SUPABASE_*` and `SUPABASE_SECRET_KEY`.
- **Good hygiene:** remove `DATABASE_URL` after use. Because the app never needs the database password at runtime, you can also reset it in Supabase whenever you like.

## Using a local database instead of hosted Supabase

The browser never connects to Postgres directly. It talks to Supabase's **REST API** (PostgREST) and **Auth** (GoTrue). The schema also relies on pieces Supabase provides: `auth.users`, `auth.uid()`, and the `anon` / `authenticated` roles. A local database therefore has to come with those services.

### Supported: Supabase local stack (requires Docker)

Runs Postgres, the REST API, Auth and Studio on your machine, and applies `supabase/migrations` automatically.

```bash
supabase start      # first run downloads the Docker images; migrations are applied on start
supabase status     # prints the local API URL and keys
```

Point `.env.local` at it:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<"Publishable key" (or "anon key") from `supabase status`>
```

- **Local auth settings** come from `supabase/config.toml`. Email confirmation is already off, and the site URL is `http://localhost:5173`.
- **Studio** (database UI) runs at http://127.0.0.1:54323.
- **Migrations:** apply new ones with `supabase migration up`, or rebuild from scratch with `supabase db reset`.
- **Direct Postgres access**, if you need it: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`. `npm run db:push` isn't needed locally, because the stack applies migrations itself.
- **Stop it** with `supabase stop`.

You can also run the same migrations against a **self-hosted Supabase**: put its Postgres connection string in `DATABASE_URL` and run `npm run db:push`.

### Not supported: a plain Postgres on its own

A bare Postgres (e.g. `brew install postgresql`) has no REST API or Auth in front of it, so the app can't talk to it. Supporting that would mean replacing the data layer with an API server and a separate auth system. That is the alternative this project deliberately rejected; see `architecture.md`, decisions D1/D2.

## Test accounts

There are no seeded or demo accounts. Use **Create account** on the sign-in page to register real users. To try sharing, create two accounts and use a second browser or a private window for the second one.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server at http://localhost:5173 |
| `npm run build` | Typecheck + production build (fails if a secret is `VITE_`-prefixed) |
| `npm run lint` | oxlint |
| `npm test` | Unit tests (import conversion, autosave queue, `db:push` URL handling); no network |
| `npm run test:integration` | Optional RLS tests against your Supabase project (needs `SUPABASE_SECRET_KEY`) |
| `npm run db:push` | Applies `supabase/migrations` using `DATABASE_URL` (add `-- --dry-run` to preview) |

## Supported file types (import)

| Type | Extensions | Behaviour |
|---|---|---|
| Plain text | `.txt` | Blocks separated by blank lines become paragraphs; single line breaks are preserved |
| Markdown | `.md`, `.markdown` | Headings, bold/italic/strike, lists, blockquotes, code and links become rich text. Images keep their alt text; tables and other unsupported blocks are preserved as plain text (never dropped to a blank document). |

Limits: max 500 KB, UTF-8 text only. Other types (e.g. `.docx`, `.pdf`) are rejected with a message.

## Deployment

- **Frontend (Vercel):** Vite preset, build command `npm run build`, output `dist`. `vercel.json` rewrites routes to `index.html`.
- **Vercel environment variables:** add exactly two, `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. **Do not** add `DATABASE_URL` or `SUPABASE_SECRET_KEY`: the app never uses them at runtime.
- **Schema changes:** run them from a developer machine with `npm run db:push`. They are not part of the Vercel build.
- **Auth:** set the Supabase Site URL to the Vercel domain.

## Known limitations

- No real-time co-editing: concurrent edits are last-write-wins.
- Sharing requires the recipient to have an account; there are no email invitations.
- Import supports `.txt` and `.md` only.

More in [`SUBMISSION.md`](SUBMISSION.md).

The drive containing the project is at this URl : https://drive.google.com/drive/folders/1FY2_UjdxxEL0ect99hCTAME-Wkrorq_J?usp=sharing