import { supabase } from './supabase'

export type AddressCheck =
  | { ok: true; address: string }
  | { ok: false; message: string }

/**
 * Checks an address with Geoapify before it is saved, and returns it spelled
 * the way the map spells it.
 *
 * If the check cannot run at all - there is no serverless function under
 * `npm run dev` - the address is accepted as typed rather than blocking work
 * on a machine where the check does not exist.
 */
export async function checkAddress(address: string): Promise<AddressCheck> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  if (!token) {
    return { ok: false, message: 'Sign in first.' }
  }

  let response: Response

  try {
    response = await fetch(
      `/api/geocode?address=${encodeURIComponent(address)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
  } catch {
    return { ok: true, address }
  }

  // Under `npm run dev` Vite answers unknown paths with index.html, so a
  // non-JSON reply means the check is simply not available here.
  if (!response.headers.get('content-type')?.includes('application/json')) {
    return { ok: true, address }
  }

  const body = (await response.json().catch(() => null)) as {
    formatted?: string
    error?: string
  } | null

  if (!response.ok || !body?.formatted) {
    return {
      ok: false,
      message: body?.error ?? 'That address could not be checked.',
    }
  }

  return { ok: true, address: body.formatted }
}
