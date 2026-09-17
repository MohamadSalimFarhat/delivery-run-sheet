export type Role = 'dispatcher' | 'driver'

export type Profile = {
  id: string
  email: string
  role: Role
  display_name: string
  message_template: string
  created_at: string
}

/**
 * Just enough of a profile to show a name, fill the assign dropdown, and
 * build the WhatsApp message in the assigned driver's own words.
 */
export type PersonSummary = {
  id: string
  display_name: string
  role: Role
  message_template: string
}

export type DeliveryStatus = 'pending' | 'delivered'

export type Delivery = {
  id: string
  customer_name: string
  customer_phone: string
  address: string
  status: DeliveryStatus
  driver_id: string | null
  created_by: string
  created_at: string
  delivered_at: string | null
}
