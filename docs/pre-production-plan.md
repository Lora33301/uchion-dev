# Pre-Production Plan — Uchion v2

Комплексный аудит: архитектура, код, перформанс, безопасность.
Дата: 2026-02-24

---

## Вердикт

**Монолит оправдан** для 500-1000 пользователей. Микросервисы не нужны — одно Express-приложение на VPS с правильной конфигурацией справится. Архитектура здоровая: shared/ типы, config-driven генерация, middleware-цепочка, атомарный декремент.

**Что реально может уронить прод**: отсутствие concurrency-контроля для AI генерации + маленький DB pool + ghost-генерации при закрытии вкладки + огромный frontend bundle.

---

## P0 — БЛОКИРУЕТ ДЕПЛОЙ

### 1. ~~Concurrency limiter для AI генерации~~ DONE 24.02.2026
**Проблема**: Нет ограничения на одновременные AI-вызовы. 50 юзеров = 50 параллельных запросов к polza.ai = cascade failure.
**BullMQ был revert'нут** (Upstash несовместим). Нужен in-memory semaphore до перехода на Timeweb Redis.
**Файлы**: `server/routes/generate.ts`, `server/routes/presentations.ts`
**Решение**: `p-limit(10)` — обёртка вокруг AI-вызовов. 5-10 одновременных генераций, остальные в очереди.
**Эффект**: Защита от burst без Redis-зависимости.
**Выполнено**: `api/_lib/generation/concurrency-limiter.ts` + обёрнуты generate, regenerate-task, presentations/generate. ENV: `MAX_CONCURRENT_GENERATIONS=10`.

### 2. ~~DB pool увеличить до 20~~ DONE 24.02.2026
**Проблема**: `max: 10` в `db/index.ts`. Одна генерация = 4-6 DB-операций. При 10 параллельных генерациях + API-запросы = pool exhaustion.
**Файл**: `db/index.ts`
**Решение**: `max: parseInt(process.env.DB_POOL_MAX || '20')`
**Выполнено**: Pool size конфигурируется через `DB_POOL_MAX` env var, дефолт 20.

### 3. ~~Client disconnect detection (ghost generations)~~ DONE 24.02.2026
**Проблема**: Юзер закрывает вкладку — AI-вызов продолжается, Puppeteer-слот занят, токены потрачены впустую. Нет `req.on('close')`.
**Файлы**: `server/routes/generate.ts`, `server/routes/presentations.ts`
**Решение**: `req.on('close')` + `clientDisconnected` flag + проверка между шагами pipeline.
**Выполнено**: После AI-генерации проверяется `clientDisconnected`. Если клиент ушёл — PDF/PPTX/DB save пропускаются, generationsLeft откатывается, generation record помечается failed.

### 4. ~~Frontend bundle splitting — lazy load страниц~~ DONE 24.02.2026
**Проблема**: Все 11 страниц в одном бандле. KaTeX (300 KB) + pdf-lib (428 KB) грузятся для всех.
**Файлы**: `src/App.tsx`, `vite.config.ts`
**Решение**: `React.lazy()` на все страницы кроме GeneratePage (лендинг). manualChunks в vite.config для vendor-библиотек.
**Выполнено**: 12 страниц lazy-loaded. Vendor chunks: vendor-react (163KB), vendor-katex (265KB), vendor-pdf (428KB), vendor-forms (81KB). Начальный бандл index.js = 258KB.

### 5. ~~Кеширование шрифта в PDF генерации~~ DONE 24.02.2026
**Проблема**: `loadFontAsBase64()` читает 2 файла с диска (300-400 KB каждый) и конвертирует в base64 **на каждый PDF**. При 20 генерациях = 40 чтений.
**Файл**: `api/_lib/pdf/fonts.ts`
**Решение**: Module-level cache: `let cachedFonts: {...} | null = null`, заполняется один раз.
**Выполнено**: Шрифт кешируется в `cachedFonts` при первом вызове, дальше берётся из памяти.

