import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !publishableKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. ' +
      'Copy frontend/.env.example to frontend/.env.local and fill both in.',
  )
}

// This key is public and ends up in the JavaScript bundle. That is fine: the
// database has RLS enabled with no privileges granted to the anonymous role,
// so on its own this key can read nothing. Everything depends on being signed
// in as a real user.
export const supabase = createClient(url, publishableKey)
