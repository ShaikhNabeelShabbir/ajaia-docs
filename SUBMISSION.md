# Submission — Ajaia Docs

> Status legend: ✅ complete & verified · 🟡 implemented, not fully verified · 🟠 partial · ⏳ pending · ⛔ deferred
> Nothing below is marked ✅ until it has actually been checked.

## Links

| Item | Value | Status |
|---|---|---|
| Live product URL | https://ajaia-docs-nu-peach.vercel.app | ✅ live (⚠ redeploy to ship the import fix below) |
| Walkthrough video | `<PENDING — Loom/YouTube URL>` (also in `WALKTHROUGH_VIDEO_URL.txt`) | ⏳ |
| Google Drive folder | `<PENDING — prepared by candidate>` | ⏳ |
| Source repository | https://github.com/ShaikhNabeelShabbir/ajaia-docs | ✅ |

## Reviewer access

There are no seeded or demo accounts. Reviewers sign up as real users (email confirmation is disabled, so accounts work immediately).

**Suggested 3-minute test:** create account A → create a document → create account B in another browser/private window → as A, Share with B's email as Viewer → as B, "Shared with me" → doc is read-only → as A, switch B to Editor → B edits → A reloads and sees the edits.

## Deliverables checklist (from `idea.md`)

| Deliverable | File / location | Status |
|---|---|---|
| Source code | repo root (`src/`, `supabase/`, `scripts/`, `tests/`); GitHub `ShaikhNabeelShabbir/ajaia-docs` | 🟡 pushed (latest local commit not yet pushed at last check) |
| README with local setup and run instructions | `README.md` | 🟡 complete (setup, env vars, DB setup, local-DB option, deploy); clean-clone re-run pending |
| Architecture note (priorities and trade-offs) | `architecture.md` | 🟡 matches the code; final pass after deploy |
| AI workflow note | `AI_WORKFLOW.md` | ✅ complete |
| SUBMISSION.md listing what is included | this file | ✅ complete |
| Live product URL | https://ajaia-docs-nu-peach.vercel.app | ✅ live |
| Walkthrough video URL text file | `WALKTHROUGH_VIDEO_URL.txt` | ⏳ placeholder |
| Screenshots / demo GIF | `docs/screenshots/` | ⏳ |
| Test accounts | self sign-up (see Reviewer access) | ✅ no seeded accounts needed |
| Automated tests | `src/**/*.test.ts`, `scripts/db-push.test.ts`, `tests/integration/` | ✅ unit 36/36 passing |
| Supporting docs | `PRD.md`, `plan.md`, `memory.md` | ✅ initial versions written |

## Feature status

| Capability | Status | Notes |
|---|---|---|
| 1. Create / rename / edit / save / reopen, rich text | ✅ | Code + live API verified; candidate tested in browser |
| 2. File import (`.txt`, `.md`) | ✅ | Conversion + validation unit-tested; tested in browser |
| 3. Sharing (owner, viewer/editor, owned vs shared) | ✅ | RLS verified on live project (22 scenarios); UI tested |
| 4. Persistence (Postgres, JSON rich text, shares) | ✅ | Live on Supabase; create/read/update verified via live API |
| 5. Quality: tests, validation, deployment, docs | ✅ | 33 tests, validation, live deployment, security review, docs |

## Automated tests

| Suite | Command | Last result |
|---|---|---|
| Unit (import + edge cases, autosave queue, db:push URL handling) | `npm test` | ✅ 36/36 passing |
| DB permissions on the live project | SQL impersonation, rolled back (see `AI_WORKFLOW.md`) | ✅ 22/22 as expected |
| Integration via API (optional) | `npm run test:integration` | not run (needs `SUPABASE_SECRET_KEY`; skipped by choice) |

## Environment and secrets (for anyone running or deploying it)

- Production (Vercel) needs only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- `DATABASE_URL` is used **only locally** to apply the schema (`npm run db:push`), then deleted. It is never deployed and never reaches the browser (build guard + bundle scan). Details: README → "Environment variables".

## Requirement audit against `idea.md`

