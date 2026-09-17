import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../auth/useAuth'
import { checkAddress } from '../lib/geocode'
import type { Place } from '../lib/geocode'
import AddressField from './AddressField'
import LocationPinField from './LocationPinField'
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
  // Set only by picking a suggestion, cleared by typing over it.
  const [pin, setPin] = useState<Place | null>(null)
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

    // A picked suggestion already carries its exact point, so there is
    // nothing to look up. Text typed by hand still has to be confirmed, and
    // is refused if the map cannot place it.
    let place: Place

    if (pin) {
      place = pin
    } else {
      const checked = await checkAddress(address.trim())

      if (!checked.ok) {
        setError(checked.message)
        setSubmitting(false)
        return
      }

      place = {
        address: checked.address,
        latitude: checked.latitude,
        longitude: checked.longitude,
      }
    }

    const { error: insertError } = await supabase.from('deliveries').insert({
      customer_name: customerName.trim(),
      customer_phone: digits,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
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
    setPin(null)
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

        <div className="block text-sm font-medium text-slate-700 sm:col-span-2">
          Address
          <AddressField
            value={address}
            pinned={pin !== null}
            onType={(text) => {
              setAddress(text)
              setPin(null)
            }}
            onPick={(place) => {
              setAddress(place.address)
              setPin(place)
            }}
          />

          <div className="mt-3 border-t border-slate-100 pt-3">
            <span className="text-sm font-medium text-slate-700">
              Or use a location the customer sent
            </span>
            <LocationPinField
              onPinned={(place) => {
                setAddress(place.address)
                setPin(place)
              }}
            />
          </div>
        </div>

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
        {submitting ? 'Saving…' : 'Create delivery'}
      </button>
    </form>
  )
}
