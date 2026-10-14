# Working Memory — Ajaia Docs

_Last updated: 2026-10-14 ~12:30 IST_

## Current state
- MVP works locally against hosted Supabase `ajaia-docs` (ref `arjyzsauhprjqhbpqikf`). Candidate tested it in the browser as real users and reported it looks fine.
- Schema live; RLS verified with 22 rolled-back SQL scenarios. DB contains only the candidate's real test data.
- Repo: GitHub `ShaikhNabeelShabbir/ajaia-docs`, pushed by candidate. At last check, local `main` was 1 commit ahead of `origin/main`, and the env/docs changes below are uncommitted (the candidate handles git).
- Checks: `tsc -b`, lint, 33 unit tests, build all pass. Production deps audit clean.

## Env / secrets model (agreed with candidate)
- `.env.local` (gitignored): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`; `DATABASE_URL` only while running `npm run db:push`, then deleted; `SUPABASE_SECRET_KEY` optional and unused.
- Vercel: only the two `VITE_` vars. Never `DATABASE_URL` or the secret key.
- Guards: `vite.config.ts` fails the build if a `VITE_*` value looks like a Postgres URL, an `sb_secret_` key or a service_role JWT. Vitest loads only `VITE_SUPABASE_*` + `SUPABASE_SECRET_KEY`.
- `scripts/db-push.mjs`: reads `DATABASE_URL`, URL-encodes the password, switches pooler 6543→5432, rejects the placeholder, never prints the URL (unit-tested).
- Local DB option documented: Supabase local stack (Docker). Plain Postgres is not supported (needs PostgREST + GoTrue + auth schema).

## Decisions log
- No Drizzle, no Edge Functions; supabase-js + RLS + `share_document` RPC.
- No Docker for this build; hosted Supabase only.
- No demo/seed accounts (candidate wants real-user testing); no secret-key scripts run.
- `shadcn` is a devDependency (build-time CSS only).

## Blockers
- None. "Confirm email" is OFF (verified 12:30 via `/auth/v1/settings`).

## Next 3 actions
1. Candidate commits/pushes; deploy to Vercel with the 2 `VITE_` vars; set the Supabase Site URL to the Vercel domain.
2. Run J1–J5 on the live URL (desktop + 375 px), fill in SUBMISSION live URL + statuses.
3. Screenshots, walkthrough outline, final requirement audit vs idea.md.

## Gotchas
- PostgREST owner embed needs `profiles!documents_owner_id_fkey`.
- RLS-blocked UPDATE/DELETE return 0 rows → always `.select()`.
- Tiptap Link `parseMarkdown` keeps unsafe hrefs → sanitized on import.
- `supabase migration new` hangs without TTY. CLI 2.120 rejects malformed `.env.local` lines and needs its own login.
- CLI 2.31 `db push` needs the password (link doesn't). Migrations should use the session pooler (5432).
