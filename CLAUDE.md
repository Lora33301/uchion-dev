# CLAUDE.md

## Project Overview

Uchion -- AI worksheet & presentation generator for Russian school students (grades 1-11). Generates structured assignments (5 task types) with answers as PDF. Also generates PPTX presentations. Uses AI models via polza.ai with multi-agent validation.

**Subjects**: Math (1-6), Algebra (7-11), Geometry (7-11), Russian (1-11).

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite 7 + Tailwind CSS, Zustand + React Query, React Hook Form + Zod, KaTeX, pptxgenjs
- **Backend**: Express.js 5, REST API + SSE streaming, PostgreSQL + Drizzle ORM, Puppeteer PDF, Prodamus payments
- **Auth**: Yandex OAuth (PKCE) + Email OTP (Unisender Go), JWT (access 1h + refresh 7d)
- **Shared**: `shared/` -- Zod schemas, types, plans config

## Commands

```bash
# Dev
npm run dev              # Frontend (Vite :5173) + Backend (Express :3000)
npm run dev:frontend     # Vite only
npm run dev:server       # Express only

# Test
npm run smoke            # Smoke tests (DummyProvider, free)
npm run test             # Unit tests (Vitest, watch)
npm run test:run         # Unit tests (single run)
npm run test:e2e         # E2E tests (Playwright)

# Build
npm run build            # Vite build + TypeScript compile
npm run start            # node dist-server/server.js

# Database
npm run db:generate      # Generate Drizzle migrations
npm run db:migrate       # Run migrations
npm run db:push          # Push schema to database
npm run db:studio        # Open Drizzle Studio
```

## Project Structure

```
/server/routes/          # API routes (auth, generate, presentations, worksheets, folders, billing, admin/, telegram, health)
/server/middleware/      # Auth, rate-limit, cookies, audit-log, error-handler
/server/lib/             # Prodamus helpers, billing effects
/api/_lib/generation/    # Config-driven generation (config/subjects/*, config/presentations/*, validation/agents/*)
/api/_lib/providers/     # AI providers (openai, claude, dummy, circuit-breaker)
/api/_lib/presentations/ # Presentation generators (minimalism, kids, school) + PDF
/api/_lib/auth/          # Tokens, cookies, OAuth, encryption
/api/_lib/               # ai-provider.ts, ai-models.ts, ai-usage.ts, pdf.ts, email.ts
/src/pages/              # 18 pages (11 main + 7 admin)
/src/components/         # EditableWorksheetContent, SlidePreview, BuyGenerationsModal, etc.
/src/hooks/              # useWorksheetEditor (central editing logic)
/src/lib/                # API client, auth, pdf-client, admin-api
/src/store/              # Zustand stores
/shared/                 # worksheet.ts (Zod schemas), types.ts, plans.ts
/db/                     # Drizzle ORM schema (12 tables)
/tests/                  # unit/, api/, e2e/
```

## Key Patterns

### Types (shared/)
```
Subject = 'math' | 'algebra' | 'geometry' | 'russian'
TaskTypeId = 'single_choice' | 'multiple_choice' | 'open_question' | 'matching' | 'fill_blank'
DifficultyLevel = 'easy' | 'medium' | 'hard'
WorksheetFormatId = 'open_only' | 'test_only' | 'test_and_open'
SubscriptionPlanId = 'free' | 'starter' | 'teacher' | 'expert'
```

### SSE Streaming
`POST /api/generate` and `POST /api/presentations/generate` stream via SSE:
- `{ type: 'progress', percent: 0-100 }`
- `{ type: 'result', data: { worksheet } }` / `{ type: 'result', data: { presentation } }`
- `{ type: 'error', code, message }`

### Auth Middleware
```typescript
import { withAuth, withAdminAuth } from '../middleware/auth.js'
router.get('/protected', withAuth, (req, res) => { req.user!.id })
router.get('/admin', withAdminAuth, (req, res) => { })
```

### Error Handling
```typescript
import { ApiError } from '../middleware/error-handler.js'
throw ApiError.badRequest('Invalid input')
throw ApiError.unauthorized('Not authenticated')
throw ApiError.forbidden('Access denied')
throw ApiError.notFound('Resource not found')
throw ApiError.tooManyRequests('Rate limit exceeded')
throw ApiError.internal('Server error')
```

## API Endpoints

- `POST /api/generate` -- worksheet generation (SSE)
- `POST /api/generate/regenerate-task` -- single task regeneration
- `POST /api/generate/rebuild-pdf` -- rebuild PDF without AI
- `POST /api/presentations/generate` -- presentation generation (SSE)
- `GET/PATCH/DELETE /api/presentations/:id` -- presentation CRUD
- `GET /api/presentations` -- list presentations
- `GET/PATCH/DELETE /api/worksheets/:id` -- worksheet CRUD
- `GET /api/worksheets` -- list worksheets
- `GET/POST/PATCH/DELETE /api/folders` -- folder CRUD
- `/api/auth/{me,logout,refresh,yandex/redirect,yandex/callback,email/send-code,email/verify-code}`
- `/api/admin/*` -- stats, users, generations, payments, subscriptions, alerts, settings, ai-costs
- `/api/billing/*` -- products, create-link, subscribe, cancel-subscription, webhook, payment-status, subscription-plans
- `POST /api/telegram/webhook`, `GET /api/health`

