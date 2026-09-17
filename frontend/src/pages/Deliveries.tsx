import { Link } from 'react-router-dom'

export default function Deliveries() {
  return (
    <div>
      <h1 className="text-xl font-semibold">Deliveries</h1>
      <p className="mt-2 text-sm text-slate-500">
        The run sheet arrives in step 6.
      </p>

      {/* A stand-in link, so the detail route can be clicked through today. */}
      <Link
        to="/deliveries/example"
        className="mt-6 inline-block text-sm font-medium text-blue-600 underline"
      >
        Open an example delivery
      </Link>
    </div>
  )
}
