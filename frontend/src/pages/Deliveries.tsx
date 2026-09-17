import { useAuth } from '../auth/useAuth'

export default function Deliveries() {
  const { profile } = useAuth()

  return (
    <div>
      <h1 className="text-xl font-semibold">Deliveries</h1>
      <p className="mt-2 text-sm text-slate-500">The run sheet arrives in step 6.</p>

      {/* Temporary, so the role can be seen working before the list exists. */}
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <p>
          Signed in as <strong>{profile?.display_name}</strong> ({profile?.email})
        </p>
        <p className="mt-2 text-slate-600">
          {profile?.role === 'dispatcher'
            ? 'As a dispatcher you will see every delivery, and be able to create and assign them.'
            : 'As a driver you will see only the deliveries assigned to you, and be able to mark them delivered.'}
        </p>
      </div>
    </div>
  )
}
