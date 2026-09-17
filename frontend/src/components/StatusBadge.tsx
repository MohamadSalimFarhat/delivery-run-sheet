import type { DeliveryStatus } from '../lib/types'

export default function StatusBadge({ status }: { status: DeliveryStatus }) {
  const className =
    status === 'delivered'
      ? 'rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800'
      : 'rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800'

  return <span className={className}>{status}</span>
}
