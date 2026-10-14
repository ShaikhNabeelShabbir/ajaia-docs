# Working Memory — Ajaia Docs

_Last updated: 2026-10-14 ~13:25 IST_

## Current state
- **Deployed and security-tested.** Live: https://ajaia-docs-nu-peach.vercel.app (Vercel). Backend: hosted Supabase `ajaia-docs` (ref `arjyzsauhprjqhbpqikf`).
- Security review of the live deployment: 30+ probes, **no vulnerabilities**. Written up in `docs/security-review.md`. One accepted disclosure (email-registration check in share flow).
- All five `idea.md` core capabilities ✅ (audit table in SUBMISSION.md). Pending: walkthrough video, screenshots, Google Drive folder (candidate-owned).
- Checks pass: `tsc -b`, `oxlint`, 36 unit tests, `vite build`; prod-deps `npm audit` clean.
- **Import bug fixed:** md with images/tables/HTML produced a schema-invalid top-level text node (image alt) or empty paragraph → blank editor. `markdownToDoc` now wraps top-level inline nodes into a paragraph and falls back to raw text when no visible text results. +3 tests. **Needs redeploy** (local fix; live site still has old convert chunk).
- "Confirm email" is OFF. Email/password sign-up works (verified via live API).

## Env / secrets model
- `.env.local` now holds only `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` (secret key + DATABASE_URL removed).
- Vercel: only the two `VITE_` vars. `DATABASE_URL` is local + temporary for `npm run db:push`. Build guard blocks secrets under `VITE_`. Live bundle scanned: no secrets.

## Verified behaviors (live API, two real throwaway users — since deleted-except-auth)
- Stranger: cannot read/update/delete/share another user's doc; sees only own profile.
- Viewer: read-only; cannot edit, self-escalate, or re-share.
- Editor: can edit; cannot change owner_id, delete, or revoke others.
- Anon: no table/RPC access; private/auth schemas not exposed.
- Input constraints (title length, content shape, 2 MB) enforced at DB. Stored HTML rendered inert.

## Open items for the candidate
1. **Throwaway auth users remain** from testing: `atk-*`, `imp-*`, and `sec-*` @example.com (testing throwaways). Delete via Supabase dashboard → Authentication → Users, or SQL (see below). Their doc was already deleted.
2. Commit + push (scripts/, vite.config guard, env docs, **import fix in src/features/file-import/convert.ts**) and **redeploy to Vercel** so the import fix goes live.
3. Record walkthrough video → update `WALKTHROUGH_VIDEO_URL.txt` + SUBMISSION. Screenshots → `docs/screenshots/`. Assemble Google Drive folder.
4. Optional: re-run README from a clean clone; mobile-width visual pass.

## Cleanup SQL (delete leftover test users)
```sql
delete from auth.users
where email like 'atk-%@example.com'
   or email like 'imp-%@example.com'
   or email like 'sec-%@example.com';
```

## Decisions log
- No Drizzle, no Edge Functions; supabase-js + RLS + `share_document` RPC. No Docker (hosted Supabase; local stack documented). No demo/seed accounts. `shadcn` is a devDependency.

## Gotchas
- PostgREST owner embed needs `profiles!documents_owner_id_fkey`.
- RLS-blocked UPDATE/DELETE return 0 rows → always `.select()`.
- Tiptap Link `parseMarkdown` keeps unsafe hrefs → sanitized on import.
- CLI 2.31 `db push` needs the password; migrations use the session pooler (5432). CLI 2.120 needs its own login + clean `.env.local`.
