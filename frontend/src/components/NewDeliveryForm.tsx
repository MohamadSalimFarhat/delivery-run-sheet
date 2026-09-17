import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../auth/useAuth'
import { normalizePhone } from '../lib/phone'
import { supabase } from '../lib/supabase'
import type { PersonSummary } from '../lib/types'

type Props = {
  drivers: PersonSummary[]
  onCreated: () => void
}

export default function NewDeliveryForm({ drivers, onCreated }: Props) {
  const { profile } = useAuth()
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [driverId, setDriverId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!profile) return

    // Normalise before anything else, so the database only ever sees digits.
    const { digits, error: phoneError } = normalizePhone(phone)
    if (phoneError) {
      setError(phoneError)
      return
    }

    setSubmitting(true)
    setError(null)

    const { error: insertError } = await supabase.from('deliveries').insert({
      customer_name: customerName.trim(),
      customer_phone: digits,
      address: address.trim(),
      driver_id: driverId === '' ? null : driverId,
      created_by: profile.id,
      status: 'pending',
    })

    setSubmitting(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setCustomerName('')
    setPhone('')
    setAddress('')
    setDriverId('')
    onCreated()
  }

  const inputClass =
    'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900'

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <h2 className="text-sm font-semibold">New delivery</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Customer name
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
            className={inputClass}
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          WhatsApp number
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="961 70 123 456"
            className={inputClass}
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Country code required.
          </span>
        </label>

        <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
          Address
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            placeholder="Rue Gouraud, Gemmayzeh, Beirut"
            className={inputClass}
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Driver
          <select
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            className={inputClass}
          >
            <option value="">Unassigned</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.display_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-4 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {submitting ? 'Creating…' : 'Create delivery'}
      </button>
    </form>
  )
}