### 6. ~~billing-effects.ts — TODO-заглушка возвращает success~~ DONE 24.02.2026
**Проблема**: `applyProductEffect()` для `subscription` типа возвращает `{ success: true }` БЕЗ действий.
**Файл**: `server/lib/billing-effects.ts`
**Решение**: Удалён `premium_monthly` из PRODUCTS и мёртвая ветка `subscription` type. Подписки идут через отдельный `billing-subscription-webhook.ts`.
**Выполнено**: ProductInfo тип упрощён до `type: 'generations'` only. Dead code удалён.

### 7. ~~Admin router — глобальный withAdminAuth~~ DONE 24.02.2026
**Проблема**: Каждый файл в `server/routes/admin/` сам ставит `withAdminAuth` на каждый route. Забыл — публичный доступ к admin API.
**Файл**: `server/routes/admin/index.ts`
**Решение**: `router.use(requireAdmin)` на уровне роутера.
**Выполнено**: Добавлен `requireAdmin` middleware в `server/middleware/auth.ts`, подключён в `admin/index.ts`. Все admin routes защищены на уровне роутера.

### 8. ~~select() без column projection — утечка полей~~ DONE 24.02.2026
**Проблема**: В нескольких routes `.select()` без колонок тянет ВСЕ поля (provider, providerId, telegramChatId...).
**Файлы**: `server/routes/auth.ts`, `billing.ts`, `billing-webhook.ts`
**Решение**: Явные column projections на все bare `.select()` — auth.ts (3 места), billing.ts (1), billing-webhook.ts (1).
**Выполнено**: Все 5 мест получили явные column projections. Чувствительные поля (providerId, telegramChatId) исключены.

### 9. ~~Удалить legacy и мусор~~ DONE 24.02.2026
- `api/_lib/auth/middleware.ts` — legacy auth middleware, не используется, создаёт путаницу
- `nul` — артефактный файл Windows в корне
**Выполнено**: Оба файла удалены. Re-export в `api/_lib/auth/index.ts` заменён на комментарий.

---

## P1 — ВАЖНО (первая неделя)

### 10. ~~SSE keepalive ping~~ DONE 24.02.2026
**Проблема**: AI генерация 60-120 секунд. nginx/Cloudflare таймаут 60-75 сек idle. Без heartbeat proxy убьёт SSE.
**Файлы**: `server/routes/generate.ts`, `presentations.ts`
**Решение**: `setInterval(() => res.write(': ping\n\n'), 15000)` + cleanup в `finally`.
**Выполнено**: Keepalive ping каждые 15 сек. clearInterval в `req.on('close')` и `finally` блоке.

### 11. ~~Revoke tokens при блокировке пользователя~~ DONE 24.02.2026
**Проблема**: Admin блокирует юзера → access token живёт ещё до 1 часа, refresh token до 7 дней.
**Файл**: `server/routes/admin/users.ts`
**Решение**: При `deletedAt` вызвать `revokeAllUserTokens(userId)`.
**Выполнено**: Import `revokeAllUserTokens` из `tokens.ts`, вызов после `UPDATE users SET deletedAt` в block endpoint. Все refresh tokens юзера моментально revoked.

### 12. ~~Refresh token cleanup cron~~ DONE 24.02.2026
**Проблема**: `cleanupExpiredTokens()` существует, но нигде не вызывается. Таблица `refresh_tokens` растёт бесконечно.
**Файл**: `api/_lib/auth/tokens.ts`
**Решение**: `setInterval(cleanupExpiredTokens, 6 * 60 * 60 * 1000)` в `server.ts`.
**Выполнено**: `setInterval` каждые 6 часов + однократный запуск при старте. `clearInterval` в graceful shutdown.

### 13. ~~Composite DB indexes~~ DONE 24.02.2026
**Проблема**: Самый частый запрос `WHERE user_id AND deleted_at IS NULL ORDER BY created_at DESC` использует 3 отдельных индекса вместо одного composite.
**Файл**: `db/schema.ts`
**Решение**: `index('worksheets_user_active_idx').on(worksheets.userId, worksheets.deletedAt, worksheets.createdAt)`
**Выполнено**: 4 composite индекса: `worksheets_user_active_idx` (userId, deletedAt, createdAt), `folders_user_active_idx` (userId, deletedAt), `presentations_user_created_idx` (userId, createdAt), `generations_user_created_idx` (userId, createdAt). Миграция `0016_add_composite_indexes.sql`.

