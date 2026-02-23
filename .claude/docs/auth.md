# Authentication

## Methods

Two login methods:
- **Yandex OAuth** -- OAuth 2.0 with PKCE
- **Email OTP** -- Passwordless login via 6-digit code sent to email (Unisender Go)

## JWT Infrastructure

- **Access token**: 1 hour lifetime
- **Refresh token**: 7 days, with rotation and family tracking
- **Storage**: httpOnly cookies (secure)
- **Rate limiting**: in-memory (rate-limiter-flexible)

## Email OTP Flow

1. `POST /api/auth/email/send-code` -- sends 6-digit code to email
2. Code stored in `email_codes` table (expires: 10 min, max 5 attempts)
3. `POST /api/auth/email/verify-code` -- verifies code (timing-safe comparison)
4. On success: creates/finds user (provider: 'email', providerId: email), issues JWT tokens

Rate limits:
- `send-code`: 3 per 10 min per email
- `verify-code`: 10 per 10 min per IP + per email

Implementation detail: atomic attempt increment via `UPDATE ... SET attempts = attempts + 1 ... RETURNING` (prevents race condition).

## Yandex OAuth Flow

1. `GET /api/auth/yandex/redirect` -- generates PKCE code_verifier + state, redirects to Yandex
2. `GET /api/auth/yandex/callback` -- exchanges code for tokens, creates/finds user (provider: 'yandex')

## Middleware

```typescript
import { withAuth, withAdminAuth } from '../middleware/auth.js'

router.get('/protected', withAuth, (req, res) => { req.user!.id })
router.get('/admin', withAdminAuth, (req, res) => { /* role: 'admin' required */ })
```

## Key Files

- `api/_lib/auth/tokens.ts` -- JWT sign/verify
- `api/_lib/auth/oauth.ts` -- PKCE, state validation (Yandex)
- `api/_lib/auth/cookies.ts` -- httpOnly cookie management
- `api/_lib/email.ts` -- send OTP via Unisender Go
- `server/middleware/auth.ts` -- withAuth, withAdminAuth, optionalAuth
- `server/routes/auth.ts` -- all auth endpoints
- `src/pages/LoginPage.tsx` -- login UI (Yandex OAuth + Email OTP)
- `src/lib/auth.ts` -- frontend auth utilities
