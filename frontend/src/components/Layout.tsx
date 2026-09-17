import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? 'rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white'
    : 'rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100'

export default function Layout() {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold">Delivery Run Sheet</span>
            {profile && (
              <span className="text-xs text-slate-500">
                {profile.display_name} · {profile.role}
              </span>
            )}
          </div>

          <nav className="flex items-center gap-1">
            <NavLink to="/deliveries" className={linkClass}>
              Deliveries
            </NavLink>
            <NavLink to="/settings" className={linkClass}>
              Settings
            </NavLink>
            <button
              type="button"
              onClick={signOut}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
