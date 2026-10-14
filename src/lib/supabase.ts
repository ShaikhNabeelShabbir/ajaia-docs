import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** Non-null when the app was built without Supabase settings; the UI shows this instead of crashing. */
export const supabaseConfigError =
  !url || !publishableKey
    ? 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill them in.'
    : null

// Only the publishable key ever reaches the browser; all access control is enforced by RLS.
export const supabase = createClient<Database>(url ?? 'http://localhost', publishableKey ?? 'missing-key')
