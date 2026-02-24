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

### 2. DB pool увеличить до 20
**Проблема**: `max: 10` в `db/index.ts`. Одна генерация = 4-6 DB-операций. При 10 параллельных генерациях + API-запросы = pool exhaustion.
**Файл**: `db/index.ts`
**Решение**: `max: parseInt(process.env.DB_POOL_MAX || '20')`

### 3. Client disconnect detection (ghost generations)
**Проблема**: Юзер закрывает вкладку — AI-вызов продолжается, Puppeteer-слот занят, токены потрачены впустую. Нет `req.on('close')`.
**Файлы**: `server/routes/generate.ts`, `server/routes/presentations.ts`
**Решение**: `AbortController` + `req.on('close', () => abort())` + проверка `aborted` между шагами pipeline.

### 4. Frontend bundle splitting — lazy load страниц
**Проблема**: Все 11 страниц в одном бандле. pptxgenjs (1.3 MB) + KaTeX (300 KB) грузятся для всех.
**Файлы**: `src/App.tsx`, `vite.config.ts`
**Решение**: `React.lazy()` на все страницы кроме GeneratePage (лендинг). manualChunks в vite.config для vendor-библиотек.
**Эффект**: Начальный бандл -60-70%.

### 5. ~~Кеширование шрифта в PDF генерации~~ DONE 24.02.2026
**Проблема**: `loadFontAsBase64()` читает 2 файла с диска (300-400 KB каждый) и конвертирует в base64 **на каждый PDF**. При 20 генерациях = 40 чтений.
**Файл**: `api/_lib/pdf/fonts.ts`
**Решение**: Module-level cache: `let cachedFonts: {...} | null = null`, заполняется один раз.
**Выполнено**: Шрифт кешируется в `cachedFonts` при первом вызове, дальше берётся из памяти.

### 6. billing-effects.ts — TODO-заглушка возвращает success
**Проблема**: `applyProductEffect()` для `subscription` типа возвращает `{ success: true }` БЕЗ действий. Если вебхук попадёт в эту ветку — подписка не активируется, но ответ "успех".
**Файл**: `server/lib/billing-effects.ts:113-117`
**Решение**: Либо удалить subscription из PRODUCTS (подписки через отдельный `billing-subscription-webhook.ts`), либо реализовать логику.

### 7. ~~Admin router — глобальный withAdminAuth~~ DONE 24.02.2026
**Проблема**: Каждый файл в `server/routes/admin/` сам ставит `withAdminAuth` на каждый route. Забыл — публичный доступ к admin API.
**Файл**: `server/routes/admin/index.ts`
**Решение**: `router.use(requireAdmin)` на уровне роутера.
**Выполнено**: Добавлен `requireAdmin` middleware в `server/middleware/auth.ts`, подключён в `admin/index.ts`. Все admin routes защищены на уровне роутера.

### 8. select() без column projection — утечка полей
**Проблема**: В нескольких routes `.select()` без колонок тянет ВСЕ поля (provider, providerId, telegramChatId...). Не отдаётся клиенту напрямую, но risk при будущих изменениях.
**Файлы**: `server/routes/auth.ts:365,578`, `billing.ts:402`, `billing-webhook.ts:103`
**Решение**: Явные column projections: `.select({ id: users.id, email: users.email, ... })`

### 9. ~~Удалить legacy и мусор~~ DONE 24.02.2026
- `api/_lib/auth/middleware.ts` — legacy auth middleware, не используется, создаёт путаницу
- `nul` — артефактный файл Windows в корне
**Выполнено**: Оба файла удалены. Re-export в `api/_lib/auth/index.ts` заменён на комментарий.

---

## P1 — ВАЖНО (первая неделя)

### 10. SSE keepalive ping
**Проблема**: AI генерация 60-120 секунд. nginx/Cloudflare таймаут 60-75 сек idle. Без heartbeat proxy убьёт SSE.
**Файлы**: `server/routes/generate.ts`, `presentations.ts`
**Решение**: `setInterval(() => res.write(': ping\n\n'), 15000)` + cleanup в `finally`.

### 11. Revoke tokens при блокировке пользователя
**Проблема**: Admin блокирует юзера → access token живёт ещё до 1 часа, refresh token до 7 дней.
**Файл**: `server/routes/admin/users.ts`
**Решение**: При `deletedAt` вызвать `revokeAllUserTokens(userId)`.

### 12. Refresh token cleanup cron
**Проблема**: `cleanupExpiredTokens()` существует, но нигде не вызывается. Таблица `refresh_tokens` растёт бесконечно.
**Файл**: `api/_lib/auth/tokens.ts`
**Решение**: `setInterval(cleanupExpiredTokens, 6 * 60 * 60 * 1000)` в `server.ts`.

### 13. Composite DB indexes
**Проблема**: Самый частый запрос `WHERE user_id AND deleted_at IS NULL ORDER BY created_at DESC` использует 3 отдельных индекса вместо одного composite.
**Файл**: `db/schema.ts`
**Решение**: `index('worksheets_user_active_idx').on(worksheets.userId, worksheets.deletedAt, worksheets.createdAt)`

### 14. Static assets — immutable cache headers
**Проблема**: Vite генерирует файлы с content-hash, но `express.static` отдаёт `max-age=0`. Браузер перевалидирует на каждом визите.
**Файл**: `server.ts`
**Решение**: Для файлов с hash в имени: `Cache-Control: public, max-age=31536000, immutable`

### 15. Browser pool pre-warm
**Проблема**: Первый PDF после деплоя = 3-8 секунд на запуск Chromium.
**Файл**: `server.ts` (после `listen`)
**Решение**: `browserPool.warmup()` при старте сервера.

