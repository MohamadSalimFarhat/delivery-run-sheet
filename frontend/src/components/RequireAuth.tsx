import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

/**
 * Wraps every page that needs a signed-in user.
 *
 * This is a convenience, not the security boundary. Hiding a page in the
 * browser stops nobody; what actually protects the data is the RLS policies
 * in Postgres, which apply to every request no matter where it comes from.
 */
export default function RequireAuth() {
  const { session, profile, loading, signOut } = useAuth()

  if (loading) {
    return (
      <p className="p-8 text-center text-sm text-slate-500">Loading…</p>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Signed in with a real password, but no row in profiles. The account exists
  // in Supabase Auth and was never given a role, so there is nothing it can do.
  if (!profile) {
    return (
      <div className="mx-auto mt-16 max-w-sm rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-sm text-amber-900">
          This account has no profile set up, so it has no role and cannot see
          any deliveries.
        </p>
        <button
          type="button"
          onClick={signOut}
          className="mt-4 text-sm font-medium text-amber-900 underline"
        >
          Sign out
        </button>
      </div>
    )
  }

  return <Outlet />
}
