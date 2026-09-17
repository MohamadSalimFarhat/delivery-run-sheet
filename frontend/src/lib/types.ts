export type Role = 'dispatcher' | 'driver'

export type Profile = {
  id: string
  email: string
  role: Role
  display_name: string
  message_template: string
  created_at: string
}

/** Just enough of a profile to show a name and fill the assign dropdown. */
export type PersonSummary = {
  id: string
  display_name: string
  role: Role
}

export type DeliveryStatus = 'pending' | 'delivered'

export type Delivery = {
  id: string
  customer_name: string
  customer_phone: string
  address: string
  /** The exact point the driver is navigated to. Null on older deliveries. */
  latitude: number | null
  longitude: number | null
  status: DeliveryStatus
  driver_id: string | null
  created_by: string
  created_at: string
  delivered_at: string | null
}
