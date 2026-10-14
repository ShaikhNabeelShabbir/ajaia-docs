# Working Memory — Ajaia Docs

_Last updated: 2026-10-14 ~11:55 IST_

## Current state
- Schema **applied** to Supabase `ajaia-docs` (ref `arjyzsauhprjqhbpqikf`). Verified: RLS on all tables, 7 policies, column grants, triggers; 22 permission checks run as two temp users inside a rolled-back transaction all matched expectations. DB left empty.
- `DATABASE_URL` was added by the user only for the push and has been **removed** from `.env.local`. `.env.local` = URL + publishable key + secret key (secret unused by choice).
- Types regenerated from live schema; `tsc`, lint, build, 27 unit tests pass.
- Dev server: `npm run dev` → http://localhost:5173 (running in background).
- **User is now testing in the browser.** No browser journey verified yet.

## Blockers
- Supabase Auth "Confirm email" is still **ON** (`mailer_autoconfirm: false`) → sign-ups need confirmation. User must toggle it off in the dashboard.

## Decisions since last update
- User wants to test as real users: **all demo content removed** (Alice/Bob demo buttons, `demoAccounts.ts`, `scripts/seed.ts`, `npm run seed`, `tsx`). Demo accounts never existed in the DB (verified). No secret-key scripts are run.
- `shadcn` moved to devDependencies (build-time CSS only) → `npm audit --omit=dev` clean.
- Migrations pushed with `supabase db push --db-url` over the session pooler (5432), not the transaction pooler (6543).

## Next 3 actions
1. User toggles "Confirm email" off; walk J1–J5 in the browser; fix issues found.
2. git init + deploy to Vercel; set Auth Site URL to the Vercel domain.
3. Update architecture.md folder tree, SUBMISSION.md statuses, AI_WORKFLOW.md.

## Gotchas
- PostgREST owner embed must use `profiles!documents_owner_id_fkey` (document_shares is a junction).
- RLS-blocked UPDATE/DELETE return 0 rows → always `.select()`.
- Tiptap Link `parseMarkdown` keeps unsafe hrefs → sanitized on import.
- `supabase migration new` hangs without TTY (reads stdin). CLI 2.120 rejects malformed `.env.local` lines.
