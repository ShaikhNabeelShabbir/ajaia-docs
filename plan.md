# Execution Plan — Ajaia Docs

Legend: `[ ]` not started · `[-]` in progress · `[x]` complete **and verified** · `[~]` deferred
**M** = mandatory (assignment) · **O** = optional improvement

## Goals and constraints

- Ship the five core capabilities (create/edit, import, sharing, persistence, quality) as one coherent, deployed slice.
- **Timebox: ≤ 6 h total, target 5 h.** Session started 2026-10-14 10:55 IST. Hard stop at **16:55 IST**.
- Free tiers only. No Docker (hosted Supabase only). Authorization enforced in Postgres.
- Rule: a task is `[x]` only when its acceptance check has actually been run.

## Time budget

| Phase | Budget | Cumulative | Exit criterion |
|---|---|---|---|
| 0 Plan & docs | 0:30 | 0:30 | All 7 root docs exist; stack and schema decided |
| 1 Foundation | 1:00 | 1:30 | User can sign up/in on localhost against hosted Supabase; migration applied; RLS live |
| 2 Core product | 2:00 | 3:30 | J1–J5 work on localhost |
| 3 Quality & delivery | 1:00 | 4:30 | Tests green, build green, deployed URL passes J1–J5 |
| 4 Final review | 0:30 | 5:00 | Requirement audit done; docs match code |
| Buffer | 1:00 | 6:00 | — |

---

## Phase 0 — Inspect and plan  (M)

- [x] Read `idea.md`; extract requirements, deliverables, evaluation criteria
- [x] Inspect environment (Node 25, npm 11, Supabase CLI logged in, no Docker, no Vercel CLI)
- [x] Validate stack: confirm Tiptap v3 StarterKit includes Underline/Link; `@tiptap/markdown` exposes `MarkdownManager.parse`
- [x] Write `PRD.md`, `architecture.md`, `plan.md`
- [x] Write `memory.md`, `README.md`, `SUBMISSION.md`, `AI_WORKFLOW.md`, `WALKTHROUGH_VIDEO_URL.txt`

**Done when:** all docs exist and the stack/schema decisions are recorded. ✅

## Phase 1 — Foundation  (M)

| # | Task | Depends | Acceptance check |
|---|---|---|---|
| 1.1 | [x] Scaffold Vite 8 + React 19 + TS 6; Tailwind v4, `@/` alias | — | `npm run build` passes ✔ |
| 1.2 | [x] Init shadcn/ui (radix-nova preset, Geist font); added input, label, dialog, alert-dialog, dropdown-menu, select, tabs, badge, sonner, tooltip, skeleton, separator | 1.1 | Typecheck + build pass ✔ |
| 1.3 | [-] Neutral palette (shadcn tokens) + editor typography CSS in `src/index.css` | 1.2 | Written; visual check pending first run |
| 1.4 | [x] Supabase project: user created `ajaia-docs` (ref `arjyzsauhprjqhbpqikf`, Singapore) | — | Keys fetched via CLI into `.env.local` ✔ |
| 1.5 | [x] `supabase/migrations/20261014054005_init.sql`: tables, enum, constraints, triggers, grants, private helpers, RLS, `share_document` RPC | — | Applied and verified (below) ✔ |
| 1.6 | [x] `supabase db push` via a temporary `DATABASE_URL` (removed afterwards) | 1.4, 1.5 | Catalog: RLS on all 3 tables, 7 policies, column grants, triggers, migration history ✔; 22 rolled-back RLS checks ✔ |
| 1.6b | [ ] **User:** turn off Auth → Email → "Confirm email" | — | `/auth/v1/settings` shows `mailer_autoconfirm: true` |
| 1.7 | [x] `src/lib/database.types.ts` generated from the live schema | 1.6 | `tsc -b` passes ✔ |
| 1.8 | [-] Supabase client + `AuthProvider` + `ProtectedRoute` + Login/Sign-up page | 1.6 | Code done; sign up/in/out on localhost pending schema |

**Done when:** a new user can sign up and sign in locally, and the `profiles` row is auto-created.

## Phase 2 — Core product  (M)

| # | Task | Depends | Acceptance check |
|---|---|---|---|
_All Phase 2 code is written and type-checks; nothing is marked `[x]` until exercised against the live schema._