### 14. ~~Static assets — immutable cache headers~~ DONE 24.02.2026
**Проблема**: Vite генерирует файлы с content-hash, но `express.static` отдаёт `max-age=0`. Браузер перевалидирует на каждом визите.
**Файл**: `server.ts`
**Решение**: Для файлов с hash в имени: `Cache-Control: public, max-age=31536000, immutable`
**Выполнено**: Отдельный `express.static('/assets', { maxAge: '1y', immutable: true })` для Vite hashed assets. Остальная статика (index.html) — `maxAge: 0`.

### 15. ~~Browser pool pre-warm~~ DONE 24.02.2026
**Проблема**: Первый PDF после деплоя = 3-8 секунд на запуск Chromium.
**Файл**: `server.ts` (после `listen`)
**Решение**: `browserPool.warmup()` при старте сервера.
**Выполнено**: Экспорт `warmupBrowserPool()` из `browser-pool.ts`, вызов в `server.ts` после `app.listen` (non-blocking). Запускает browser + создаёт одну idle page.

### 16. ~~React Query staleTime~~ DONE (already configured)
**Проблема**: `staleTime=0` (дефолт). Каждая навигация Dashboard → Worksheet → Dashboard = 3 refetch. При 50 юзерах = сотни лишних запросов.
**Файлы**: QueryClient config или индивидуальные useQuery
**Решение**: `staleTime: 30_000` для списков, `60_000` для auth/me.
**Выполнено**: Глобальный `staleTime: 5 * 60 * 1000` (5 минут) + `refetchOnWindowFocus: false` уже установлены в `src/main.tsx`. Admin queries имеют собственные 30s staleTime.

### 17. ~~Redis failure — daily limit fail-open~~ DONE 24.02.2026
**Проблема**: `checkDailyGenerationLimit()` при недоступном Redis возвращает `allowed: false`. Все платные юзеры не могут генерировать. Молча.
**Файл**: `server/middleware/rate-limit.ts:310-335`
**Решение**: Fail-open с alert в логи + admin notification.
**Выполнено**: `checkDailyGenerationLimit` теперь возвращает `allowed: true` при Redis unavailable/error. Логирование через `console.error` с ALERT пометкой для мониторинга.

### 18. ~~Strip pdfBase64 из GET /worksheets/:id~~ DONE 24.02.2026
**Проблема**: Каждое открытие сохранённого листа тянет 200-400 KB base64 PDF внутри content JSON, даже если юзер не скачивает.
**Файл**: `server/routes/worksheets.ts`
**Решение**: Парсить JSON, удалять `pdfBase64` из content перед ответом. Отдельный endpoint `/worksheets/:id/pdf`.
**Выполнено**: `delete parsedContent.pdfBase64` в GET /:id. Новый endpoint `GET /api/worksheets/:id/pdf` возвращает только `{ pdfBase64 }`. Экономит 200-400 KB на каждом открытии.

### 19. ~~Browser pool — page recycling~~ DONE 24.02.2026
**Проблема**: После сотен рендеров Chromium page накапливает memory. 5 страниц × 200 рендеров = утечка RAM.
**Файл**: `api/_lib/browser-pool.ts`
**Решение**: Счётчик рендеров на page, после ~100 — close и создать новую.
**Выполнено**: WeakMap `renderCounts` отслеживает рендеры на page. После `MAX_RENDERS_PER_PAGE` (100, ENV-конфигурируемо) page закрывается и создаётся новая для ожидающих.

---

## P2 — ТЕХНИЧЕСКИЙ ДОЛГ (после стабилизации)

### 20. WorksheetsListPage + PresentationsListPage — 500 строк дублирования
~90% идентичный код: иконки, RenameModal, CreateFolderModal, Pagination, folder-логика.
**Решение**: Общие компоненты в `src/components/common/`. Параметризованный `useListPageState` хук.

