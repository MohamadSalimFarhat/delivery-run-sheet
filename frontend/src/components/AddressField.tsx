import { useEffect, useState } from 'react'
import { suggestAddresses } from '../lib/geocode'
import type { Place } from '../lib/geocode'

type Props = {
  value: string
  disabled?: boolean
  /** Called on every keystroke. The pin is cleared until one is picked. */
  onType: (text: string) => void
  /** Called when a suggestion is chosen, carrying its exact coordinates. */
  onPick: (place: Place) => void
  /** Whether the current text came from a picked suggestion. */
  pinned: boolean
}

/**
 * An address box that suggests real places as you type.
 *
 * Picking one is the point: the coordinates arrive with the choice, so the
 * delivery is pinned to a door rather than to a street name that has to be
 * guessed at later.
 */
export default function AddressField({
  value,
  disabled,
  onType,
  onPick,
  pinned,
}: Props) {
  const [suggestions, setSuggestions] = useState<Place[]>([])
  const [open, setOpen] = useState(false)

  // Nothing to look up once a pin is set, or while the text is too short.
  const searching = !pinned && value.trim().length >= 3

  // Derived rather than cleared in the effect, so picking a suggestion hides
  // the list in the same render instead of one render later.
  const visible = searching ? suggestions : []

  useEffect(() => {
    if (!searching) return

    let cancelled = false

    // Wait for a pause in typing, so a five-word address is one lookup and
    // not forty.
    const timer = setTimeout(async () => {
      const found = await suggestAddresses(value.trim())
      if (!cancelled) {
        setSuggestions(found)
        setOpen(found.length > 0)
      }
    }, 350)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [value, searching])

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(event) => {
          onType(event.target.value)
          setOpen(true)
        }}
        disabled={disabled}
        required
        autoComplete="off"
        placeholder="Start typing, then pick the address"
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 disabled:opacity-50"
      />

      {open && visible.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-slate-300 bg-white shadow-lg">
          {visible.map((place) => (
            <li key={`${place.latitude},${place.longitude},${place.address}`}>
              <button
                type="button"
                onClick={() => {
                  onPick(place)
                  setOpen(false)
                  setSuggestions([])
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
              >
                {place.address}
              </button>
            </li>
          ))}
        </ul>
      )}

      {pinned ? (
        <span className="mt-1 block text-xs font-normal text-green-700">
          Pinned on the map. The driver gets directions to this exact point.
        </span>
      ) : (
        <span className="mt-1 block text-xs font-normal text-slate-500">
          Pick one of the suggestions to pin the exact spot. Typing it by hand
          still works, but only locates the street.
        </span>
      )}
    </div>
  )
}
