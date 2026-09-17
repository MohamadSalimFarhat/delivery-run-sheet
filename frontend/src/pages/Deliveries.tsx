import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import NewDeliveryForm from '../components/NewDeliveryForm'
import StatusBadge from '../components/StatusBadge'
import { supabase } from '../lib/supabase'
import type { Delivery, PersonSummary } from '../lib/types'

export default function Deliveries() {
  const { profile } = useAuth()
  const isDispatcher = profile?.role === 'dispatcher'

  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [people, setPeople] = useState<PersonSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        supabase.from('profiles').select('id, display_name, role, message_template'),
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

  const nameFor = (id: string | null) =>
    id === null ? null : (people.find((p) => p.id === id)?.display_name ?? 'Unknown')

  const drivers = people.filter((p) => p.role === 'driver')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Deliveries</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isDispatcher
            ? 'Every delivery in the shop.'
            : 'The deliveries assigned to you.'}
        </p>
      </div>

      {isDispatcher && <NewDeliveryForm drivers={drivers} onCreated={reload} />}

      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && deliveries.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          {isDispatcher
            ? 'No deliveries yet. Create the first one above.'
            : 'Nothing assigned to you right now.'}
        </p>
      )}

      <ul className="space-y-2">
        {deliveries.map((delivery) => (
          <li key={delivery.id}>
            <Link
              to={`/deliveries/${delivery.id}`}
              className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {delivery.customer_name}
                </p>
                <p className="truncate text-sm text-slate-500">
                  {delivery.address}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {nameFor(delivery.driver_id) ?? 'Unassigned'}
                </p>
              </div>
              <StatusBadge status={delivery.status} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