### 21. AdminPaymentsPage — 1068 строк, 3x дублированная логика
Три вкладки с copy-paste Search/Pagination. Два разных Pagination в проекте.
**Решение**: `useSearchableTable` хук, единый `Pagination` компонент.

### 22. ~~admin-api.ts — 38 одинаковых error-handler блоков~~ DONE 04.04.2026
22 функции с идентичным `if (res.status === 401)` / `if (res.status === 403)`.
**Решение**: `adminFetch(url, options)` wrapper. Файл с 824 → ~400 строк.
**Выполнено**: `adminFetch<T>()` + `adminPost<T>()` + `buildAdminUrl()` — 3 хелпера заменили 38 дублированных блоков. 825 → 598 строк (-27%). Все экспорты и типы сохранены.

### 23. openai-provider.ts (892 строки) — god object
`generateWorksheet()` = 430 строк с 6 ответственностями. JSON repair 3-уровневый try-catch.
**Решение**: `JsonRepairUtil`, разделение на worksheet/presentation/task generators.

### 24. Presentation generators — base class
3 файла (770-860 строк) с дублированными `contentElementsToRows`, `addWatermark`, 10 slide-функций.
**Решение**: `BaseSlideGenerator` + `ThemeConfig`. 2400 → ~1000 строк.

### 25. ~~GeneratePresentationFormSchema дублирована~~ DONE 01.04.2026
Определена в `constants/generation.ts` и локально в `GeneratePresentationPage.tsx` с разницей в `.optional()`.
**Решение**: Удалить локальную, импортировать из constants.
**Выполнено**: Локальная схема удалена из `GeneratePresentationPage.tsx`, импортируется из `constants/generation.ts`. `themePreset` сделан required (формы всегда задают значение по умолчанию).

### 26. ~~`values as any` при вызове API (3 места)~~ DONE 01.04.2026
`GenerateFormValues` и `GeneratePayload` — разные типы, маскируются `as any`.
**Решение**: Явный маппинг `formValuesToPayload()` или унификация типов.
**Выполнено**: 6 `as any` убрано. Добавлены `formValuesToPayload()` и `presentationFormToPayload()` — явные type-safe mappers form→API. Дефолтные значения форм: `'' as any`/`0 as any` заменены на `undefined` (валидный `DeepPartial`).

### 27. ~~pdf-generator.ts — 20+ any вместо типов pdf-lib~~ DONE 04.04.2026
`page: any`, `font: any` вместо `PDFPage`, `PDFFont`.
**Решение**: Импорт типов из pdf-lib.
**Выполнено**: 20+ `any` заменены на `PDFPage` и `PDFFont` из pdf-lib. Импорт типов добавлен.

### 28. ~~Hardcoded magic numbers~~ DONE 01.04.2026
`generationsLeft: 5` в auth.ts (строки 388, 600) вместо `SUBSCRIPTION_PLANS.free.generationsPerPeriod`.
**Решение**: Импорт из shared/plans.ts.
**Выполнено**: 5 мест заменены на `SUBSCRIPTION_PLANS.free.generationsPerPeriod`: auth.ts (3 — Yandex callback, email verify, /me response), db/schema.ts (default), SubscriptionPlansModal.tsx (PLAN_GENERATIONS).

### 29. ~~auth.ts — findOrCreateUser не вынесен~~ DONE 04.04.2026
Логика создания юзера дублируется в Yandex callback и email verify.
**Решение**: Общая функция `findOrCreateUser(email, provider, updates)`.
**Выполнено**: `findOrCreateUser(params)` — единая функция: lookup, blocked check, insert/update. Yandex callback и email verify используют её. -4 строки, убрано дублирование ~50 строк.

### 30. ~~Иконки, Spinner, Pagination — нет общих компонентов~~ DONE 04.04.2026
3+ реализации Spinner, 2+ Pagination, иконки копируются в каждый файл.
**Решение**: `src/components/ui/` — Pagination, Spinner, Icons. (Или `lucide-react`.)
**Выполнено**: `Icons.tsx` (16 иконок), `LoadingSpinner.tsx` (Spinner + PageSpinner). 15 файлов обновлены, -463 строки. Pagination оставлен — 2 варианта слишком разные для единого компонента.

