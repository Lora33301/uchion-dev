# 10. AI Guide

Этот документ должен читаться AI-ассистентом перед любыми изменениями.

## Перед изменениями

1. Прочитать `docs/ai/01_PROJECT_OVERVIEW.md`.
2. Прочитать документ по нужной области:
   - API: `04_API_MAP.md`
   - DB: `05_DATABASE.md`
   - Email: `06_EMAIL_SYSTEM.md`
   - Telegram: `07_TELEGRAM.md`
   - Env: `08_ENVIRONMENT.md`
   - Dependencies: `09_DEPENDENCIES.md`
   - Change impact: `11_CHANGE_MAP.md`
3. Проверить `git status --short`.
4. Найти локальные инструкции `AGENTS.md`, если они появятся.
5. Не анализировать весь проект заново, если задача локальная: сначала использовать эту карту.

## Перед редактированием

Обязательно проверить:

- какие route/client files связаны с задачей;
- какие таблицы используются;
- есть ли tests for changed domain;
- затрагиваются ли auth/cookies/JWT/billing/webhooks;
- нужны ли env variables;
- не меняется ли shared contract (`shared/`, `db/schema.ts`, generation output JSON).

## Опасные зоны проекта

| Zone | Why dangerous |
|---|---|
| `server.ts` | global middleware order, raw body for webhooks, startup intervals |
| `db/schema.ts`, `db/migrations/` | production data compatibility |
| `api/_lib/auth/tokens.ts`, cookie helpers | login/session security |
| `server/routes/auth.ts` | email/OAuth/login/referral flow |
| `server/routes/billing*` | money, subscriptions, webhook idempotency |
| `server/lib/billing-effects.ts` | grants/plan effects |
| `shared/plans.ts` | prices/limits/UI/backend contract |
| `api/_lib/generation/` | AI output contract used by UI/PDF/tests |
| `api/_lib/providers/` | all AI calls/retry/circuit breaker |
| `server/lib/job-queue.ts` | async generation behavior/SSE |
| `server/middleware/auth.ts` | route protection/admin checks |

## Безопасные зоны

Relatively safe when task is narrow:

- UI text/style in isolated React components;
- docs in `docs/`;
- adding non-production fixtures in `fixtures/`;
- frontend presentational components not changing API shape;
- tests adding coverage.

Even in safe zones, run relevant tests/type check.

## Как добавлять новую функцию

1. Identify domain: auth/email/telegram/billing/generation/admin/frontend.
2. Read `11_CHANGE_MAP.md` for expected files.
3. Check existing similar route/component/service.
4. Define data contract and whether DB migration is needed.
5. Add backend route/service first if needed.
6. Add frontend API client method in `src/lib/*` if UI needs it.
7. Add/update UI.
8. Add tests close to existing tests.
9. Run targeted tests, then broader checks.
10. Update docs if architecture/API/env changes.

## Как искать код

Use `rg`, not recursive grep.

| Need | Search examples |
|---|---|
| authorization | `rg -n "withAuth|withAdminAuth|optionalAuth|refresh_tokens|access" server api src` |
| registration/email | `rg -n "email/send-code|email/verify-code|email_codes|sendEmail" server api src db` |
| Telegram | `rg -n "TELEGRAM|telegram|webhook" server api scripts src` |
| PDF | `rg -n "pdf|PDF|puppeteer|pdf-lib" api server src shared` |
| JWT | `rg -n "JWT|AUTH_SECRET|refresh|jti|familyId" api server db` |
| users | `rg -n "users|userId|withAdminAuth" server api db src/lib src/pages/admin` |
| admin | `rg -n "api/admin|withAdminAuth|Admin" server src` |
| middleware | `rg -n "app.use|router.use|withRateLimit|middleware" server server.ts` |
| database | `rg -n "pgTable|db\.select|db\.insert|db\.update|db\.delete" db server api scripts` |
| payments | `rg -n "Prodamus|payment|subscription|webhook" server api db src` |

## Где обычно лежит логика

| Logic | Location |
|---|---|
| Express route handling | `server/routes/` |
| Admin route handling | `server/routes/admin/` |
| Auth helpers | `api/_lib/auth/`, `server/middleware/auth.ts` |
| AI generation internals | `api/_lib/generation/`, `api/_lib/presentations/`, `api/_lib/providers/` |
| DB schema | `db/schema.ts` |
| Frontend pages | `src/pages/` |
| Frontend API calls | `src/lib/` |
| Shared constants/types | `shared/` |
| Operational scripts | `scripts/` |

## Golden rules for AI

- Do not change code outside the requested scope.
- Do not refactor while fixing a bug unless explicitly asked.
- Never put try/catch around imports.
- Preserve raw body behavior for billing webhooks.
- Preserve auth cookie security behavior unless the task is specifically about auth.
- For DB changes, add migration and update schema together.
- For API changes, update client types and this documentation.
