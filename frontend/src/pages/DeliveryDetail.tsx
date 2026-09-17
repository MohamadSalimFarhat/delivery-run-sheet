import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import DeliveryMap from '../components/DeliveryMap'
import StatusBadge from '../components/StatusBadge'
import { formatPhone } from '../lib/phone'
import { supabase } from '../lib/supabase'
import type { Delivery, PersonSummary } from '../lib/types'

function formatMoment(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

export default function DeliveryDetail() {
  const { id } = useParams()
  const { profile } = useAuth()
  const isDispatcher = profile?.role === 'dispatcher'

  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [people, setPeople] = useState<PersonSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // What the dispatcher has picked but not yet saved. null means "untouched",
  // so the dropdown falls back to whatever the delivery actually says. Derived
  // this way rather than synced in an effect, so a save can never leave the
  // dropdown showing a stale choice.
  const [pickedDriver, setPickedDriver] = useState<string | null>(null)
  const [savedNote, setSavedNote] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function run() {
      const [deliveryResult, peopleResult] = await Promise.all([
        // maybeSingle, not single: "no such row" is an ordinary outcome here,
        // not an error. For a driver looking at someone else's delivery, the
        // policy means the row genuinely does not exist.
        supabase.from('deliveries').select('*').eq('id', id ?? '').maybeSingle(),
        supabase.from('profiles').select('id, display_name, role'),
      ])

      if (cancelled) return

      if (deliveryResult.error) {
        setLoadError(deliveryResult.error.message)
      } else {
        setLoadError(null)
        setDelivery(deliveryResult.data as Delivery | null)
      }

      setPeople((peopleResult.data as PersonSummary[] | null) ?? [])
      setLoading(false)
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [id])

  async function applyChange(changes: Partial<Delivery>) {
    setBusy(true)
    setActionError(null)

    // .select() matters: without it a refused update returns no error and no
    // rows, and would look like success. With it, data comes back null and we
    // can say so honestly.
    const { data, error } = await supabase
      .from('deliveries')
      .update(changes)
      .eq('id', id ?? '')
      .select()
      .maybeSingle()

    setBusy(false)

    if (error) {
      setActionError(error.message)
      return false
    }

    if (!data) {
      setActionError('That change was refused. Reload the page and try again.')
      return false
    }

    setDelivery(data as Delivery)
    return true
  }

  async function saveDriver(value: string) {
    const ok = await applyChange({ driver_id: value === '' ? null : value })
    if (ok) {
      // Drop back to reading from the saved record.
      setPickedDriver(null)
      setSavedNote(true)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading…</p>
  }

  if (loadError) {
    return (
      <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
        {loadError}
      </p>
    )
  }

  if (!delivery) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Delivery not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          This delivery does not exist, or it is not one of yours.
        </p>
        <Link
          to="/deliveries"
          className="mt-6 inline-block text-sm font-medium text-blue-600 underline"
        >
          Back to deliveries
        </Link>
      </div>
    )
  }

  const drivers = people.filter((person) => person.role === 'driver')
  const driverName = delivery.driver_id
    ? (people.find((p) => p.id === delivery.driver_id)?.display_name ?? 'Unknown')
    : 'Unassigned'

  const isPending = delivery.status === 'pending'
  const isMine = delivery.driver_id === profile?.id

  const savedDriver = delivery.driver_id ?? ''
  const selectedDriver = pickedDriver ?? savedDriver
  const hasUnsavedChange = selectedDriver !== savedDriver

  return (
    <div className="space-y-6">
      <Link
        to="/deliveries"
        className="text-sm font-medium text-blue-600 underline"
      >
        Back to deliveries
      </Link>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-semibold">{delivery.customer_name}</h1>
          <StatusBadge status={delivery.status} />
        </div>

        <dl className="mt-6 space-y-3 text-sm">
          <div>
            <dt className="text-slate-500">Address</dt>
            <dd className="mt-0.5">{delivery.address}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Phone</dt>
            <dd className="mt-0.5">{formatPhone(delivery.customer_phone)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Driver</dt>
            <dd className="mt-0.5">{driverName}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Created</dt>
            <dd className="mt-0.5">{formatMoment(delivery.created_at)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Delivered</dt>
            <dd className="mt-0.5">{formatMoment(delivery.delivered_at)}</dd>
          </div>
        </dl>

        <div className="mt-6">
          <DeliveryMap deliveryId={delivery.id} />
        </div>
      </div>

      {actionError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      {/* Dispatcher: assign or reassign, but only while still pending. */}
      {isDispatcher && isPending && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <label className="block text-sm font-medium text-slate-700">
            Assign driver
            <select
              value={selectedDriver}
              disabled={busy}
              onChange={(e) => {
                setPickedDriver(e.target.value)
                setSavedNote(false)
              }}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 disabled:opacity-50"
            >
              <option value="">Unassigned</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.display_name}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              disabled={busy || !hasUnsavedChange}
              onClick={() => void saveDriver(selectedDriver)}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save driver'}
            </button>

            {hasUnsavedChange && (
              <span className="text-sm text-slate-500">Not saved yet.</span>
            )}
            {savedNote && !hasUnsavedChange && (
              <span className="text-sm text-green-700">Driver updated.</span>
            )}
          </div>
        </div>
      )}

      {/* Driver: mark their own pending delivery as delivered. */}
      {!isDispatcher && isMine && isPending && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void applyChange({ status: 'delivered' })}
          className="w-full rounded-md bg-slate-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Mark delivered'}
        </button>
      )}

      {delivery.status === 'delivered' && (
        <p className="text-sm text-slate-500">
          Delivered on {formatMoment(delivery.delivered_at)}. This cannot be
          undone.
        </p>
      )}
    </div>
  )
}
