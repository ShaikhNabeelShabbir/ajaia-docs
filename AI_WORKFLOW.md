# AI Workflow Note

> Running log, kept truthful. Updated as work happens; nothing listed here is aspirational.

## Tools used

- **Claude Code (Claude Opus 5.5) in VS Code**: the primary agent for planning, documentation, implementation, and verification commands, working from a detailed brief written by the candidate.
- The candidate set direction and scope and reviewed the output (e.g. ruled out a Docker-based local Supabase stack).

## Where AI materially sped things up

| Area | How |
|---|---|
| Requirement analysis | Turned `idea.md` into a PRD with tagged requirements ([A] assignment vs [+] added) and acceptance criteria |
| Architecture | Evaluated the suggested stack against the timebox and wrote decision records |
| _(more added as the build progresses)_ | |

## AI suggestions changed or rejected

| Suggestion | Outcome | Reason |
|---|---|---|
| The brief's suggested stack included **Drizzle ORM** | **Rejected** | Needs a privileged server-side Postgres connection that bypasses RLS. Would add a server tier just to host it. See architecture D1. |
| The brief's suggested stack included **Supabase Edge Functions** | **Not used** | The one privileged operation (lookup user by email + create share) is safer and simpler as an owner-checked `SECURITY DEFINER` SQL function (D2). |
| Run a local Supabase stack via Docker | **Rejected by candidate** | No Docker. Switched to hosted Supabase plus `supabase db push` (D6). |
| Markdown import via `marked` → HTML → DOM parse | **Replaced** | After inspecting the `@tiptap/markdown` 3.32 type definitions, `MarkdownManager.parse()` turned out to parse directly into the editor schema with no HTML step. Simpler and smaller attack surface. |
| Trusting the Markdown parser's output as-is | **Changed** | Reading the Link extension source showed `parseMarkdown` copies `href` verbatim (`javascript:` survives into stored JSON), and `####` produces a heading level the editor renders as H1. Added a sanitize pass plus tests for both. |
| Embedding the owner as `profiles(email)` | **Changed before running** | `document_shares` is a junction between documents and profiles, so PostgREST would see two relationships and reject the embed as ambiguous. Pinned to `profiles!documents_owner_id_fkey`. |
| Query retry rule `!('code' in error)` | **Fixed** | supabase-js reports network failures with an empty `code`, so this would never retry them. Changed to check for a truthy code. |
| A first unit-test expectation (`titleFromFileName('.md')`) | **Test corrected** | The failing case was a dotfile that validation already rejects. The test was replaced with the real fallback case (whitespace-only name) instead of bending the code. |

## How output was verified

- **Before committing to libraries:** downloaded and inspected the actual published packages (`@tiptap/starter-kit` deps confirm Underline and Link are bundled; `@tiptap/markdown` `.d.ts` confirms the `parse` API) rather than relying on memory.
- **Dependency added by tooling:** shadcn v4 init added an unfamiliar `cn` package. Checked its `package.json` (repository `shadcn-ui/cn`, a clsx + tailwind-merge replacement) before accepting it.
- **Unit tests (run):** 27 passing. They cover import validation (type, size, empty, invalid UTF-8), Markdown/text conversion validated against the editor schema, unsafe-link stripping, and the autosave queue (debounce, no concurrent saves, retry keeps the failed value, newer edits not overwritten). Run with `npm test`.
- **Secrets handling:** API keys were fetched with the Supabase CLI and written straight to a gitignored `.env.local` (mode 600) without printing them.
- **Database permissions (run against the live project):** after applying the migration, the catalog was inspected (RLS on every table, 7 policies, `anon` has no table privileges, clients can only write `title`/`content`). Then 22 scenarios were run as two temporary users (stranger → viewer → editor → revoked, plus anonymous) inside a single transaction that was rolled back. Every result matched the expected allow/deny, and no data was left behind. The candidate preferred browser testing over secret-key scripts, so the Vitest integration suite stays in the repo but was not run.
- **Credential hygiene:** the database connection string was added temporarily by the candidate, used only for `db push` and the checks above (password never printed), then removed from `.env.local`.
- _(Pending:)_ manual J1–J5 run in the browser, locally and on the live URL.

## Remaining risks

- RLS policy correctness is the highest-stakes area. It is covered by the integration test (pending).
- AI-written UI copy and states still need a human usability pass.
