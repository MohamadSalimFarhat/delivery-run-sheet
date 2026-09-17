import { useState } from 'react'
import type { FormEvent } from 'react'
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

  const current: Draft = draft ?? {
    customer_name: delivery.customer_name,
    customer_phone: formatPhone(delivery.customer_phone),
    address: delivery.address,
  }

  const { digits, error: phoneError } = normalizePhone(current.customer_phone)

  const hasChanges =
    current.customer_name.trim() !== delivery.customer_name ||
    current.address.trim() !== delivery.address ||
    digits !== delivery.customer_phone

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

    const ok = await onSave({
      customer_name: current.customer_name.trim(),
      customer_phone: digits,
      address: current.address.trim(),
    })

    if (ok) {
      setDraft(null)
      setSaved(true)
    }
  }

  const inputClass =
    'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 disabled:opacity-50'

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <h2 className="text-sm font-semibold">Correct the details</h2>
      <p className="mt-1 text-xs text-slate-500">
        Fixing the address here also moves the map.
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

        <label className="block text-sm font-medium text-slate-700">
          Address
          <input
            value={current.address}
            onChange={(e) => update('address', e.target.value)}
            disabled={busy}
            required
            className={inputClass}
          />
        </label>
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={busy || !hasChanges}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save details'}
        </button>

        {hasChanges && <span className="text-sm text-slate-500">Not saved yet.</span>}
        {saved && !hasChanges && (
          <span className="text-sm text-green-700">Details updated.</span>
        )}
      </div>
    </form>
  )
}
