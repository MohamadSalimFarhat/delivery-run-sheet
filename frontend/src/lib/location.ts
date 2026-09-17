export type Coordinates = { latitude: number; longitude: number }

/**
 * Patterns that carry a pair of coordinates, tried in order.
 *
 * A location shared from WhatsApp arrives as a Google Maps link, and Google
 * has several shapes of those depending on the device that produced it.
 */
const PATTERNS: RegExp[] = [
  // ...!3d33.8938!4d35.5018 - the authoritative pair in a place URL
  /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
  // ?q=33.8938,35.5018 and ?query= and ?destination= and ?ll=
  /[?&](?:q|query|destination|ll|center)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  // q=loc:33.8938,35.5018
  /loc:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  // geo:33.8938,35.5018 - Android's share format
  /geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  // /@33.8938,35.5018,17z - the map's own viewport
  /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  // Just the two numbers, pasted on their own
  /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/,
]

function valid(latitude: number, longitude: number): Coordinates | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (latitude < -90 || latitude > 90) return null
  if (longitude < -180 || longitude > 180) return null
  // 0,0 is in the Atlantic. It is always a parsing accident, never a delivery.
  if (latitude === 0 && longitude === 0) return null
  return { latitude, longitude }
}

/**
 * Pulls coordinates out of whatever was pasted: a Google Maps link shared
 * from WhatsApp, an Android geo: link, or the two numbers on their own.
 *
 * Returns null for a shortened link like maps.app.goo.gl/xxxx, which carries
 * no coordinates at all and has to be followed first.
 */
export function parseLocation(input: string): Coordinates | null {
  const text = input.trim()
  if (text === '') return null

  for (const pattern of PATTERNS) {
    const match = pattern.exec(text)
    if (match) {
      const found = valid(Number(match[1]), Number(match[2]))
      if (found) return found
    }
  }

  return null
}

/** Whether this looks like a link we would have to follow to read. */
export function isShortenedLink(input: string): boolean {
  return /^https?:\/\/\S+/i.test(input.trim()) && parseLocation(input) === null
}