---

## P3 — ПОСЛЕ TIMEWEB (нужен нормальный Redis)

### 31. ~~Job queue (BullMQ)~~ DONE 24.02.2026
Полноценная очередь генерации с retry, dead letter queue, concurrency control.
BullMQ несовместим с Upstash — нужен стандартный Redis.
**Выполнено**: `server/lib/job-queue.ts` — 2 очереди (worksheet-generation, presentation-generation), in-process воркеры с `concurrency: MAX_CONCURRENT_GENERATIONS`. `server/lib/sse-bridge.ts` — BullMQ→SSE мост с 180s timeout. Feature flag `USE_BULLMQ=true` (default false), p-limit fallback при Redis unavailable. Graceful shutdown: closeQueues → closeBrowserPool → closeRedis.

### 32. ~~Redis-кэш пользователя в auth middleware~~ DONE 24.02.2026
Каждый запрос = SELECT из users. При 100 RPS = 100 DB-запросов/сек.
Redis cache на 5 минут с invalidation при изменении роли.
**Выполнено**: `server/lib/user-cache.ts` — getCachedUser/setCachedUser/invalidateUserCache (TTL 5 мин, fail-open). Auth middleware (`withAuth`, `optionalAuth`, `requireAdmin`) использует общую `resolveUser()` с кэш-проверкой перед DB. Инвалидация в admin/users.ts (block/unblock), billing-effects.ts (hasPaidAccess), billing-subscription-webhook.ts (подписка: активация, продление, истечение).

### 33. S3/filesystem для PDF — ОТЛОЖЕНО
`pdfBase64` в JSON-колонке БД. Колонка `pdf_url` уже есть в schema, но не используется.
Вынести в файловую систему или S3, в БД только URL.
**Решение**: pdfBase64 ~335KB — терпимо на текущем масштабе. Откладываем до >5000 пользователей.

### 34. ~~OTP коды — хеширование~~ DONE 24.02.2026
Сейчас plaintext в БД. При компрометации БД — можно читать OTP.
Bcrypt hash при сохранении, compare при проверке.
**Выполнено**: `server/routes/auth.ts` — send-code хеширует OTP через `bcrypt.hash(code, 10)`, verify-code проверяет через `bcrypt.compare()` (constant-time). Существующие plaintext коды истекают за 10 минут, миграция БД не нужна.

### 35. Webhook IP allowlisting
Prodamus webhooks проверяются только по HMAC. Добавить whitelist IP.

---

## Что УЖЕ хорошо

- **shared/** — единый источник типов, без дублирования frontend/backend
- **Config-driven generation** — новые предметы через конфиги
- **Browser pool** — реализован, переиспользование страниц
- **Compression middleware** — gzip с исключением SSE
- **Atomic decrement** — `WHERE generationsLeft >= cost` без race conditions
- **Refresh token rotation** с familyId + theft detection
- **Security headers** — HSTS, CSP, X-Frame-Options, Permissions-Policy
- **SQL injection prevention** — Drizzle ORM, parameterized queries
- **Webhook idempotency** — atomic INSERT с unique constraint
- **HMAC verification** — timing-safe comparison
- **PKCE** — в Yandex OAuth
- **No circular dependencies** — shared ← db ← api/_lib ← server (односторонне)
- **P2 рефакторинг выполнен** — pdf.ts, SlidePreview, billing, GeneratePage разбиты

---

## Оценка усилий

| Приоритет | Количество задач | Статус |
|-----------|-----------------|--------|
| P0 (блокирует) | 9 задач | **ВСЕ DONE** |
| P1 (важно) | 10 задач | **ВСЕ DONE** |
| P2 (долг) | 11 задач | **7 DONE** (#22, #25, #26, #27, #28, #29, #30), 4 запланировано |
| P3 (после Timeweb) | 5 задач | **3 DONE, 1 отложена, 1 запланирована** |

**P0 + P1 + P3 (критические) выполнены.** P2 — рефакторинг по мере роста. #22, #25, #26, #27, #28, #29, #30 выполнены. #33 (S3 для PDF) отложена — pdfBase64 ~335KB терпимо.
