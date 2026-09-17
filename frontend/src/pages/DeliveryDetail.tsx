import { useParams } from 'react-router-dom'

export default function DeliveryDetail() {
  const { id } = useParams()

  return (
    <div>
      <h1 className="text-xl font-semibold">Delivery</h1>
      <p className="mt-2 text-sm text-slate-500">
        The details, map and WhatsApp button arrive in steps 7 to 9.
      </p>
      <p className="mt-4 text-sm text-slate-400">
        Reading id from the URL: <code className="font-mono">{id}</code>
      </p>
    </div>
  )
}
