export type PhoneResult = {
  /** Digits only, country code included, ready to drop into a wa.me link. */
  digits: string
  /** A message to show the user, or null when the number is usable. */
  error: string | null
}

/**
 * Turns whatever the dispatcher typed into a number wa.me will accept.
 *
 * Everything that is not a digit is removed, so "+961 70 123 456",
 * "961-70-123-456" and "961 70 123 456" all come out the same. A leading 00
 * is the written form of the + prefix, so it is dropped too.
 *
 * A local number like "70 123 456" cannot be rescued - we have no way to know
 * which country it belongs to - so anything under 10 digits is rejected.
 */
export function normalizePhone(raw: string): PhoneResult {
  let digits = raw.replace(/\D/g, '')

  if (digits.startsWith('00')) {
    digits = digits.slice(2)
  }

  if (digits.length < 10) {
    return {
      digits,
      error: 'Start with the country code, for example 961 70 123 456.',
    }
  }

  return { digits, error: null }
}

/** For display only: 961701234 56 reads better as +96170123456. */
export function formatPhone(digits: string): string {
  return `+${digits}`
}
