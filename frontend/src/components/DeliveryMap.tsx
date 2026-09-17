import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * The map cannot be a plain <img src="/api/map?id=...">, because an img tag
 * cannot send an Authorization header, and the endpoint requires one. So the
 * image is fetched with the session token, then shown from an object URL.
 */
type Props = {
  deliveryId: string
  /**
   * Not sent for the server to use - it looks the address up itself. It is
   * here only to change the URL when the address changes, so the browser's
   * hour-long cache cannot keep showing a map of the old, mistyped address.
   */
  address: string
}

export default function DeliveryMap({ deliveryId, address }: Props) {
  const [src, setSrc] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null

    async function run() {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token

      if (!token) {
        if (!cancelled) setError('Sign in to see the map.')
        return
      }

      const response = await fetch(
        `/api/map?id=${encodeURIComponent(deliveryId)}` +
          `&v=${encodeURIComponent(address)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )

      if (cancelled) return

      // During `npm run dev` there is no serverless function, and Vite answers
      // every unknown path with index.html. Checking the type rather than the
      // status keeps that from showing up as a broken image.
      const isImage = response.headers
        .get('content-type')
        ?.startsWith('image/')

      if (!response.ok || !isImage) {
        const message = !isImage
          ? 'The map only runs on the deployed site.'
          : ((await response.json().catch(() => null)) as {
              error?: string
            } | null)?.error

        setError(message ?? 'The map could not be loaded.')
        return
      }

      const blob = await response.blob()
      if (cancelled) return

      objectUrl = URL.createObjectURL(blob)
      setSrc(objectUrl)
    }

    void run()

    return () => {
      cancelled = true
      // Object URLs are held by the browser until explicitly released.
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [deliveryId, address])

  if (error) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-100 p-6 text-center text-sm text-slate-500">
        {error}
      </div>
    )
  }

  if (!src) {
    return (
      <div className="h-48 animate-pulse rounded-lg border border-slate-200 bg-slate-100" />
    )
  }

  return (
    <img
      src={src}
      alt="Map of the delivery address"
      className="w-full rounded-lg border border-slate-200"
    />
  )
}