| # | Task | Depends | Acceptance check |
|---|---|---|---|
| 2.1 | [-] Documents API + hooks (list, get, create, rename, save, delete) with 0-row ⇒ denied handling | 1.8 | Hooks typed ✔; errors mapped to messages ✔ |
| 2.2 | [-] Documents page: "My documents" / "Shared with me" tabs, owner + role + updated time, empty/loading/error states, New + Import buttons | 2.1 | AC-1a; FR-3.4 distinction visible |
| 2.3 | [-] Editor page: Tiptap StarterKit + Placeholder, toolbar (undo/redo, text style, B/I/U/S, lists, quote) | 2.1 | AC-1c |
| 2.4 | [-] Autosave: `SaveQueue` (unit-tested ✔) + hook with status indicator, Cmd/Ctrl+S, beforeunload guard, flush on unmount | 2.3 | AC-1d, AC-1e; refresh preserves formatting (AC-4a) |
| 2.5 | [-] Inline title rename with validation (Enter/blur saves, Esc reverts, empty rejected) | 2.3 | AC-1b |
| 2.6 | [-] Delete document (owner, confirm dialog) (O) | 2.2 | Doc removed; non-owner has no delete action and DB denies |
| 2.7 | [-] File import: validate + convert (unit-tested ✔), Import dialog with drag-and-drop and supported-types copy | 2.1 | AC-2a–AC-2d |
| 2.8 | [-] Share dialog: email + role, collaborator list, change role, revoke (owner only) | 2.1 | AC-3a, AC-3e |
| 2.9 | [-] Viewer mode: read-only editor, no toolbar, "View only" banner; editors see "You can edit" | 2.3 | AC-3b (UI), AC-3c |
| 2.10 | [-] Not-found/no-access state for `/d/:id` (also handles malformed ids) | 2.3 | AC-3d |

**Done when:** J1–J5 pass manually on localhost with two accounts.

## Phase 3 — Quality and delivery  (M)

| # | Task | Depends | Acceptance check |
|---|---|---|---|
| 3.1 | [x] Unit tests: import validation + conversion + schema validity + unsafe links; SaveQueue; db:push URL | 2.7 | `npm test` → 33/33 pass ✔ |
| 3.2 | [-] Integration test `tests/integration/access-control.test.ts` (7 cases) | 1.6 | Written; not run (user prefers no secret-key scripts). Same rules verified via SQL as two users in a rolled-back transaction (22/22) ✔ |
| 3.3 | [~] Seed script and demo accounts — **removed at user request**; testing uses real sign-ups | — | No demo code or accounts remain ✔ |
| 3.4 | [x] Lint + typecheck + production build | all | `tsc -b`, `oxlint`, `vite build` all pass; editor + importer code-split; prod deps audit clean |
| 3.4b | [x] Secrets hygiene: `npm run db:push` (local-only `DATABASE_URL`), build guard against secrets in `VITE_*`, Vitest env narrowed, `.env.example` + README documented | — | Guard rejects `VITE_DATABASE_URL` and `sb_secret_` ✔; bundle scan finds no secret/DB URL ✔; 6 unit tests ✔ |
| 3.4c | [x] Document local DB option (Supabase local stack) and why plain Postgres isn't supported | — | README + architecture D6 ✔ |
| 3.5 | [x] Deployed to Vercel (by candidate): https://ajaia-docs-nu-peach.vercel.app | 3.4 | All routes HTTP 200; bundle has no secrets; deployed build matches current code (no demo) ✔ |
| 3.6 | [x] Email confirmation OFF; sign-up/sign-in work on live API | 3.5 | Two accounts created + authenticated via live API ✔ |
| 3.7 | [-] Live J1–J5: sharing/persistence verified via live API; browser UI tested by candidate; mobile-width pass pending | 3.5 | API-level matrix ✔; visual mobile check remaining |
| 3.8 | [ ] Screenshots to `docs/screenshots/` (candidate, for submission) | 3.7 | Files exist and referenced from SUBMISSION.md |
| 3.9 | [x] Walkthrough outline in SUBMISSION.md | 3.7 | Outline covers all required topics ✔ (video not yet recorded) |

| 3.10 | [x] Security review of live deployment (30+ probes) | 3.5 | No vulns; `docs/security-review.md` ✔ |

### Manual verification checklist (run on live URL)
- [ ] J1 create → format (H1, bold, italic, underline, bullets, numbers) → refresh → intact
- [ ] J1 rename → refresh → title persists; empty title rejected
- [ ] J2 import `.md` → structure preserved; import `.txt` → paragraphs; `.pdf` rejected with message
- [ ] J3 share with reviewer B as Viewer; unknown email rejected; self rejected
- [ ] J4 B sees doc under "Shared with me" with owner + Viewer; cannot edit
- [ ] J4 owner upgrades B to Editor; B edits; owner sees change after reload
- [ ] J5 owner revokes B; B no longer sees doc; direct `/d/:id` shows no-access state
- [ ] Mobile width 375 px usable; keyboard Tab order and focus rings visible

## Phase 4 — Final review  (M)

- [x] Requirement-by-requirement audit against `idea.md` (table in SUBMISSION.md) ✔ every core requirement ✅
- [-] Docs match code: architecture folder tree + env model updated ✔; README clean-clone re-run still recommended
- [x] `memory.md`, `SUBMISSION.md`, `AI_WORKFLOW.md` updated ✔
- [ ] Prepare Google Drive folder (candidate) + record walkthrough video

## Optional improvements (only after Phase 3 is green)

- [ ] (O) Export document as Markdown (`MarkdownManager.serialize`)
- [ ] (O) Drag-and-drop file onto documents page
- [ ] (O) `.docx` import via `mammoth`
- [ ] (O) Optimistic-concurrency warning using `updated_at`
- [ ] (O) Word count in editor footer

## Explicitly deferred

- [~] Real-time co-editing / presence (Yjs) — out of timebox
- [~] Comments, version history, folders, search, notifications
- [~] Invite-by-email for unregistered users, public links
- [~] Password reset / OAuth
