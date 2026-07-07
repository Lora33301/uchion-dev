# 11. Change Map

## Авторизация / JWT

**Files**

- `server/routes/auth.ts`
- `server/middleware/auth.ts`
- `api/_lib/auth/tokens.ts`
- `api/_lib/auth/cookies.ts`
- `server/middleware/cookies.ts`
- `db/schema.ts` (`users`, `refresh_tokens`, `email_codes`)
- `src/lib/auth.tsx`, `src/lib/api.ts`, `src/pages/LoginPage.tsx`

**Dependencies**: JWT secrets, cookies, DB, email/OAuth providers.

**Test**: auth unit/API flows, login UI, refresh/logout, admin access denied/allowed.

## Email login

**Files**

- `server/routes/auth.ts`
- `api/_lib/email.ts`
- `db/schema.ts` (`email_codes`)
- `src/pages/LoginPage.tsx`

**Dependencies**: `UNISENDER_GO_API_KEY`, rate limit, auth tokens.

**Test**: send code, invalid email, invalid/expired code, attempts, successful login.

## Telegram

**Files**

- `server/routes/telegram.ts`
- `api/_lib/telegram/bot.ts`
- `api/_lib/telegram/commands.ts`
- `api/_lib/alerts/generation-alerts.ts`
- `server/routes/admin/settings.ts`
- `src/pages/admin/AdminSettingsPage.tsx`
- `scripts/setup-telegram-webhook.ts`

**Dependencies**: Telegram Bot API, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `users.telegramChatId`, `users.wantsAlerts`.

**Test**: webhook secret, command handling, test alert, admin settings save/delete.

## Регистрация / пользователи

**Files**

- `server/routes/auth.ts`
- `server/routes/admin/users.ts`
- `db/schema.ts` (`users`)
- `server/lib/referral.ts`
- `src/pages/LoginPage.tsx`, admin pages

**Dependencies**: email/Yandex, referrals, tokens, subscriptions.

**Test**: new user, existing user, referral capture, blocked/deleted user behavior.

## БД

**Files**

- `db/schema.ts`
- `db/migrations/`
- routes/services using affected table
- tests and API clients if contract changes

**Dependencies**: Drizzle, PostgreSQL, migrations order.

**Test**: migration applies, affected route tests, typecheck/build.

## Страницы frontend

**Files**

- `src/pages/...`
- related `src/components/...`
- `src/lib/*-api.ts` if data shape changes
- `src/App.tsx` if route changes

**Dependencies**: React Router, React Query, backend API.

**Test**: targeted component/manual UI, e2e if critical route, build.

## API endpoints

**Files**

- `server/routes/<domain>.ts`
- `server.ts` if new router mount
- `src/lib/<domain>-api.ts`
- `docs/ai/04_API_MAP.md`
- tests in `tests/api/`

**Dependencies**: auth middleware, DB, zod/shared types.

**Test**: API tests with auth/no auth, invalid input, success path.

## Middleware

**Files**

- `server/middleware/*`
- `server.ts` for global middleware
- route files using wrappers

**Dependencies**: Express order, cookies, auth, rate limit, raw body/webhooks.

**Test**: protected routes, webhooks, CORS/origin behavior, error handling.

## Billing / Prodamus

**Files**

- `server/routes/billing.ts`
- `server/routes/billing-webhook.ts`
- `server/routes/billing-subscription-webhook.ts`
- `server/routes/billing-helpers.ts`
- `server/lib/prodamus.ts`
- `server/lib/billing-effects.ts`
- `server/lib/subscription-expiry.ts`
- `shared/plans.ts`
- admin payments UI/routes

**Dependencies**: Prodamus env, webhook signature, raw body, `payment_intents`, `webhook_events`, `subscriptions`, `users`.

**Test**: create link, webhook idempotency, subscription statuses, cancel, admin visibility.

## Generation / AI

**Files**

- `server/routes/generate.ts`
- `server/routes/presentations.ts`
- `api/_lib/generation/`
- `api/_lib/presentations/`
- `api/_lib/providers/`
- `api/_lib/ai-models.ts`
- `api/_lib/ai-usage.ts`
- `server/lib/job-queue.ts`
- frontend generation forms/previews

**Dependencies**: AI env, BullMQ/Redis optional, DB limits, PDF/PPTX rendering.

**Test**: unit validation tests, smoke generation with dummy provider if possible, API tests, PDF/PPTX checks.
