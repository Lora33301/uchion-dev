import crypto from 'crypto'

/**
 * Normalize an email so we can detect duplicate signups across providers
 * that ignore certain local-part variations.
 *
 * Universal rules (apply to ALL providers):
 *  - lowercase
 *  - strip any "+tag" suffix from the local part (most providers ignore it)
 *
 * Provider-specific (Gmail, Yandex, Ya.ru):
 *  - additionally strip dots from the local part (these providers officially
 *    treat "i.n.ga@gmail.com" and "inga@gmail.com" as the same mailbox).
 */
export function normalizeEmail(rawEmail: string): string {
  const email = rawEmail.trim().toLowerCase()
  const atIdx = email.lastIndexOf('@')
  if (atIdx <= 0) return email

  const localRaw = email.slice(0, atIdx)
  const domain = email.slice(atIdx + 1)

  // Strip "+tag" from local part (universal)
  const plusIdx = localRaw.indexOf('+')
  let local = plusIdx >= 0 ? localRaw.slice(0, plusIdx) : localRaw

  // Strip dots for providers that ignore them
  const dotInsensitiveDomains = new Set([
    'gmail.com',
    'googlemail.com',
    'yandex.ru',
    'yandex.com',
    'ya.ru',
  ])
  if (dotInsensitiveDomains.has(domain)) {
    local = local.replace(/\./g, '')
  }

  return `${local}@${domain}`
}

/**
 * Generate a referral code: 8 chars, base32 (Crockford-style, no ambiguous chars).
 * Avoids 0/O/1/I/L for human readability.
 */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ' // 31 chars
export function generateReferralCode(length: number = 8): string {
  const bytes = crypto.randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length]
  }
  return out
}

const REFERRAL_CODE_RE = /^[2-9A-HJ-NP-Z]{6,16}$/

/** Validate a referral code shape before DB lookup. */
export function isValidReferralCode(code: string): boolean {
  return REFERRAL_CODE_RE.test(code)
}
