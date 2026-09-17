import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export default function Login() {
  const { session, loading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return <p className="p-8 text-center text-sm text-slate-500">Loading…</p>
  }

  // Already signed in: no reason to show the form again.
  if (session) {
    return <Navigate to="/deliveries" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    const message = await signIn(email.trim(), password)

    if (message) {
      // Supabase gives the same message for an unknown email and a wrong
      // password, which is what we want: it never reveals which accounts exist.
      setError(message)
      setSubmitting(false)
    }
    // On success the auth listener updates the session and the redirect above
    // takes over, so there is nothing to do here.
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6"
      >
        <h1 className="text-lg font-semibold text-slate-900">
          Delivery Run Sheet
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Sign in with the account you were given.
        </p>

        <label className="mt-6 block text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
        </label>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
