# PRD — Ajaia Docs

> Lightweight collaborative document editor for the Ajaia Full Stack Product Engineer assignment.
> Source of truth for requirements: [`idea.md`](idea.md). This PRD interprets it; it does not replace it.

---

## 1. Product overview

Ajaia Docs is a focused, browser-based document editor for internal teams. A user signs in, writes and formats documents, imports existing `.txt` / `.md` files as editable documents, and shares a document with a teammate as either a **viewer** or an **editor**. Everything persists in Postgres, and access is enforced by the database, not just the UI.

### Problem statement

Teams need a fast, low-friction place to draft shared work. Full suites like Google Docs are heavy. The assignment asks for **the strongest working slice** of that experience within 4–6 hours: depth in creation, editing, import, sharing, and persistence rather than shallow coverage of many features.

## 2. Target users

| User | Description | Primary need |
|---|---|---|
| **Author / owner** | Ajaia team member drafting a doc (spec, notes, proposal) | Write and format quickly; control who can see or edit |
| **Collaborator** | Teammate a doc is shared with | Find docs shared with them; read or edit them according to their access |
| **Reviewer** (assignment evaluator) | Tests the deployed build | Exercise every flow in minutes by signing up two accounts |

## 3. User needs and primary use cases

1. Start a new document and write formatted content without thinking about saving.
2. Bring existing notes (`.txt` / `.md`) into the tool without retyping.
3. Give a specific teammate read-only or edit access to a document.
4. See at a glance which documents I own and which were shared with me.
5. Come back later (or refresh) and find content and formatting exactly as I left it.

## 4. Core user journeys

| ID | Journey | Steps |
|---|---|---|
| **J1** | Create and edit | Sign in → "New document" → type a title → write with headings, bold/italic/underline, lists → autosave shows "Saved" → refresh → content and formatting intact |
| **J2** | Import a file | Documents page → "Import" → pick a `.md` or `.txt` file → new document opens with converted content → editable immediately |
| **J3** | Share | Owner opens a doc → "Share" → enters teammate's email, picks Viewer/Editor → teammate appears in access list |
| **J4** | Open a shared doc | Teammate signs in → "Shared with me" shows the doc with owner + role → opens it → Viewer: read-only; Editor: can edit and changes persist |
| **J5** | Revoke / change access | Owner changes a collaborator's role or removes them → collaborator's access changes on next load |

## 5. Functional requirements

Each requirement is tagged **[A]** (required by `idea.md`) or **[+]** (added by us to make the slice coherent). Priority: **P0** = must ship, **P1** = should ship, **P2** = only if time remains.

### Capability 1 — Document creation and editing

| ID | Requirement | Tag | Pri |
|---|---|---|---|
| FR-1.1 | Create a new, empty document from the documents page | A | P0 |
| FR-1.2 | Rename a document (inline title in the editor) | A | P0 |
| FR-1.3 | Edit content in the browser with a rich-text editor | A | P0 |
| FR-1.4 | Formatting: bold, italic, underline, headings (H1–H3), bulleted and numbered lists | A | P0 |
| FR-1.5 | Save and reopen: autosave after typing pauses, with a visible save-status indicator | A | P0 |
| FR-1.6 | Keyboard shortcuts for formatting (Ctrl/Cmd+B/I/U) and immediate save (Ctrl/Cmd+S) | + | P1 |
| FR-1.7 | Delete a document (owner only, with confirmation) | + | P1 |
| FR-1.8 | Undo/redo, blockquote, strikethrough via toolbar | + | P2 |

**Acceptance criteria**
- AC-1a: Clicking "New document" creates a row in the database and opens the editor at `/d/:id`.
- AC-1b: Changing the title and blurring/pressing Enter persists it; an empty title is rejected (reverts) and titles are limited to 200 characters.
- AC-1c: Each listed format can be applied from the toolbar and is visibly rendered.
- AC-1d: After editing, the indicator moves from "Unsaved changes" → "Saving…" → "Saved". A hard refresh shows identical content and formatting.
- AC-1e: Failed saves show an error state with a retry action. Unsaved changes trigger a leave-page warning.

