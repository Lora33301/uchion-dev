# 02. Structure Map

Документ описывает назначение папок репозитория. Это не список файлов, а карта ответственности.

## Корень репозитория

| Файл/папка | Назначение | Безопасно менять | Не менять без понимания |
|---|---|---|---|
| `package.json`, `package-lock.json` | зависимости и npm-скрипты | scripts при понятной задаче | версии зависимостей без тестов |
| `server.ts` | главный Express entrypoint | редко: mount нового route | CORS, body parsers, cookie/security headers, cron/queues |
| `vite.config.ts` | сборка frontend | aliases/build мелко | proxy/build настройки без проверки |
| `drizzle.config.ts` | Drizzle migrations config | путь к schema/migrations при миграциях | `DATABASE_URL` assumptions |
| `tsconfig*.json` | TypeScript конфиги | только осознанно | module/output settings |
| `vercel.json`, `docker-compose.yml` | деплой/контейнер | env passthrough | routing/build/deploy behavior |

## `api/`

Назначение: общие backend-библиотеки, генераторы, провайдеры, Telegram, email, auth helpers. Несмотря на имя `api`, actual Express routes лежат в `server/routes/`.

Ключевые зоны:

| Папка | Назначение | Ключевые файлы | Можно безопасно менять | Опасно менять |
|---|---|---|---|---|
| `api/_lib/ai/` | схемы, промпты, AI validation | `prompts.ts`, `schema.ts`, `validator.ts` | тексты промптов при тестах | структуру JSON без sync с validators/tests |
| `api/_lib/generation/` | генерация рабочих листов | `index.ts`, `parse-prompt.ts`, `sanitize.ts`, `validation/` | отдельные промпты/санитайзинг | контракт worksheet content |
| `api/_lib/presentations/` | генерация PPTX и PDF для презентаций | `generator.ts`, `pdf-generator.ts`, theme generators | темы/визуальные параметры | формат `structure`, base generators |
| `api/_lib/providers/` | AI providers, retry, circuit breaker | `openai-provider.ts`, `claude-provider.ts`, `circuit-breaker.ts` | настройки retry/model mapping | provider interface без обновления callers |
| `api/_lib/auth/` | JWT/cookies/OAuth/encryption/rate-limit | `tokens.ts`, `cookies.ts`, `oauth.ts` | срок жизни токенов только осознанно | secrets, refresh rotation, cookie security |
| `api/_lib/telegram/` | Telegram bot and commands | `bot.ts`, `commands.ts`, `index.ts` | тексты команд | webhook verification, DB lookup |
| `api/_lib/alerts/` | алерты по генерации | `generation-alerts.ts` | пороги/тексты | cooldown/rate logic |
| `api/_lib/pdf/` | PDF assets/templates (если используются) | проверить по задаче | стили | rendering contract |
| `api/_assets/` | серверные assets/fonts | fonts | замена assets | пути к шрифтам |

## `server/`

Назначение: Express application layer: routes, middleware, server-side lib.

| Папка | Назначение | Ключевые файлы | Можно безопасно менять | Опасно менять |
|---|---|---|---|---|
| `server/routes/` | публичные API routes | `auth.ts`, `generate.ts`, `billing.ts`, `worksheets.ts`, `presentations.ts` | добавить endpoint по аналогии | auth, billing webhooks, generation SSE |
| `server/routes/admin/` | admin API | `users.ts`, `payments.ts`, `stats.ts`, `settings.ts` | UI-specific filters | purge/block/change-plan без audit |
| `server/middleware/` | middleware | `auth.ts`, `rate-limit.ts`, `cookies.ts`, `error-handler.ts`, `audit-log.ts` | локальные guards | JWT verification, rate keying |
| `server/lib/` | backend utilities | `job-queue.ts`, `redis.ts`, `prodamus.ts`, `billing-effects.ts` | pure helpers | queue lifecycle, payment effects |
| `server/types.ts` | Express/Auth shared types | добавить поля при auth changes | несовместимые request type changes |

## `db/`

