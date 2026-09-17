import { useState } from 'react'
import type { FormEvent } from 'react'
import { checkAddress } from '../lib/geocode'
import type { Place } from '../lib/geocode'
import AddressField from './AddressField'
import { formatPhone, normalizePhone } from '../lib/phone'
import type { Delivery } from '../lib/types'

type Draft = {
  customer_name: string
  customer_phone: string
  address: string
}

type Props = {
  delivery: Delivery
  busy: boolean
  onSave: (changes: Partial<Delivery>) => Promise<boolean>
}

/**
 * Lets a dispatcher correct what they typed - a misspelled street, a wrong
 * digit in the number - while the delivery is still pending. Once it is
 * delivered the record is frozen, which is enforced by the policy, not here.
 */
export default function EditDeliveryForm({ delivery, busy, onSave }: Props) {
  // null means untouched, so the fields read from the saved record. Same
  // approach as the driver dropdown: a save can never leave a stale draft on
  // screen.
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [checking, setChecking] = useState(false)
  // Set only by picking a suggestion, cleared by typing over it.
  const [pin, setPin] = useState<Place | null>(null)

  const current: Draft = draft ?? {
    customer_name: delivery.customer_name,
    customer_phone: formatPhone(delivery.customer_phone),
    address: delivery.address,
  }

  const { digits, error: phoneError } = normalizePhone(current.customer_phone)

  const hasChanges =
    current.customer_name.trim() !== delivery.customer_name ||
    current.address.trim() !== delivery.address ||
    digits !== delivery.customer_phone ||
    // Re-picking the same address still moves the pin, so that counts.
    pin !== null

  function update(field: keyof Draft, value: string) {
    setDraft({ ...current, [field]: value })
    setSaved(false)
    setError(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (phoneError) {
      setError(phoneError)
      return
    }

    // Work out where this delivery should be pinned.
    //
    // A picked suggestion already knows. An unchanged address keeps the pin it
    // has. Only text edited by hand needs looking up, so correcting a
    // customer's name spends no Geoapify credit.
    let place: Place

    if (pin) {
      place = pin
    } else if (current.address.trim() === delivery.address) {
      place = {
        address: delivery.address,
        latitude: delivery.latitude,
        longitude: delivery.longitude,
      }
    } else {
      setChecking(true)
      const checked = await checkAddress(current.address.trim())
      setChecking(false)

      if (!checked.ok) {
        setError(checked.message)
        return
      }

      place = {
        address: checked.address,
        latitude: checked.latitude,
        longitude: checked.longitude,
      }
    }

    const ok = await onSave({
      customer_name: current.customer_name.trim(),
      customer_phone: digits,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
    })

    if (ok) {
      setDraft(null)
      setPin(null)
      setSaved(true)
    }
  }

  const inputClass =
    'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 disabled:opacity-50'

  return (
    <form
      id="edit"
      onSubmit={handleSubmit}
      className="scroll-mt-4 rounded-lg border border-slate-200 bg-white p-4"
    >
      <h2 className="text-sm font-semibold">Correct the details</h2>
      <p className="mt-1 text-xs text-slate-500">
        Pick the address from the suggestions to move the pin the driver is
        navigated to.
      </p>

      <div className="mt-4 space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Customer name
          <input
            value={current.customer_name}
            onChange={(e) => update('customer_name', e.target.value)}
            disabled={busy}
            required
            className={inputClass}
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          WhatsApp number
          <input
            value={current.customer_phone}
            onChange={(e) => update('customer_phone', e.target.value)}
            disabled={busy}
            required
            placeholder="961 70 123 456"
            className={inputClass}
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Country code required.
          </span>
        </label>

        <div className="block text-sm font-medium text-slate-700">
          Address
          <AddressField
            value={current.address}
            disabled={busy}
            pinned={pin !== null}
            onType={(text) => {
              update('address', text)
              setPin(null)
            }}
            onPick={(place) => {
              update('address', place.address)
              setPin(place)
            }}
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={busy || checking || !hasChanges}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {checking ? 'Checking address…' : busy ? 'Saving…' : 'Save details'}
        </button>

        {hasChanges && <span className="text-sm text-slate-500">Not saved yet.</span>}
        {saved && !hasChanges && (
          <span className="text-sm text-green-700">Details updated.</span>
        )}
      </div>
    </form>
  )
}
