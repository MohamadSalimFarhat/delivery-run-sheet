import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * GET /api/map?id=<delivery id>
 *
 * Returns a PNG map of that delivery's address.
 *
 * This is the only server-side code in the project, and it exists for one
 * reason: the Geoapify key must not reach the browser. Anything in the
 * JavaScript bundle is readable by anyone, so the key stays here, in an
 * environment variable deliberately NOT named VITE_*.
 *
 * It takes a delivery id rather than an address, so the caller cannot use it
 * to geocode anything they like. The address is fetched from Supabase using
 * the caller's own token, which means:
 *
 *   - an invalid or missing token is rejected by Supabase, not by us
 *   - RLS applies, so a driver cannot get a map for someone else's delivery
 *
 * One request to Supabase therefore does the authentication, the permission
 * check and the address lookup all at once.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY

function sendError(res: ServerResponse, status: number, message: string) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ error: message }))
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  if (req.method !== 'GET') {
    return sendError(res, 405, 'Method not allowed.')
  }

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !GEOAPIFY_API_KEY) {
    return sendError(res, 500, 'The map service is not configured.')
  }

  const authorization = req.headers.authorization
  if (!authorization?.startsWith('Bearer ')) {
    return sendError(res, 401, 'Sign in to see the map.')
  }

  const url = new URL(req.url ?? '', `http://${req.headers.host ?? 'localhost'}`)
  const id = url.searchParams.get('id')
  if (!id) {
    return sendError(res, 400, 'Missing delivery id.')
  }

  // 1. Who is asking, and are they allowed to see this delivery?
  const lookup = await fetch(
    `${SUPABASE_URL}/rest/v1/deliveries?id=eq.${encodeURIComponent(id)}` +
      `&select=address,latitude,longitude`,
    {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: authorization,
      },
    },
  )

  if (!lookup.ok) {
    return sendError(res, 401, 'Sign in to see the map.')
  }

  const rows = (await lookup.json()) as {
    address: string
    latitude: number | null
    longitude: number | null
  }[]
  if (rows.length === 0) {
    // Either no such delivery, or not one this user may see. Same answer.
    return sendError(res, 404, 'Delivery not found.')
  }

  const { address, latitude, longitude } = rows[0]

  // 2. Where is it?
  //
  // Normally the pin was captured when the dispatcher picked the address from
  // the suggestions, so there is nothing to work out. Older deliveries, saved
  // before pins existed, still have to be located from their text.
  let place: { lat: number; lon: number }

  if (latitude !== null && longitude !== null) {
    place = { lat: latitude, lon: longitude }
  } else {
    const geocode = await fetch(
      `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(address)}` +
        `&limit=1&format=json&apiKey=${GEOAPIFY_API_KEY}`,
    )

    if (!geocode.ok) {
      return sendError(res, 502, 'The map service did not respond.')
    }

    const geocoded = (await geocode.json()) as {
      results?: { lat: number; lon: number }[]
    }
    const found = geocoded.results?.[0]

    if (!found) {
      return sendError(res, 404, 'This address could not be found on the map.')
    }

    place = found
  }

  // 3. Fetch the picture.
  const staticMap = await fetch(
    'https://maps.geoapify.com/v1/staticmap' +
      '?style=osm-bright&width=640&height=360&zoom=17' +
      `&center=lonlat:${place.lon},${place.lat}` +
      `&marker=lonlat:${place.lon},${place.lat};color:%23dc2626;size:medium` +
      `&apiKey=${GEOAPIFY_API_KEY}`,
  )

  if (!staticMap.ok) {
    return sendError(res, 502, 'The map image could not be loaded.')
  }

  const image = Buffer.from(await staticMap.arrayBuffer())

  res.statusCode = 200
  res.setHeader('Content-Type', 'image/png')
  // Private: this response was authorised for one user, so it must not be
  // held in any shared cache. An address does not move, so an hour is safe.
  res.setHeader('Cache-Control', 'private, max-age=3600')
  res.end(image)
}