| `idea.md` requirement | Status | Evidence |
|---|---|---|
| **1. Document creation & editing** | | |
| Create a new document | ✅ | "New document" → row inserted → `/d/:id` |
| Rename a document | ✅ | Inline title, validated (1–200 chars) |
| Edit content in a browser | ✅ | Tiptap editor |
| Save and reopen | ✅ | Autosave; survives refresh/re-login |
| Bold, italic, underline | ✅ | Toolbar + shortcuts |
| Headings / text size | ✅ | H1–H3 + normal text |
| Bulleted / numbered lists | ✅ | Both, plus quote/strikethrough |
| **2. File upload** | | |
| Upload a file into the workflow | ✅ (local) / ⚠ live pending redeploy | Import `.txt`/`.md` → new editable doc. A fix for image/table-heavy files is committed locally but **not yet redeployed**; the live site must be redeployed for import to work on files with images/tables. |
| Supported types stated in UI + README | ✅ | Import dialog + README |
| **3. Sharing** | | |
| A document owner | ✅ | `documents.owner_id` |
| Grant another user access | ✅ | Share by email, Viewer/Editor |
| Owned vs shared distinction | ✅ | "My documents" / "Shared with me" tabs |
| Enforced (not just UI) | ✅ | RLS; verified by security review (22 scenarios) |
| **4. Persistence** | | |
| Docs survive refresh | ✅ | Postgres (Supabase) |
| Formatting/structure preserved | ✅ | Tiptap JSON in `jsonb` |
| Shared access demonstrable | ✅ | End-to-end across two accounts |
| **5. Product & engineering quality** | | |
| Setup & run instructions | ✅ | `README.md` |
| Working deployment reviewers can access | ✅ | Live Vercel URL (above) |
| Basic validation & error handling | ✅ | Client + DB constraints; loading/empty/error states |
| At least one meaningful automated test | ✅ | 36 unit tests + RLS verification + optional integration suite |
| Architecture note | ✅ | `architecture.md` |
| AI-native workflow note | ✅ | `AI_WORKFLOW.md` |
| Walkthrough video (3–5 min) | ⏳ | Not recorded; `WALKTHROUGH_VIDEO_URL.txt` placeholder |
| SUBMISSION.md listing contents | ✅ | this file |
| Credentials / test accounts | ✅ | Self sign-up (no seeded accounts needed) |
| Google Drive folder | ⏳ | Candidate assembles for submission |

## Security

Full black-box + gray-box review in [`docs/security-review.md`](docs/security-review.md). **No vulnerabilities found** across transport, secret exposure, RLS authorization (stranger/viewer/editor/owner matrix), input validation, injection, JWT tampering, and role smuggling. One intentional, documented disclosure: the share flow reveals whether an email is registered.

## Known limitations

- No real-time co-editing; last write wins (disclosed trade-off vs. CRDT/Yjs).
- Recipients must be registered users; no email invitations or public links.
- Import limited to `.txt` / `.md` (≤ 500 KB); no `.docx`/`.pdf`.
- "No user found" on sharing returns HTTP 500 under the hood (mapped to a friendly message in the UI).
- Markdown tables/images are not rendered richly: images keep alt text; table-only files import as plain text (content preserved, not blank).

## What works end to end

Create → format → autosave → refresh (persists) · Import `.md`/`.txt` → editable doc · Share by email as Viewer/Editor · Owned vs shared lists · Viewer read-only / Editor edits (enforced by the database) · Change role / revoke.

## What I'd build next with 2–4 more hours

1. Record the walkthrough video and capture screenshots/GIF.
2. Run the optional Vitest RLS integration suite in CI (it already exists).
3. Export to Markdown (download), and `.docx` import via `mammoth`.
4. Optimistic-concurrency warning using `updated_at` (mitigates last-write-wins).
5. Return a clean response for "no user found" instead of raising (removes the 500).

## Walkthrough outline (3–5 min, to record)

1. Sign up + sign in (email/password; no demo accounts by design).
2. Create a document, rename it, show formatting (headings, bold/italic/underline, lists), refresh to show persistence.
3. Import a `.md` file → formatted document.
4. Share with a second account as Viewer (second browser) → show read-only + "Shared with me".
5. Upgrade to Editor → edit → owner sees the change.
6. Revoke → access gone.
7. Close on key decisions: RLS as the authorization boundary (no Drizzle/Edge Functions), Tiptap JSON persistence, deliberate scope cuts, and how AI was used + verified.

The drive containing the project is at this URl : https://drive.google.com/drive/folders/1FY2_UjdxxEL0ect99hCTAME-Wkrorq_J?usp=sharing