## Subscription Plans (`shared/plans.ts`)

| Plan | Display Name | Price | Gens/mo | Folders | Model |
|------|-------------|-------|---------|---------|-------|
| free | Бесплатный | 0 | 5 (one-time) | 2 | deepseek-v3.2 |
| starter | Начинающий | 390/mo | 25 | 10 | gpt-4.1 |
| teacher | Методист | 890/mo | 60 | 10 | gpt-4.1 |
| expert | Эксперт | 1690/mo | 120 | 10 | gpt-4.1 |

Recurring via Prodamus club subscriptions. See `.claude/docs/subscriptions.md`.

## Environment Variables

```bash
DATABASE_URL=postgresql://user:password@host:5432/database
AI_PROVIDER=dummy                        # 'dummy' (dev) | 'polza' (prod)
OPENAI_API_KEY=sk-your-polza-api-key     # Only if AI_PROVIDER=polza
AI_BASE_URL=https://api.polza.ai/api/v1
# Models (all optional, have defaults):
AI_MODEL_PAID=openai/gpt-4.1
AI_MODEL_FREE=deepseek/deepseek-v3.2
AI_MODEL_AGENTS=openai/gpt-4.1-mini
AI_MODEL_VERIFIER_STEM=google/gemini-3-flash-preview
AI_MODEL_VERIFIER_HUMANITIES=google/gemini-2.5-flash-lite
AI_MODEL_PRESENTATION=anthropic/claude-sonnet-4.5
AUTH_SECRET=your-dev-secret-min-32-chars
YANDEX_CLIENT_ID=xxx
YANDEX_CLIENT_SECRET=xxx
UNISENDER_GO_API_KEY=xxx
TELEGRAM_BOT_TOKEN=xxx
PRODAMUS_SECRET=xxx
PRODAMUS_PAYFORM_URL=https://your-shop.payform.ru/
APP_URL=http://localhost:3000
PRODAMUS_SUBSCRIPTION_STARTER_ID=xxx
PRODAMUS_SUBSCRIPTION_TEACHER_ID=xxx
PRODAMUS_SUBSCRIPTION_EXPERT_ID=xxx
```

Production: same vars, different secrets. Deploy via Dokploy on VPS (port 3000).

## UI Patterns

- **Optimistic deletes**: Worksheet/presentation deletion uses `onMutate` to remove items from React Query cache instantly, then `onSettled` re-fetches. Applied in `WorksheetManager`, `WorksheetsListPage`, `PresentationsListPage`, `DashboardPage`.
- **Delete confirmation**: All delete buttons use `confirm()` dialog. No double-click patterns.
- **Usage limits display**: Shown inside list pages (`WorksheetsListPage`, `PresentationsListPage`) in subtitle and folder headers, NOT on dashboard main screen.
- **Buy generations button**: Only shown when `generationsLeft === 0` AND user has active paid subscription. Not always visible.
- **Plan badge**: NOT shown in Header "Личный кабинет" button. Plan info only displayed inside DashboardPage.
- **GeneratePage tab switching**: Supports `/?tab=presentation` URL param to open in presentation mode. Dashboard "Создать первую" link uses this.
- **Plan display names**: free=Бесплатный, starter=Начинающий, teacher=Методист, expert=Эксперт. Use names from `shared/plans.ts`, NOT hardcoded.
- **Subscription modal**: Glass morphism design with backdrop-blur cards. Detailed feature lists per plan from PLAN_LIMIT.md. Teacher plan has "Популярный выбор" badge. Two mandatory checkboxes (user agreement + recurring payment consent) must be checked before payment buttons become active. Links in checkboxes are placeholders (`href="#"`).

## Critical Rules

1. **No API keys in code** -- env variables only, different AUTH_SECRET for dev/prod
2. **DummyProvider for local dev** -- `AI_PROVIDER=dummy`, free, no API calls
3. **Config-driven generation** -- new subjects via config dirs, not code changes
4. **PDF via Puppeteer** -- NOT pdfkit; HTML template -> PDF; `pdfBase64` must be cleared on content edit
5. **Prodamus webhooks** -- `_param_*` fields NOT forwarded in subscription webhooks; userId resolved via email fallback chain
6. **Drizzle ORM** -- use `error.cause.code` for PG error codes (wrapped errors), not `error.code`
7. **Token limit** -- `max_tokens: 16000` for generation, NOT 8000
8. **Grade-tiered models** -- grades 1-6 use cheap gpt-4.1-mini; grades 7-11 use Gemini with reasoning

## See Also

Detailed docs in `.claude/docs/`:
- `ai-generation.md` -- generation flow, models, validation, prompts
- `subscriptions.md` -- Prodamus, webhook flow, userId fallback, idempotency
- `auth.md` -- Yandex OAuth, Email OTP, JWT, rate limiting
- `database.md` -- 12 tables, columns, relationships, soft delete
- `pdf-presentations.md` -- Puppeteer PDF, presentations, PPTX, slide types
- `how-to.md` -- adding subjects, modifying generation/presentations, deployment
