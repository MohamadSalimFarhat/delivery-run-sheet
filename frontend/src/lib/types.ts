export type Role = 'dispatcher' | 'driver'

export type Profile = {
  id: string
  email: string
  role: Role
  display_name: string
  message_template: string
  created_at: string
}
