import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * GET /api/geocode?address=<what the dispatcher typed>
 * GET /api/geocode?lat=<n>&lon=<n>
 *
 * With an address, answers one question: can this be found on the map?
 * With coordinates, answers the reverse: what is the address at this pin?
 * The second is used after a customer's location pin has been pasted in, so
 * the delivery shows a street name a human can read rather than two numbers.
 *
 * Used before a delivery is saved, so an address nobody can locate is never
 * stored in the first place. On success it returns the address as Geoapify
 * spells it, and that is what gets saved - the same idea as normalising a
 * phone number, applied to addresses.
 *
 * Dispatchers only, since they are the only ones who create or edit
 * deliveries, and the Geoapify quota is worth protecting.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method not allowed.' })
  }

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !GEOAPIFY_API_KEY) {
    return sendJson(res, 500, { error: 'The map service is not configured.' })
  }

  const authorization = req.headers.authorization
  if (!authorization?.startsWith('Bearer ')) {
    return sendJson(res, 401, { error: 'Sign in first.' })
  }

  const url = new URL(req.url ?? '', `http://${req.headers.host ?? 'localhost'}`)
  const address = url.searchParams.get('address')?.trim()
  const lat = url.searchParams.get('lat')
  const lon = url.searchParams.get('lon')
  const reverse = lat !== null && lon !== null

  if (!address && !reverse) {
    return sendJson(res, 400, { error: 'Missing address.' })
  }

  const headers = {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: authorization,
  }

  // 1. Is this a real, signed-in user?
  const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers })
  if (!userResponse.ok) {
    return sendJson(res, 401, { error: 'Sign in first.' })
  }

  const user = (await userResponse.json()) as { id?: string }
  if (!user.id) {
    return sendJson(res, 401, { error: 'Sign in first.' })
  }

  // 2. Are they a dispatcher? RLS lets anyone read their own profile row.
  const profileResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role`,
    { headers },
  )

  const profiles = profileResponse.ok
    ? ((await profileResponse.json()) as { role?: string }[])
    : []

  if (profiles[0]?.role !== 'dispatcher') {
    return sendJson(res, 403, { error: 'Only a dispatcher can do that.' })
  }

  // 3. Ask Geoapify - forwards from an address, or backwards from a pin.
  const endpoint = reverse
    ? `https://api.geoapify.com/v1/geocode/reverse?lat=${encodeURIComponent(lat)}` +
      `&lon=${encodeURIComponent(lon)}&limit=1&format=json&apiKey=${GEOAPIFY_API_KEY}`
    : `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(address ?? '')}` +
      `&limit=1&format=json&apiKey=${GEOAPIFY_API_KEY}`

  const geocode = await fetch(endpoint)

  if (!geocode.ok) {
    return sendJson(res, 502, { error: 'The map service did not respond.' })
  }

  const geocoded = (await geocode.json()) as {
    results?: {
      formatted?: string
      lat?: number
      lon?: number
      rank?: { confidence?: number }
    }[]
  }
  const match = geocoded.results?.[0]

  // A pin is the truth here; the address is only a label for it. So if the
  // reverse lookup finds nothing readable, keep the pin and say so plainly
  // rather than refusing a location the customer actually sent.
  if (reverse) {
    return sendJson(res, 200, {
      formatted: match?.formatted ?? `Dropped pin at ${lat}, ${lon}`,
      latitude: Number(lat),
      longitude: Number(lon),
    })
  }

  if (!match?.formatted) {
    return sendJson(res, 404, {
      error:
        'That address could not be found on the map. Try adding the street, city and country.',
    })
  }

  // A very low confidence match usually means Geoapify fell back to the
  // country or the city, which would put the driver in the wrong place.
  const confidence = match.rank?.confidence ?? 0
  if (confidence < 0.2) {
    return sendJson(res, 404, {
      error:
        'That address is too vague to place on the map. Add the street, city and country.',
    })
  }

  return sendJson(res, 200, {
    formatted: match.formatted,
    latitude: match.lat ?? null,
    longitude: match.lon ?? null,
  })
}
