import { supabase } from './supabase'

/** A place, with the exact point the driver will be navigated to. */
export type Place = {
  address: string
  latitude: number | null
  longitude: number | null
}

export type AddressCheck =
  | ({ ok: true } & Place)
  | { ok: false; message: string }

async function authorisedFetch(path: string) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return null

  try {
    const response = await fetch(path, {
      headers: { Authorization: `Bearer ${token}` },
    })

    // Under `npm run dev` there are no serverless functions, and Vite answers
    // unknown paths with index.html. A non-JSON reply means "not available
    // here", which callers treat as "carry on without it".
    if (!response.headers.get('content-type')?.includes('application/json')) {
      return null
    }

    return response
  } catch {
    return null
  }
}

/**
 * Places matching what has been typed so far, each carrying its own exact
 * coordinates. Picking one is what pins the delivery; nothing is guessed
 * afterwards.
 */
export async function suggestAddresses(query: string): Promise<Place[]> {
  const response = await authorisedFetch(
    `/api/address-suggest?q=${encodeURIComponent(query)}`,
  )

  if (!response?.ok) return []

  const body = (await response.json().catch(() => null)) as {
    suggestions?: { label: string; latitude: number; longitude: number }[]
  } | null

  return (body?.suggestions ?? []).map((suggestion) => ({
    address: suggestion.label,
    latitude: suggestion.latitude,
    longitude: suggestion.longitude,
  }))
}

/**
 * The fallback for an address typed but never picked from the list. Confirms
 * it exists and returns it as the map spells it, with whatever pin the
 * geocoder settled on - less precise than a picked suggestion, but better
 * than saving somewhere nobody can find.
 */
export async function checkAddress(address: string): Promise<AddressCheck> {
  const { data } = await supabase.auth.getSession()
  if (!data.session) {
    return { ok: false, message: 'Sign in first.' }
  }

  const response = await authorisedFetch(
    `/api/geocode?address=${encodeURIComponent(address)}`,
  )

  // Not available here, so accept what was typed rather than block the save.
  if (!response) {
    return { ok: true, address, latitude: null, longitude: null }
  }

  const body = (await response.json().catch(() => null)) as {
    formatted?: string
    latitude?: number | null
    longitude?: number | null
    error?: string
  } | null

  if (!response.ok || !body?.formatted) {
    return {
      ok: false,
      message: body?.error ?? 'That address could not be checked.',
    }
  }

  return {
    ok: true,
    address: body.formatted,
    latitude: body.latitude ?? null,
    longitude: body.longitude ?? null,
  }
}

/**
 * Turns a pin into a place: the coordinates are kept exactly as given, and
 * the address becomes whatever the map calls that spot, so the delivery reads
 * as a street rather than two numbers.
 */
export async function locateByCoordinates(
  latitude: number,
  longitude: number,
): Promise<Place> {
  const response = await authorisedFetch(
    `/api/geocode?lat=${latitude}&lon=${longitude}`,
  )

  const body = response?.ok
    ? ((await response.json().catch(() => null)) as {
        formatted?: string
      } | null)
    : null

  return {
    address: body?.formatted ?? `Dropped pin at ${latitude}, ${longitude}`,
    latitude,
    longitude,
  }
}

/**
 * Follows a shortened maps link, which the browser cannot read itself, and
 * returns the coordinates hidden behind it.
 */
export async function resolveLocationLink(
  link: string,
): Promise<{ latitude: number; longitude: number } | { error: string }> {
  const response = await authorisedFetch(
    `/api/resolve-location?url=${encodeURIComponent(link)}`,
  )

  if (!response) {
    return { error: 'Links can only be opened on the deployed site.' }
  }

  const body = (await response.json().catch(() => null)) as {
    latitude?: number
    longitude?: number
    error?: string
  } | null

  if (!response.ok || typeof body?.latitude !== 'number') {
    return { error: body?.error ?? 'That link could not be read.' }
  }

  return { latitude: body.latitude, longitude: body.longitude as number }
}
