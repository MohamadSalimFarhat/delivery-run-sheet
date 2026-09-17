import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * GET /api/address-suggest?q=<what the dispatcher has typed so far>
 *
 * Returns up to five real places, each with the exact point Geoapify holds
 * for it. The dispatcher picks one, and that pin is what gets saved.
 *
 * This is the difference between knowing the street and knowing the door.
 * Geocoding a typed address afterwards guesses; picking a suggestion does
 * not, because the coordinates come back with the choice.
 *
 * Dispatchers only, and it is called on every few keystrokes, so it is the
 * one endpoint where the Geoapify quota is worth thinking about.
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
  const query = url.searchParams.get('q')?.trim() ?? ''

  // Too short to be worth a lookup, and too short to be useful.
  if (query.length < 3) {
    return sendJson(res, 200, { suggestions: [] })
  }

  const headers = {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: authorization,
  }

  const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers })
  if (!userResponse.ok) {
    return sendJson(res, 401, { error: 'Sign in first.' })
  }

  const user = (await userResponse.json()) as { id?: string }
  if (!user.id) {
    return sendJson(res, 401, { error: 'Sign in first.' })
  }

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

  const suggest = await fetch(
    `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}` +
      `&limit=5&format=json&apiKey=${GEOAPIFY_API_KEY}`,
  )

  if (!suggest.ok) {
    return sendJson(res, 502, { error: 'The map service did not respond.' })
  }

  const body = (await suggest.json()) as {
    results?: { formatted?: string; lat?: number; lon?: number }[]
  }

  const suggestions = (body.results ?? [])
    .filter(
      (result) =>
        typeof result.formatted === 'string' &&
        typeof result.lat === 'number' &&
        typeof result.lon === 'number',
    )
    .map((result) => ({
      label: result.formatted as string,
      latitude: result.lat as number,
      longitude: result.lon as number,
    }))

  return sendJson(res, 200, { suggestions })
}
