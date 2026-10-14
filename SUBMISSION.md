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
| Source code | repo root (`src/`, `supabase/`, `tests/`) | ⏳ |
| README with local setup and run instructions | `README.md` | 🟠 drafted, not yet verified from a clean clone |
| Architecture note (priorities and trade-offs) | `architecture.md` | 🟠 design written, will be updated to match the code |
| AI workflow note | `AI_WORKFLOW.md` | 🟠 in progress |
| SUBMISSION.md listing what is included | this file | 🟠 in progress |
| Live product URL | above | ⏳ |
| Walkthrough video URL text file | `WALKTHROUGH_VIDEO_URL.txt` | ⏳ placeholder |
| Screenshots / demo GIF | `docs/screenshots/` | ⏳ |
| Test accounts | self sign-up (see Reviewer access) | ⏳ |
| Automated tests | `src/**/*.test.ts`, `tests/integration/` | ⏳ |
| Supporting docs | `PRD.md`, `plan.md`, `memory.md` | ✅ initial versions written |

## Feature status

| Capability | Status | Notes |
|---|---|---|
| 1. Create / rename / edit / save / reopen, rich text | ⏳ | |
| 2. File import (`.txt`, `.md`) | ⏳ | |
| 3. Sharing (owner, viewer/editor, owned vs shared) | ⏳ | |
| 4. Persistence (Postgres, JSON rich text, shares) | ⏳ | |
| 5. Quality: tests, validation, deployment, docs | ⏳ | |

## Automated tests

| Suite | Command | Last result |
|---|---|---|
| Unit (import) | `npm test` | not yet run |
| Integration (RLS) | `npm run test:integration` | not yet run |

## Known limitations

- No real-time co-editing; last write wins.
- Recipients must be registered users; no invitations.
- Import limited to `.txt` / `.md` (≤ 500 KB).

## Incomplete / next 2–4 hours

_To be filled at the end of the build._

## Walkthrough outline (3–5 min)

_To be filled in Phase 3._