### Capability 2 — File upload / import

| ID | Requirement | Tag | Pri |
|---|---|---|---|
| FR-2.1 | Upload a `.txt` or `.md` file and turn it into a new editable document | A | P0 |
| FR-2.2 | Supported types and size limit stated in the UI (import dialog) and README | A | P0 |
| FR-2.3 | Validation: extension allow-list, max size 500 KB, non-empty, valid UTF-8; clear error messages | A | P0 |
| FR-2.4 | Markdown structure preserved: headings, bold/italic, lists, blockquotes, code, links | + | P0 |
| FR-2.5 | Title derived from the file name (without extension) | + | P1 |
| FR-2.6 | Drag-and-drop a file onto the import dialog | + | P2 |
| FR-2.7 | `.docx` import | + | P2 (deferred by default) |

**Acceptance criteria**
- AC-2a: Importing `notes.md` with `# Title`, a bulleted list, and `**bold**` produces a document titled "notes" with an H1, a bullet list, and bold text.
- AC-2b: Importing a `.txt` file preserves paragraphs (blank-line separated) and line breaks.
- AC-2c: A `.pdf`, an empty file, a file over 500 KB, or non-UTF-8 bytes are each rejected with a specific message, and no document is created.
- AC-2d: Unsafe link targets (e.g. `javascript:`) in Markdown never become clickable links.

### Capability 3 — Sharing

| ID | Requirement | Tag | Pri |
|---|---|---|---|
| FR-3.1 | Every document has exactly one owner (its creator) | A | P0 |
| FR-3.2 | Owner can grant a registered user access by email | A | P0 |
| FR-3.3 | Two roles: **Viewer** (read-only) and **Editor** (read + edit content and title) | + | P0 |
| FR-3.4 | Visible distinction: "My documents" vs "Shared with me", showing owner email and role on shared docs | A | P0 |
| FR-3.5 | Owner can change a collaborator's role and revoke access | + | P1 |
| FR-3.6 | Permissions enforced at the database (RLS), not just hidden in the UI | + | P0 |
| FR-3.7 | Lightweight email + password sign-up and login (no seeded or demo accounts; testers register real users) | A (allowed) | P0 |

Only the owner can share, change roles, revoke, or delete. Editors cannot re-share.

**Acceptance criteria**
- AC-3a: Sharing with an unregistered email shows "No user found with that email"; sharing with yourself is rejected.
- AC-3b: A viewer sees the document read-only (no toolbar, title not editable). A direct API update attempt by a viewer changes nothing.
- AC-3c: An editor's content changes persist and are visible to the owner after reload.
- AC-3d: A user with no share cannot load the document. The editor shows "Document not found or you don't have access", without revealing whether it exists.
- AC-3e: After revocation, the collaborator no longer sees the document in "Shared with me".

### Capability 4 — Persistence

| ID | Requirement | Tag | Pri |
|---|---|---|---|
| FR-4.1 | Documents (title, content, owner, timestamps) stored in Postgres | A | P0 |
| FR-4.2 | Formatting stored as structured Tiptap/ProseMirror JSON (`jsonb`), not lossy plain text | A | P0 |
| FR-4.3 | Sharing relationships and roles stored in Postgres | A | P0 |
| FR-4.4 | `created_at` / `updated_at` maintained by the database; list sorted by last modified | + | P1 |

**Acceptance criteria**
- AC-4a: Refresh, sign out/in, or opening on another browser shows the same content and formatting.
- AC-4b: Shared access survives refresh and re-login for both users.

### Capability 5 — Product and engineering quality

