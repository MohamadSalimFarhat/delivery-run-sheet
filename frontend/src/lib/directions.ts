/**
 * A link that starts turn-by-turn navigation. On a phone this opens the Google
 * Maps app; on a desktop it opens the website.
 *
 * Coordinates are used when the delivery has a pin, which is what makes the
 * driver arrive at the right door. Older deliveries without one fall back to
 * the address text, and land the driver on the street.
 */
export function directionsLink(
  latitude: number | null,
  longitude: number | null,
  address: string,
): string {
  const destination =
    latitude !== null && longitude !== null
      ? `${latitude},${longitude}`
      : address

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}
