/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// Anything prefixed VITE_ is bundled into the browser. Refuse to build if a secret ends up there,
// e.g. VITE_DATABASE_URL or a secret/service_role key pasted into the wrong variable.
function assertNoSecretsInClientEnv(mode: string) {
  const clientEnv = loadEnv(mode, process.cwd(), 'VITE_')
  const looksSecret = (value: string) =>
    /^postgres(ql)?:\/\//i.test(value) ||
    value.startsWith('sb_secret_') ||
    jwtRole(value) === 'service_role'

  const leaked = Object.entries(clientEnv).filter(([, value]) => looksSecret(value)).map(([name]) => name)
  if (leaked.length) {
    throw new Error(
      `Refusing to build: ${leaked.join(', ')} would expose a secret to the browser. ` +
        'Only the Supabase URL and publishable key may use the VITE_ prefix.',
    )
  }
}

function jwtRole(value: string): string | undefined {
  const payload = value.split('.')[1]
  if (!value.startsWith('eyJ') || !payload) return undefined
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString()).role
  } catch {
    return undefined
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  assertNoSecretsInClientEnv(mode)

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    test: {
      // Only the variables tests need; DATABASE_URL is deliberately never loaded here.
      env: loadEnv(mode, process.cwd(), ['VITE_SUPABASE_', 'SUPABASE_SECRET_KEY']),
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'jsdom',
            include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
          },
        },
        {
          extends: true,
          test: {
            name: 'integration',
            environment: 'node',
            include: ['tests/integration/**/*.test.ts'],
            testTimeout: 30_000,
            hookTimeout: 60_000,
          },
        },
      ],
    },
  }
})
