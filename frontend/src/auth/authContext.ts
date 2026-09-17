import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Profile } from '../lib/types'

export type AuthValue = {
  /** The Supabase session, or null when nobody is signed in. */
  session: Session | null
  /** Our own profiles row for that user: role, display name, template. */
  profile: Profile | null
  /** True while either the session or the profile is still being fetched. */
  loading: boolean
  /** Returns an error message to show, or null on success. */
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  /** Re-read the profile, after Settings has changed it. */
  refreshProfile: () => void
}

export const AuthContext = createContext<AuthValue | null>(null)
