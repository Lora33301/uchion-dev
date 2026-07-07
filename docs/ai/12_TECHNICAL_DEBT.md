# 12. Technical Debt and Risk Notes

This document lists potential issues only. It does not fix them.

## Potential technical debt

| Area | Observation | Risk |
|---|---|---|
| Dual `api/_lib` and `server/` naming | Business libraries live under `api/_lib`, while Express routes live under `server/routes` | New developers may assume `api/` contains deployed routes |
| Legacy/new subscription fields | Schema has legacy enums (`basic`, `premium`) and newer varchar plans (`free/starter/teacher/expert`) | Billing mistakes if wrong enum/field is used |
| `payments` vs `payment_intents` | Both legacy payments and newer intents exist | Admin/reporting confusion |
| `subjectEnum` vs varchar subjects | enum remains, worksheets use varchar | Validation mismatch risk |
| Optional BullMQ | App can run queued or direct depending on `USE_BULLMQ` | Bugs can exist in only one path |
| Webhook raw body coupling | `server.ts` preserves raw body based on URL substrings | Refactoring routes may break signature verification |
| Inline/base64 storage | `presentations.pptxBase64` and worksheet PDF fields suggest DB/inline storage | DB bloat risk for large files |
| No dedicated object storage | No S3/storage integration found | Scaling files may be hard |
| Email templates in code | No separate templates found | Harder localization/design changes |
| Manual scripts | Several migration/test scripts can affect DB | Risk if run against production accidentally |

## TODO/FIXME markers

A repository-wide search should be run before each cleanup task:

```bash
rg -n "TODO|FIXME|HACK|XXX|@deprecated|legacy" . -g '!node_modules'
```

At documentation time, legacy markers were visible in billing/schema naming and migration backup structure. Exact current list must be checked when a debt task is scheduled.

## Middleware inventory

| Middleware | File | Notes |
|---|---|---|
| Auth/admin guards | `server/middleware/auth.ts` | route wrappers |
| Rate limit | `server/middleware/rate-limit.ts` | used by auth/admin/routes |
| Cookies | `server/middleware/cookies.ts`, `api/_lib/auth/cookies.ts` | server/frontend auth cookies |
| Error handler | `server/middleware/error-handler.ts` | final Express handler |
| Audit log | `server/middleware/audit-log.ts` | sensitive/admin logging |
| Global Express middleware | `server.ts` | compression, parsers, CORS/origin, security headers, static |

## Cron/background jobs

No external cron framework found.

| Job | Location | Trigger |
|---|---|---|
| Queue initialization/workers | `server/lib/job-queue.ts`, `server.ts` | server startup, if `USE_BULLMQ=true` |
| Refresh token cleanup | `server.ts` | `setInterval` |
| Subscription expiry safety net | `server.ts`, `server/lib/subscription-expiry.ts` | `setInterval` |
| BullMQ worksheet generation | `server/lib/job-queue.ts` | queued jobs |
| BullMQ presentation generation | `server/lib/job-queue.ts` | queued jobs |

## Migrations

- Active: `db/migrations/`.
- Backup/historical: `db/migrations_backup/`.
- Manual migration scripts: `scripts/run-migration.ts`, `scripts/apply-migration.ts`, `scripts/migrate-0009.ts`, `scripts/run-folders-migration.ts`, `scripts/run-telegram-alerts-migration.ts`.

Risk: manual scripts may not match Drizzle migration state. Prefer Drizzle migrations unless there is an explicit operational reason.

## Seeds

Dedicated seed files were not found. Some scripts create/update admin/test data (`scripts/make-admin.ts`, test/smoke scripts), but these are not general seed infrastructure.

## Tests

| Test type | Location | Purpose |
|---|---|---|
| Unit | `tests/unit/` | AI models, schemas, validation agents, prompt parsing, circuit breaker |
| API | `tests/api/` | billing and generation endpoints |
| E2E | `tests/e2e/` | homepage/browser behavior |

## Webhooks

| Webhook | Route | Notes |
|---|---|---|
| Prodamus primary | `POST /api/billing/webhook` | requires signature, idempotency |
| Prodamus legacy | `POST /api/billing/prodamus/webhook` | same handler |
| Telegram | `POST /api/telegram/webhook` | secret token verification |

## Integrations

- OpenAI/OpenAI-compatible AI provider.
- UniSender Go email API.
- Yandex OAuth.
- Prodamus payments/subscriptions.
- Telegram Bot API.
- Redis/BullMQ optional.
- Puppeteer/Chromium for rendering.

## Entry points

| Entry | Purpose |
|---|---|
| `server.ts` | Express backend and production static serving |
| `src/main.tsx` | React frontend entry |
| `src/App.tsx` | frontend routes/layout |
| `scripts/*.ts` | operational scripts |
| `tests/**/*.ts` | test entry points |
| `db/index.ts` | DB client initialization |
