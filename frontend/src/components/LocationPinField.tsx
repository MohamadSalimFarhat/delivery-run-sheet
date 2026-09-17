import { useState } from 'react'
import { locateByCoordinates, resolveLocationLink } from '../lib/geocode'
import type { Place } from '../lib/geocode'
import { isShortenedLink, parseLocation } from '../lib/location'

type Props = {
  disabled?: boolean
  onPinned: (place: Place) => void
}

/**
 * Takes a location pin the customer sent over WhatsApp.
 *
 * This is the most accurate address a shop can get: the customer stood at
 * their own door and pressed share. Nothing has to be spelled, transcribed or
 * guessed at, which matters in a city where plenty of buildings have no
 * number.
 *
 * The pin is carried across by a person rather than read automatically -
 * receiving WhatsApp messages needs the WhatsApp Business API, which is a
 * verified business account and a webhook, well beyond this. The dispatcher
 * copies the pin and pastes it here.
 */
export default function LocationPinField({ disabled, onPinned }: Props) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [working, setWorking] = useState(false)

  async function applyPin() {
    const input = text.trim()
    if (input === '') return

    setError(null)

    // Most shared links carry the coordinates in plain sight.
    const direct = parseLocation(input)
    if (direct) {
      setWorking(true)
      const place = await locateByCoordinates(direct.latitude, direct.longitude)
      setWorking(false)
      setText('')
      onPinned(place)
      return
    }

    // A shortened link has to be followed to find out where it goes.
    if (isShortenedLink(input)) {
      setWorking(true)
      const resolved = await resolveLocationLink(input)

      if ('error' in resolved) {
        setWorking(false)
        setError(resolved.error)
        return
      }

      const place = await locateByCoordinates(
        resolved.latitude,
        resolved.longitude,
      )
      setWorking(false)
      setText('')
      onPinned(place)
      return
    }

    setError(
      'That is not a location. Paste the Google Maps link the customer sent, or two coordinates like 33.8938, 35.5018.',
    )
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setError(null)
          }}
          disabled={disabled || working}
          placeholder="Paste the pin the customer sent"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 disabled:opacity-50"
          // Not inside the surrounding form's submit flow: Enter here means
          // "use this pin", not "save the delivery".
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void applyPin()
            }
          }}
        />

        <button
          type="button"
          onClick={() => void applyPin()}
          disabled={disabled || working || text.trim() === ''}
          className="mt-1 shrink-0 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {working ? 'Reading…' : 'Use pin'}
        </button>
      </div>

      {error ? (
        <span className="mt-1 block text-xs font-normal text-red-700">
          {error}
        </span>
      ) : (
        <span className="mt-1 block text-xs font-normal text-slate-500">
          In WhatsApp, open the location the customer sent, share it as a link,
          and paste it here.
        </span>
      )}
    </div>
  )
}