| ID | Requirement | Tag | Pri |
|---|---|---|---|
| FR-5.1 | README with local setup and run instructions | A | P0 |
| FR-5.2 | Working public deployment | A | P0 |
| FR-5.3 | Validation and error handling (client + database constraints) | A | P0 |
| FR-5.4 | At least one meaningful automated test (import conversion and access control) | A | P0 |
| FR-5.5 | Architecture note covering priorities and trade-offs (`architecture.md`) | A | P0 |
| FR-5.6 | AI workflow note (`AI_WORKFLOW.md`) | A | P0 |
| FR-5.7 | `SUBMISSION.md`, walkthrough video URL text file, reviewer credentials | A | P0 |
| FR-5.8 | Loading, empty, error, and success states on every screen | + | P0 |

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| Security | No privileged secrets in the frontend or the production environment (the DB connection string is local-only and temporary). Authorization enforced via Postgres RLS, column grants, and `SECURITY DEFINER` functions. Rendering never injects user HTML. |
| Usability | Minimal, calm UI. Clear hierarchy. Keyboard-accessible controls with visible focus states. Labelled inputs. Destructive actions confirmed. |
| Responsiveness | Usable from 360 px mobile width to desktop. Toolbar wraps or scrolls on small screens. |
| Performance | Documents list never loads document bodies. Saves are debounced (~1 s) and serialized, so only one request is in flight per document. |
| Reliability | No silent data loss: failed saves are surfaced, and unsaved changes trigger a leave-page warning. |
| Cost | Free tiers only; reviewers never pay for anything. |
| Maintainability | TypeScript throughout, feature-based folders, schema changes via SQL migrations. |

## 7. MVP scope and explicit exclusions

**In scope (MVP):** everything marked P0 above, plus P1 items where time allows.

**Explicitly excluded (deliberate cuts):**
- Real-time co-editing, presence, and cursors (needs CRDT/Yjs plus a sync server; out of scope for the timebox). Concurrent edits are **last-write-wins**.
- Comments, suggestions, version history, folders, search, notifications, email invitations.
- Sharing with people who have not registered yet, public links, link sharing, and team/org permissions.
- Image/table embedding; `.docx`/`.pdf` import (see FR-2.7).
- Password reset, OAuth providers, and email verification flows.

## 8. Additional product ideas (not assignment requirements)

These come next if time allows or in a follow-up. They are not part of the assignment:
- Export to Markdown (cheap: `@tiptap/markdown` can serialize).
- `.docx` import via `mammoth`.
- "Leave document" for collaborators; editors able to see the collaborator list.
- Optimistic-concurrency conflict warning using `updated_at`.
- Realtime collaboration with Yjs plus Supabase Realtime or Hocuspocus.

## 9. Assumptions

1. Collaborators must already have an account. Sharing looks up a registered user by email.
2. Revealing whether an email is registered (in the share dialog) is acceptable for an internal tool.
3. Last-write-wins is acceptable for concurrent editors in this slice.
4. A single hosted Supabase project (free tier) serves both local development and production. The Supabase local stack (Docker) is documented as an option for other developers; a plain Postgres alone is not supported (`architecture.md` D6).
5. Email confirmation is disabled on the Supabase project so reviewers can sign up instantly. There are deliberately no seeded/demo accounts: testing uses real sign-ups.
6. Markdown import targets CommonMark/GFM basics. Unsupported constructs (images, tables) are dropped or flattened to text.

## 10. Known limitations (initial; kept current in `SUBMISSION.md`)

- No real-time collaboration. Two editors saving concurrently overwrite each other (last write wins).
- Import is limited to `.txt` and `.md`, max 500 KB.
- Sharing requires the recipient to be registered.

## 11. Success criteria

The submission succeeds when:
1. A reviewer can complete J1–J5 on the live URL by signing up two accounts, without local setup.
2. Permissions are demonstrably enforced by the database. An automated test proves it.
3. Content and formatting survive refresh and re-login.
4. Docs are honest: every claimed feature is verified, and every gap is disclosed.
5. Total build time stays within 6 hours.
