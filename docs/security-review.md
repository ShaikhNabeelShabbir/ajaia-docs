# Security Review — Ajaia Docs

Black-box and gray-box testing of the live deployment (`https://ajaia-docs-nu-peach.vercel.app`) and its Supabase backend, performed against the owner's own project with authorization. Tests were non-destructive (no flooding, brute force, or DoS). All test data was removed afterward.

_Last run: 2026-10-14._

## Summary

**No vulnerabilities found.** 30+ probes across transport, secret exposure, authentication, authorization (RLS), input validation, and injection all behaved as designed. One intentional, documented information disclosure remains (email-registration check in the share flow).

## Method

- Downloaded and inspected the production JS bundle for secrets and source maps.
- Probed the Supabase REST/Auth API unauthenticated using only the public key shipped in the bundle.
- Created two throwaway accounts via normal sign-up and exercised the full authorization matrix (stranger / viewer / editor / owner) directly against the API, bypassing the UI.
- Tested input validation, stored-content injection, JWT tampering, and role smuggling.

## Results

### Transport & hosting
- HTTP redirects to HTTPS (308). HSTS present (`max-age=63072000; includeSubDomains; preload`).
- No source maps served (`.js.map` → 403); no `sourceMappingURL` comments in the bundle.

### Secret exposure (production bundle)
- Contains only `VITE_SUPABASE_URL` and the **publishable** key (public by design).
- No secret/`service_role` key, no `DATABASE_URL`, no Postgres/pooler host, no JWTs, no `SUPABASE_SECRET_KEY`. (The one `sb_secret_` string is supabase-js's own key-format check, not a value.)

### Unauthenticated API (public key only)
| Probe | Result |
|---|---|
| `GET` documents / profiles / document_shares | `42501` permission denied (anon has no table privileges) |
| `POST` documents, `rpc/share_document` | denied |
| Access `private` / `auth` schema via `Accept-Profile` | `PGRST106` — only `public`, `graphql_public` exposed |
| Call `private` helper functions as RPC | not found (not exposed) |
| OpenAPI schema dump | `401` secret key required |
| Storage buckets | `[]` (none; no storage used) |

### Authorization matrix (two real users, A owns a doc)
| Attack as B | Result |
|---|---|
| Read A's unshared doc by id | `[]` (0 rows) — not found/forbidden indistinguishable |
| List all documents | only B's own + shared |
| Update / delete A's doc | `[]` (0 rows) — RLS blocks |
| Insert a share row for self | `42501` (no INSERT grant; shares only via RPC) |
| Share A's doc via RPC | `403` "Only the document owner can share it" |
| Read A's profile (before share) | `[]` — profiles scoped to self + collaborators |
| **Viewer:** edit content/title | `[]` (0 rows) |
| **Viewer:** escalate own share to editor | `42501` (no UPDATE grant on shares) |
| **Viewer:** re-share | `403` |
| **Editor:** edit content/title | allowed (correct) |
| **Editor:** change `owner_id` (hijack) | `42501` (column grant limited to title/content) |
| **Editor:** delete doc / revoke others | `[]` (0 rows) — owner-only |

### Input validation (DB constraints, authoritative)
| Input | Result |
|---|---|
| Blank / whitespace title | `23514` check violation |
| Title > 200 chars | `23514` |
| `content` not a `{type:"doc"}` object, or an array | `23514` |
| `content` > 2 MB | `23514` |

### Injection & auth integrity
| Attack | Result |
|---|---|
| `owner_id` forged at INSERT | `42501` (column not grantable to clients) |
| Invalid role enum (`admin`) in RPC | `22P02` rejected |
| SQLi in share email (`' OR 1=1 --`) | parameterized; "No user found" |
| Garbage / tampered JWT | `PGRST301` cryptographic failure |
| `alg:none` forged JWT | rejected |
| `x-supabase-role: service_role` header | ignored (no escalation) |
| Public key used as bearer on protected table | `42501` |
| Stored `<img onerror>` in content | stored as inert text; app renders from JSON via React, never raw HTML |
| Password `abc` (3 chars) | `422 weak_password` (6-char minimum) |

## Accepted / disclosed

- **Email-registration disclosure:** `share_document` returns "No user found with that email" for unregistered addresses, so an authenticated user can test whether an email has an account. Inherent to share-by-email; acceptable for an internal tool. Documented in `architecture.md` §10.
- **Cosmetic:** the "no user found" case returns HTTP 500 (the function raises an exception). The client maps it to a friendly message. Optional future cleanup: return a normal response instead of raising.

## Defenses verified in place

- RLS enabled on every table; `anon` has zero table privileges.
- Client write grants limited to `title`/`content` columns, so `owner_id`, `id`, timestamps are server-controlled.
- Shares are created/modified only through the owner-checked `SECURITY DEFINER` RPC.
- `SECURITY DEFINER` functions pin `search_path=''` and are not exposed via PostgREST.
- No raw-HTML rendering anywhere in the client.
- Build-time guard prevents secrets from being bundled under a `VITE_` prefix.
