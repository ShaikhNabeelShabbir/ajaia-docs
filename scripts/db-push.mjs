#!/usr/bin/env node
/**
 * Applies supabase/migrations to the database in DATABASE_URL (read from .env.local).
 *
 *   npm run db:push                # apply pending migrations
 *   npm run db:push -- --dry-run   # show what would be applied
 *
 * DATABASE_URL is a full-privilege credential (it bypasses RLS). It is only ever read here,
 * on your machine: never prefix it with VITE_, never add it to Vercel, and delete it from
 * .env.local once the schema is applied. This script never prints it.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const ENV_FILE = '.env.local'

function readEnvVar(file, name) {
  if (!existsSync(file)) return undefined
  const line = readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith(`${name}=`))
  return line?.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')
}

/**
 * - URL-encodes the password (special characters otherwise break the URL)
 * - switches Supabase's transaction pooler (6543) to session mode (5432): migrations need session mode
 */
export function normalizeDatabaseUrl(raw) {
  const match = raw.match(/^(postgres(?:ql)?:\/\/)(.*)$/)
  if (!match) throw new Error('DATABASE_URL must start with postgresql:// or postgres://')
  const [, scheme, rest] = match
  const at = rest.lastIndexOf('@')
  if (at === -1) throw new Error('DATABASE_URL must include user:password@host')

  const credentials = rest.slice(0, at)
  const host = rest.slice(at + 1).replace(/(pooler\.supabase\.com):6543\b/, '$1:5432')
  const colon = credentials.indexOf(':')
  if (colon === -1) return `${scheme}${credentials}@${host}`

  const user = credentials.slice(0, colon)
  let password = credentials.slice(colon + 1)
  if (/YOUR-PASSWORD/i.test(password)) {
    throw new Error('DATABASE_URL still contains the [YOUR-PASSWORD] placeholder')
  }
  try {
    password = decodeURIComponent(password) // tolerate an already-encoded password
  } catch {
    // not encoded; use as-is
  }
  return `${scheme}${user}:${encodeURIComponent(password)}@${host}`
}

function main() {
  const raw = process.env.DATABASE_URL ?? readEnvVar(ENV_FILE, 'DATABASE_URL')
  if (!raw) {
    console.error(
      `DATABASE_URL is not set. Add it to ${ENV_FILE} (Supabase → Connect → Session pooler), run this again,\n` +
        'then remove it. See README → "Database setup".',
    )
    process.exit(1)
  }

  let url
  try {
    url = normalizeDatabaseUrl(raw)
  } catch (err) {
    console.error(`Invalid DATABASE_URL: ${err.message}`)
    process.exit(1)
  }

  const passthrough = process.argv.slice(2)
  console.log(`Pushing supabase/migrations to ${url.replace(/^.*@/, '')}${passthrough.length ? ` (${passthrough.join(' ')})` : ''}`)

  const result = spawnSync('supabase', ['db', 'push', '--db-url', url, ...passthrough], { stdio: 'inherit' })
  if (result.error?.code === 'ENOENT') {
    console.error('Supabase CLI not found. Install it: https://supabase.com/docs/guides/cli')
    process.exit(1)
  }
  if (result.status === 0) {
    console.log(`\nDone. You can now remove DATABASE_URL from ${ENV_FILE}; the app never needs it.`)
  }
  process.exit(result.status ?? 1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
