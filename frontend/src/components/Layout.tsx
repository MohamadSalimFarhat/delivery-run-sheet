import { NavLink, Outlet } from 'react-router-dom'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? 'rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white'
    : 'rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100'

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <span className="text-sm font-semibold">Delivery Run Sheet</span>
          <nav className="flex items-center gap-1">
            <NavLink to="/deliveries" className={linkClass}>
              Deliveries
            </NavLink>
            <NavLink to="/settings" className={linkClass}>
              Settings
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