### 16. React Query staleTime
**Проблема**: `staleTime=0` (дефолт). Каждая навигация Dashboard → Worksheet → Dashboard = 3 refetch. При 50 юзерах = сотни лишних запросов.
**Файлы**: QueryClient config или индивидуальные useQuery
**Решение**: `staleTime: 30_000` для списков, `60_000` для auth/me.

### 17. Redis failure — daily limit fail-open
**Проблема**: `checkDailyGenerationLimit()` при недоступном Redis возвращает `allowed: false`. Все платные юзеры не могут генерировать. Молча.
**Файл**: `server/middleware/rate-limit.ts:310-335`
**Решение**: Fail-open с alert в логи + admin notification.

### 18. Strip pdfBase64 из GET /worksheets/:id
**Проблема**: Каждое открытие сохранённого листа тянет 200-400 KB base64 PDF внутри content JSON, даже если юзер не скачивает.
**Файл**: `server/routes/worksheets.ts`
**Решение**: Парсить JSON, удалять `pdfBase64` из content перед ответом. Отдельный endpoint `/worksheets/:id/pdf`.

### 19. Browser pool — page recycling
**Проблема**: После сотен рендеров Chromium page накапливает memory. 5 страниц × 200 рендеров = утечка RAM.
**Файл**: `api/_lib/browser-pool.ts`
**Решение**: Счётчик рендеров на page, после ~100 — close и создать новую.

---

## P2 — ТЕХНИЧЕСКИЙ ДОЛГ (после стабилизации)

### 20. WorksheetsListPage + PresentationsListPage — 500 строк дублирования
~90% идентичный код: иконки, RenameModal, CreateFolderModal, Pagination, folder-логика.
**Решение**: Общие компоненты в `src/components/common/`. Параметризованный `useListPageState` хук.

### 21. AdminPaymentsPage — 1068 строк, 3x дублированная логика
Три вкладки с copy-paste Search/Pagination. Два разных Pagination в проекте.
**Решение**: `useSearchableTable` хук, единый `Pagination` компонент.

### 22. admin-api.ts — 38 одинаковых error-handler блоков
22 функции с идентичным `if (res.status === 401)` / `if (res.status === 403)`.
**Решение**: `adminFetch(url, options)` wrapper. Файл с 824 → ~400 строк.

### 23. openai-provider.ts (892 строки) — god object
`generateWorksheet()` = 430 строк с 6 ответственностями. JSON repair 3-уровневый try-catch.
**Решение**: `JsonRepairUtil`, разделение на worksheet/presentation/task generators.

### 24. Presentation generators — base class
3 файла (770-860 строк) с дублированными `contentElementsToRows`, `addWatermark`, 10 slide-функций.
**Решение**: `BaseSlideGenerator` + `ThemeConfig`. 2400 → ~1000 строк.

### 25. GeneratePresentationFormSchema дублирована
Определена в `constants/generation.ts` и локально в `GeneratePresentationPage.tsx` с разницей в `.optional()`.
**Решение**: Удалить локальную, импортировать из constants.

### 26. `values as any` при вызове API (3 места)
`GenerateFormValues` и `GeneratePayload` — разные типы, маскируются `as any`.
**Решение**: Явный маппинг `formValuesToPayload()` или унификация типов.

### 27. pdf-generator.ts — 20+ any вместо типов pdf-lib
`page: any`, `font: any` вместо `PDFPage`, `PDFFont`.
**Решение**: Импорт типов из pdf-lib.

### 28. Hardcoded magic numbers
`generationsLeft: 5` в auth.ts (строки 388, 600) вместо `SUBSCRIPTION_PLANS.free.generationsPerPeriod`.
**Решение**: Импорт из shared/plans.ts.

### 29. auth.ts — findOrCreateUser не вынесен
Логика создания юзера дублируется в Yandex callback и email verify.
**Решение**: Общая функция `findOrCreateUser(email, provider, updates)`.

### 30. Иконки, Spinner, Pagination — нет общих компонентов
3+ реализации Spinner, 2+ Pagination, иконки копируются в каждый файл.
**Решение**: `src/components/ui/` — Pagination, Spinner, Icons. (Или `lucide-react`.)

---

## P3 — ПОСЛЕ TIMEWEB (нужен нормальный Redis)

### 31. Job queue (BullMQ)
Полноценная очередь генерации с retry, dead letter queue, concurrency control.
BullMQ несовместим с Upstash — нужен стандартный Redis.

### 32. Redis-кэш пользователя в auth middleware
Каждый запрос = SELECT из users. При 100 RPS = 100 DB-запросов/сек.
Redis cache на 5 минут с invalidation при изменении роли.

### 33. S3/filesystem для PDF
`pdfBase64` в JSON-колонке БД. Колонка `pdf_url` уже есть в schema, но не используется.
Вынести в файловую систему или S3, в БД только URL.

### 34. OTP коды — хеширование
Сейчас plaintext в БД. При компрометации БД — можно читать OTP.
Bcrypt hash при сохранении, compare при проверке.

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

| Приоритет | Количество задач | Примерно |
|-----------|-----------------|----------|
| P0 (блокирует) | 9 задач | 1-2 дня |
| P1 (важно) | 10 задач | 2-3 дня |
| P2 (долг) | 11 задач | 3-5 дней |
| P3 (после Timeweb) | 5 задач | 2-3 дня |

**Минимум до деплоя: P0 (1-2 дня)**. P1 — первая неделя после запуска. P2/P3 — по мере роста.
