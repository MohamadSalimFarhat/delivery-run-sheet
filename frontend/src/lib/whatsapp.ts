/**
 * The placeholders a message template may contain. Anything else in the
 * template is left exactly as the user typed it.
 */
export type MessageValues = {
  customer: string
  driver: string
  address: string
}

export function buildMessage(template: string, values: MessageValues): string {
  return template
    .replaceAll('{customer}', values.customer)
    .replaceAll('{driver}', values.driver)
    .replaceAll('{address}', values.address)
}

/**
 * wa.me wants digits only, with the country code and no plus sign - which is
 * exactly the form customer_phone is stored in, normalised when the delivery
 * was created.
 */
export function whatsappLink(phoneDigits: string, message: string): string {
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`
}
