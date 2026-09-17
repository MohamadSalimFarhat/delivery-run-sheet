import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'
import { AuthContext } from './authContext'

/** What we last fetched, and who it was for. */
type LoadedProfile = { userId: string; profile: Profile | null }

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loaded, setLoaded] = useState<LoadedProfile | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [profileVersion, setProfileVersion] = useState(0)

  // Find out whether a session already exists (Supabase keeps it in browser
  // storage, so a refresh stays signed in), then keep listening for changes.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoadingSession(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id ?? null

  // Load the profile row whenever the signed-in user changes.
  //
  // This is deliberately a separate effect rather than part of the callback
  // above: calling supabase from inside onAuthStateChange can deadlock, so the
  // callback only ever sets state and this effect reacts to it.
  useEffect(() => {
    if (!userId) return

    let cancelled = false

    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setLoaded({ userId, profile: data as Profile | null })
        }
      })

    return () => {
      cancelled = true
    }
  }, [userId, profileVersion])

  // Both derived during render, rather than cleared in an effect. That way
  // signing out drops the profile immediately, and a profile belonging to the
  // previous user can never be shown to the next one.
  const isCurrent = userId !== null && loaded?.userId === userId
  const profile = isCurrent ? loaded.profile : null
  const loadingProfile = userId !== null && !isCurrent

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? error.message : null
  }, [])

  const refreshProfile = useCallback(
    () => setProfileVersion((version) => version + 1),
    [],
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = useMemo(
    () => ({
      session,
      profile,
      loading: loadingSession || loadingProfile,
      signIn,
      signOut,
      refreshProfile,
    }),
    [
      session,
      profile,
      loadingSession,
      loadingProfile,
      signIn,
      signOut,
      refreshProfile,
    ],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
