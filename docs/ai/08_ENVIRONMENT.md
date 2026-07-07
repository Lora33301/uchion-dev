# 08. Environment Variables

Do not put real values into documentation or commits.

| Variable | Required? | Used in | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Yes for backend/DB scripts | `db/index.ts`, `drizzle.config.ts`, scripts | PostgreSQL connection string |
| `DB_POOL_MAX` | No | `db/index.ts` | PostgreSQL pool max size; default used if absent |
| `PORT` | No | `server.ts` | Express port; default 3000 |
| `NODE_ENV` | No but important | server/auth/cookies/billing | production/dev behavior, secure cookies, debug/dev routes |
| `APP_URL` | Production recommended | server CORS/auth/billing | public app origin/callback/payment URLs |
| `OPENAI_API_KEY` | Required for real AI | `api/_lib/ai-provider.ts`, validation/generation agents | AI provider API key |
| `AI_PROVIDER` | No | AI provider selection | choose provider; defaults depend on environment |
| `AI_BASE_URL` | No | AI clients | OpenAI-compatible custom endpoint |
| `AI_MODEL_FREE` | No | `api/_lib/ai-models.ts` | model for free users |
| `AI_MODEL_PAID` | No | `api/_lib/ai-models.ts` | model for paid users |
| `AI_MODEL_AGENTS` | No | `api/_lib/ai-models.ts` | model for validation agents |
| `AI_MODEL_PRESENTATION` | No | `api/_lib/ai-models.ts` | presentation model |
| `AI_MODEL_VALIDATION` | No | `api/_lib/ai/validator.ts` | validation model |
| `AI_MODEL_VERIFIER_HUMANITIES` | No | validation agents | humanities verifier model |
| `AI_MODEL_VERIFIER_STEM` | No | validation agents | STEM verifier model |
| `AUTH_SECRET` | Yes for JWT | `api/_lib/auth/tokens.ts` | signing secret fallback/name for auth tokens |
| `ENCRYPTION_KEY` | Required where encryption used | `api/_lib/auth/encryption.ts` | encryption key |
| `YANDEX_CLIENT_ID` | For Yandex OAuth | `server/routes/auth.ts` | OAuth client id |
| `YANDEX_CLIENT_SECRET` | For Yandex OAuth | `server/routes/auth.ts` | OAuth client secret |
| `UNISENDER_GO_API_KEY` | For email login | `api/_lib/email.ts` | UniSender Go API key |
| `PRODAMUS_SECRET` | Production billing required | billing routes/helpers/prodamus | Prodamus signature secret |
| `PRODAMUS_PAYFORM_URL` | Production billing required | billing routes/helpers/prodamus | Prodamus payform base URL |
| `PRODAMUS_DEBUG` | No | `server.ts`, `server/lib/prodamus.ts` | verbose Prodamus diagnostics |
| `PRODAMUS_SUBSCRIPTION_STARTER_ID` | For subscriptions | `server/routes/billing-helpers.ts` | Prodamus subscription product id |
| `PRODAMUS_SUBSCRIPTION_TEACHER_ID` | For subscriptions | `server/routes/billing-helpers.ts` | Prodamus subscription product id |
| `PRODAMUS_SUBSCRIPTION_EXPERT_ID` | For subscriptions | `server/routes/billing-helpers.ts` | Prodamus subscription product id |
| `TELEGRAM_BOT_TOKEN` | For Telegram | `api/_lib/telegram/bot.ts`, setup script | BotFather token |
| `TELEGRAM_WEBHOOK_SECRET` | Recommended | `server/routes/telegram.ts`, setup script | verify webhook requests |
| `REDIS_URL` | If `USE_BULLMQ=true` | `server/lib/redis.ts` | Redis connection URL; default localhost |
| `USE_BULLMQ` | No | `server/lib/job-queue.ts` | enables BullMQ queue workers |
| `MAX_CONCURRENT_GENERATIONS` | No | generation limiter/job queue | concurrency cap |
| `BROWSER_POOL_MAX_PAGES` | No | `api/_lib/browser-pool.ts` | max browser pages |
| `BROWSER_POOL_MAX_RENDERS` | No | `api/_lib/browser-pool.ts` | browser page recycle threshold |
| `CHROME_PATH` | No | `api/_lib/browser-pool.ts` | local Chrome executable path |
| `VERCEL`, `VERCEL_ENV`, `AWS_LAMBDA_FUNCTION_NAME`, `NETLIFY` | Platform-provided | browser/AI provider | serverless/production detection |
| `LOCALAPPDATA` | Windows/local only | browser pool | locate local Chrome |
| `CI` | CI only | Playwright/config/docs | CI behavior |
| `BASE_URL` | Scripts/tests only | `scripts/test-alerts.ts` | target app for scripts |
| `SMOKE_REAL_AI`, `SMOKE_PAID`, `SMOKE_SUBJECTS`, `SMOKE_GRADES` | Scripts only | `scripts/smoke-generate.ts` | smoke test controls |

Variables mentioned only in `_bmad/` docs are workflow examples, not necessarily product runtime env.
