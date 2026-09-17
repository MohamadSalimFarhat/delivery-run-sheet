import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * GET /api/resolve-location?url=<a shortened maps link>
 *
 * A location shared from WhatsApp often arrives as maps.app.goo.gl/xxxx,
 * which contains no coordinates at all. Following it does, but a browser
 * cannot: the destination does not allow cross-origin reads. So the server
 * follows it and reports back what it found.
 *
 * Only a short list of hosts may be fetched. Without that, this endpoint
 * would happily fetch anything on request, including addresses inside
 * Vercel's own network.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

const ALLOWED_HOSTS = new Set([
  'maps.app.goo.gl',
  'goo.gl',
  'g.co',
  'maps.google.com',
  'www.google.com',
  'google.com',
  'maps.apple.com',
])

// Kept in step with src/lib/location.ts. Deliberately duplicated rather than
// imported: this file is bundled separately from the browser code.
const PATTERNS: RegExp[] = [
  /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
  /[?&](?:q|query|destination|ll|center|sll)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  /loc:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
]

function findCoordinates(text: string) {
  for (const pattern of PATTERNS) {
    const match = pattern.exec(text)
    if (!match) continue

    const latitude = Number(match[1])
    const longitude = Number(match[2])

    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180 &&
      !(latitude === 0 && longitude === 0)
    ) {
      return { latitude, longitude }
    }
  }

  return null
}

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

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return sendJson(res, 500, { error: 'Not configured.' })
  }

  const authorization = req.headers.authorization
  if (!authorization?.startsWith('Bearer ')) {
    return sendJson(res, 401, { error: 'Sign in first.' })
  }

  const requestUrl = new URL(
    req.url ?? '',
    `http://${req.headers.host ?? 'localhost'}`,
  )
  const target = requestUrl.searchParams.get('url')?.trim()
  if (!target) {
    return sendJson(res, 400, { error: 'Missing link.' })
  }

  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return sendJson(res, 400, { error: 'That is not a link.' })
  }

  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return sendJson(res, 400, {
      error: 'Only Google Maps and Apple Maps links can be opened.',
    })
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

  let followed: Response
  try {
    followed = await fetch(parsed.toString(), {
      redirect: 'follow',
      headers: {
        // Without a browser-like agent, Google serves a page with no
        // coordinates in it.
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      },
    })
  } catch {
    return sendJson(res, 502, { error: 'That link could not be opened.' })
  }

  // The redirect usually lands on a URL that carries the coordinates.
  const fromUrl = findCoordinates(followed.url)
  if (fromUrl) {
    return sendJson(res, 200, fromUrl)
  }

  // If not, they are somewhere in the page it served.
  const body = await followed.text().catch(() => '')
  const fromBody = findCoordinates(body)
  if (fromBody) {
    return sendJson(res, 200, fromBody)
  }

  return sendJson(res, 404, {
    error:
      'No location found in that link. Open it, then copy the coordinates instead.',
  })
}
