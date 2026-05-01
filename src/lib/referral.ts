// Client-side referral capture.
// Reads `?ref=CODE` from the current URL on app load, persists it as a cookie
// for 90 days, then strips it from the URL so it doesn't end up in shared links
// or analytics.

const REFERRAL_COOKIE = 'uchion_ref'
const COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60
// Mirror the server-side validator (server/lib/referral.ts) -- 6-16 chars,
// Crockford base32 alphabet (no 0/1/I/L/O).
const REFERRAL_CODE_RE = /^[2-9A-HJ-NP-Z]{6,16}$/

function setRefCookie(code: string): void {
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
  const parts = [
    `${REFERRAL_COOKIE}=${encodeURIComponent(code)}`,
    'Path=/',
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    'SameSite=Lax',
  ]
  if (isHttps) parts.push('Secure')
  document.cookie = parts.join('; ')
}

/**
 * Run on app start. Picks up `?ref=CODE` and saves it.
 * No-op when not in the browser (SSR safety).
 */
export function captureReferralCode(): void {
  if (typeof window === 'undefined') return

  try {
    const url = new URL(window.location.href)
    const ref = url.searchParams.get('ref')
    if (!ref) return

    const normalized = ref.trim().toUpperCase()
    if (!REFERRAL_CODE_RE.test(normalized)) return

    setRefCookie(normalized)

    // Strip ?ref= from the visible URL without reloading or losing other params
    url.searchParams.delete('ref')
    const newSearch = url.searchParams.toString()
    const newUrl = url.pathname + (newSearch ? `?${newSearch}` : '') + url.hash
    window.history.replaceState(null, '', newUrl)
  } catch {
    // Defensive -- never block app boot on malformed URLs
  }
}
