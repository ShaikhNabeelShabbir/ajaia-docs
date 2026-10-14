import { describe, expect, it } from 'vitest'
// @ts-expect-error plain .mjs script without type declarations
import { normalizeDatabaseUrl } from './db-push.mjs'

describe('normalizeDatabaseUrl', () => {
  it('switches the Supabase transaction pooler to session mode for migrations', () => {
    expect(normalizeDatabaseUrl('postgresql://postgres.ref:pw@aws-0-x.pooler.supabase.com:6543/postgres')).toBe(
      'postgresql://postgres.ref:pw@aws-0-x.pooler.supabase.com:5432/postgres',
    )
  })

  it('URL-encodes special characters in the password, without double-encoding', () => {
    expect(normalizeDatabaseUrl('postgres://u:p@ss#w/rd@db.example.com:5432/postgres')).toBe(
      'postgres://u:p%40ss%23w%2Frd@db.example.com:5432/postgres',
    )
    expect(normalizeDatabaseUrl('postgres://u:p%40ss@db.example.com/postgres')).toBe('postgres://u:p%40ss@db.example.com/postgres')
  })

  it('leaves local and direct connection strings alone', () => {
    const local = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
    expect(normalizeDatabaseUrl(local)).toBe(local)
  })

  it.each([
    ['postgresql://postgres.ref:[YOUR-PASSWORD]@aws-0-x.pooler.supabase.com:6543/postgres', /placeholder/],
    ['mysql://u:p@h/db', /must start with/],
    ['postgresql://no-at-sign', /user:password@host/],
  ])('rejects %s', (url, message) => {
    expect(() => normalizeDatabaseUrl(url)).toThrow(message)
  })
})
