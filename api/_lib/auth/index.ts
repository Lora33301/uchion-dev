// OAuth utilities
export {
  generateState,
  validateState,
  generatePKCE,
  buildYandexAuthUrl,
  exchangeYandexCode,
} from './oauth.js'

// Token management
export {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
} from './tokens.js'
export type { AccessTokenPayload, RefreshTokenPayload } from './tokens.js'

// Cookie management
export {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  STATE_COOKIE,
  PKCE_COOKIE,
  setAuthCookies,
  clearAuthCookies,
  setOAuthStateCookie,
  setPKCECookie,
  clearOAuthCookies,
  getTokenFromCookie,
  getStateCookie,
  getPKCECookie,
} from './cookies.js'

// Middleware (use server/middleware/auth.ts for Express middleware)
// Legacy: api/_lib/auth/middleware.ts removed — all auth middleware lives in server/middleware/auth.ts
