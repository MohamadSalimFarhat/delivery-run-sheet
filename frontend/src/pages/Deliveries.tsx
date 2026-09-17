import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import NewDeliveryForm from '../components/NewDeliveryForm'
import StatusBadge from '../components/StatusBadge'
import { supabase } from '../lib/supabase'
import type { Delivery, PersonSummary } from '../lib/types'

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-3.5 w-3.5"
    >
      <path d="M10 4c-4 0-7.2 3.2-8 5.6-.1.3-.1.5 0 .8C2.8 12.8 6 16 10 16s7.2-3.2 8-5.6c.1-.3.1-.5 0-.8C17.2 7.2 14 4 10 4Zm0 9a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-3.5 w-3.5"
    >
      <path d="M13.6 3.2a1.7 1.7 0 0 1 2.4 2.4l-.9.9-2.4-2.4.9-.9ZM11.6 5.2l2.4 2.4-6.5 6.5-3 .6.6-3 6.5-6.5Z" />
    </svg>
  )
}

export default function Deliveries() {
  const { profile } = useAuth()
  const isDispatcher = profile?.role === 'dispatcher'

  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [people, setPeople] = useState<PersonSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  // Bumped to ask for a fresh read, for example after creating a delivery.
  const [refreshKey, setRefreshKey] = useState(0)
  const reload = useCallback(() => setRefreshKey((key) => key + 1), [])

  useEffect(() => {
    let cancelled = false

    async function run() {
      // Note there is no "where driver_id = me" here, for either role. The
      // same query runs for everyone; the RLS policies decide which rows come
      // back. That is the whole difference between the two roles.
      const [deliveryResult, peopleResult] = await Promise.all([
        supabase
          .from('deliveries')
          .select('*')
          .order('status', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, display_name, role'),
      ])

      if (cancelled) return

      if (deliveryResult.error) {
        setError(deliveryResult.error.message)
        setDeliveries([])
      } else {
        setError(null)
        setDeliveries(deliveryResult.data as Delivery[])
      }

      // A driver only gets their own row back here, which is all they need.
      setPeople((peopleResult.data as PersonSummary[] | null) ?? [])
      setLoading(false)
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const nameFor = useCallback(
    (id: string | null) =>
      id === null
        ? 'Unassigned'
        : (people.find((person) => person.id === id)?.display_name ?? 'Unknown'),
    [people],
  )

  const drivers = people.filter((person) => person.role === 'driver')

  // Searching happens here rather than in the database. The list is one shop's
  // deliveries and is already loaded, so filtering in place is instant and
  // costs no extra request.
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (term === '') return deliveries

    return deliveries.filter((delivery) =>
      [
        delivery.customer_name,
        delivery.address,
        delivery.customer_phone,
        delivery.status,
        nameFor(delivery.driver_id),
      ]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [deliveries, search, nameFor])

  function handleCreated() {
    setShowForm(false)
    reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Deliveries</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isDispatcher
              ? 'Every delivery in the shop.'
              : 'The deliveries assigned to you.'}
          </p>
        </div>

        {isDispatcher && (
          <button
            type="button"
            onClick={() => setShowForm((open) => !open)}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            {showForm ? 'Cancel' : 'New delivery'}
          </button>
        )}
      </div>

      {isDispatcher && showForm && (
        <NewDeliveryForm drivers={drivers} onCreated={handleCreated} />
      )}

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search customer, address, driver or status"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
      />

      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && deliveries.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          {isDispatcher
            ? 'No deliveries yet. Press New delivery to add the first one.'
            : 'Nothing assigned to you right now.'}
        </p>
      )}

      {!loading && !error && deliveries.length > 0 && visible.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Nothing matches “{search.trim()}”.
        </p>
      )}

      {visible.length > 0 && (
        <div className="space-y-2">
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3.5 font-medium">Customer</th>
                  <th className="px-5 py-3.5 font-medium">Address</th>
                  <th className="px-5 py-3.5 font-medium">Driver</th>
                  <th className="px-5 py-3.5 font-medium">Status</th>
                  <th className="px-5 py-3.5 font-medium">Created</th>
                  <th className="px-5 py-3.5 text-right font-medium">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {visible.map((delivery) => (
                  <tr key={delivery.id} className="align-middle hover:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-4 font-medium">
                      {delivery.customer_name}
                    </td>
                    <td
                      className="max-w-sm truncate px-5 py-4 text-slate-600"
                      title={delivery.address}
                    >
                      {delivery.address}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {nameFor(delivery.driver_id)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={delivery.status} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                      {new Date(delivery.created_at).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/deliveries/${delivery.id}`}
                          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                        >
                          <EyeIcon />
                          View
                        </Link>

                        {/* Edit only where editing is actually possible: a
                            dispatcher, on a delivery still pending. */}
                        {isDispatcher && delivery.status === 'pending' && (
                          <Link
                            to={`/deliveries/${delivery.id}#edit`}
                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                          >
                            <PencilIcon />
                            Edit
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-400">
            {visible.length === deliveries.length
              ? `${deliveries.length} ${deliveries.length === 1 ? 'delivery' : 'deliveries'}`
              : `${visible.length} of ${deliveries.length} shown`}
          </p>
        </div>
      )}
    </div>
  )
}