Назначение: database connection, schema and migrations.

| Папка/файл | Назначение | Ключевое | Можно безопасно менять | Опасно менять |
|---|---|---|---|---|
| `db/schema.ts` | Drizzle ORM schema | all tables/enums/relations | только с миграцией | типы колонок, enum values, relations |
| `db/index.ts` | PostgreSQL client and migrate helper | `DATABASE_URL`, pool | pool config | connection initialization |
| `db/migrations/` | active migrations | SQL migrations and meta | добавлять новую миграцию | редактировать примененные миграции |
| `db/migrations_backup/` | исторические/backup migrations | old SQL | обычно не трогать | использовать как source of truth |

## `src/`

Назначение: React frontend.

| Папка | Назначение | Ключевые файлы | Можно безопасно менять | Опасно менять |
|---|---|---|---|---|
| `src/pages/` | страницы приложения | `LoginPage.tsx`, `GeneratePage.tsx`, list/detail pages | тексты/UI блоки | auth redirects, route assumptions |
| `src/pages/admin/` | admin UI | admin pages | таблицы/фильтры UI | destructive actions UX |
| `src/components/` | reusable UI | modals, header, worksheet editor | presentational components | editor state/unsaved logic |
| `src/components/generation/` | forms/previews generation | `WorksheetGenerateForm.tsx`, `PresentationGenerateForm.tsx` | form labels/options | request schema |
| `src/components/presentations/` | presentation previews/themes | themes and slide preview | styles | presentation structure expectations |
| `src/components/ui/` | base UI components | selects, icons, spinner | isolated UI | global styling APIs |
| `src/hooks/` | frontend hooks | PDF/editor/list hooks | local hook behavior | side effects and save flows |
| `src/lib/` | API clients and frontend helpers | `api.ts`, `auth.tsx`, `admin-api.ts` | add typed client methods | token refresh/client error handling |
| `src/store/` | Zustand state | `session.ts` | isolated store fields | persisted/session assumptions |
| `src/data/` | legal docs JSON | privacy/consents | legal text with owner approval | structure used by pages |
| `src/constants/` | constants | generation constants | UI constants | backend contract constants |

## `shared/`

Назначение: код и типы, используемые frontend/backend.

| Файл | Назначение | Опасность |
|---|---|---|
| `shared/types.ts` | shared TypeScript types | изменение ломает обе стороны |
| `shared/worksheet.ts` | worksheet domain types/helpers | формат content связан с генерацией/PDF |
| `shared/plans.ts` | планы, лимиты, цены | влияет на billing, лимиты, UI |

## `tests/`

Назначение: automated tests.

| Папка | Что хранится | Ключевое |
|---|---|---|
| `tests/unit/` | unit tests for schemas, validation, circuit breaker | быстрые проверки доменной логики |
| `tests/api/` | API tests with Supertest/Vitest | billing/generate behavior |
| `tests/e2e/` | Playwright end-to-end tests | browser scenarios |

## `scripts/`

Назначение: ручные maintenance/test utilities.

Ключевые скрипты: `setup-telegram-webhook.ts`, `make-admin.ts`, `smoke-generate.ts`, `test-db.ts`, migration runners. Не запускать production/destructive scripts без понимания env и target DB.

## `docs/`

Назначение: существующая документация, маркетинговые/технические материалы, юридические документы и новая AI-документация.

- `docs/ai/` — новая постоянная карта проекта для AI и разработчиков.
- Другие подпапки (`alerts`, `docsyur`, `logo`, `subject`, `superpowers`) содержат материалы продукта/процессов.

## `public/`

Назначение: static assets frontend: docs, fonts, images, showcase. Безопасно менять изображения/документы только если известно, где они отображаются.

## `_bmad/`, `.claude/`

Назначение: методологии, агенты, workflow-документация. Это не runtime-код продукта. Менять только при задаче по AI/workflow настройкам.

## `fixtures/`

Назначение: sample data, например `sample-worksheet.json`. Безопасно добавлять фикстуры для тестов, но не считать production schema source of truth.
