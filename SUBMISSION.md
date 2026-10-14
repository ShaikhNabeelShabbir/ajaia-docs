# Submission — Ajaia Docs

> Status legend: ✅ complete & verified · 🟡 implemented, not fully verified · 🟠 partial · ⏳ pending · ⛔ deferred
> Nothing below is marked ✅ until it has actually been checked.

## Links

| Item | Value | Status |
|---|---|---|
| Live product URL | `<PENDING — Vercel URL>` | ⏳ |
| Walkthrough video | `<PENDING — Loom/YouTube URL>` (also in `WALKTHROUGH_VIDEO_URL.txt`) | ⏳ |
| Google Drive folder | `<PENDING — prepared by candidate>` | ⏳ |
| Source repository (optional) | `<PENDING>` | ⏳ |

## Reviewer access

There are no seeded or demo accounts. Reviewers sign up as real users (email confirmation is disabled, so accounts work immediately).

**Suggested 3-minute test:** create account A → create a document → create account B in another browser/private window → as A, Share with B's email as Viewer → as B, "Shared with me" → doc is read-only → as A, switch B to Editor → B edits → A reloads and sees the edits.

## Deliverables checklist (from `idea.md`)

| Deliverable | File / location | Status |
|---|---|---|
| Source code | repo root (`src/`, `supabase/`, `scripts/`, `tests/`); GitHub `ShaikhNabeelShabbir/ajaia-docs` | 🟡 pushed (latest local commit not yet pushed at last check) |
| README with local setup and run instructions | `README.md` | 🟡 complete (setup, env vars, DB setup, local-DB option, deploy); clean-clone re-run pending |
| Architecture note (priorities and trade-offs) | `architecture.md` | 🟡 matches the code; final pass after deploy |
| AI workflow note | `AI_WORKFLOW.md` | 🟠 in progress |
| SUBMISSION.md listing what is included | this file | 🟠 in progress |
| Live product URL | above | ⏳ |
| Walkthrough video URL text file | `WALKTHROUGH_VIDEO_URL.txt` | ⏳ placeholder |
| Screenshots / demo GIF | `docs/screenshots/` | ⏳ |
| Test accounts | self sign-up (see Reviewer access) | ⏳ |
| Automated tests | `src/**/*.test.ts`, `scripts/db-push.test.ts`, `tests/integration/` | ✅ unit 33/33 passing |
| Supporting docs | `PRD.md`, `plan.md`, `memory.md` | ✅ initial versions written |

## Feature status

| Capability | Status | Notes |
|---|---|---|
| 1. Create / rename / edit / save / reopen, rich text | 🟡 | Manually tested locally by the candidate; live-URL check pending |
| 2. File import (`.txt`, `.md`) | 🟡 | Conversion + validation unit-tested; manually tested locally |
| 3. Sharing (owner, viewer/editor, owned vs shared) | 🟡 | DB rules verified on the live project (22 scenarios); UI manually tested locally |
| 4. Persistence (Postgres, JSON rich text, shares) | 🟡 | Schema live on Supabase; live-URL check pending |
| 5. Quality: tests, validation, deployment, docs | 🟠 | Tests, validation, docs done; deployment pending |

## Automated tests

| Suite | Command | Last result |
|---|---|---|
| Unit (import, autosave queue, db:push URL handling) | `npm test` | ✅ 33/33 passing |
| DB permissions on the live project | SQL impersonation, rolled back (see `AI_WORKFLOW.md`) | ✅ 22/22 as expected |
| Integration via API (optional) | `npm run test:integration` | not run (needs `SUPABASE_SECRET_KEY`; skipped by choice) |

## Environment and secrets (for anyone running or deploying it)

- Production (Vercel) needs only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- `DATABASE_URL` is used **only locally** to apply the schema (`npm run db:push`), then deleted. It is never deployed and never reaches the browser (build guard + bundle scan). Details: README → "Environment variables".

## Known limitations

- No real-time co-editing; last write wins.
- Recipients must be registered users; no invitations.
- Import limited to `.txt` / `.md` (≤ 500 KB).

## Incomplete / next 2–4 hours

_To be filled at the end of the build._

## Walkthrough outline (3–5 min)

_To be filled in Phase 3._
