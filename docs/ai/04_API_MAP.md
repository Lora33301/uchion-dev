# 04. API Map

Base URL for backend routes: `/api`.

## Auth (`/api/auth`)

| Method | Route | Назначение | Принимает | Возвращает | Сервисы/таблицы |
|---|---|---|---|---|---|
| GET | `/me` | текущий пользователь | cookies/access token | user или anonymous | `users`, auth cookies/JWT |
| POST | `/logout` | выход | cookies | success | `refresh_tokens`, cookies |
| POST | `/refresh` | обновить access token | refresh cookie | new auth cookies/user | `refresh_tokens`, JWT |
| GET | `/yandex/redirect` | начать OAuth | query/referrer | redirect | Yandex OAuth env |
| GET | `/yandex/callback` | OAuth callback | `code`, state/query | redirect/login | Yandex API, `users`, `refresh_tokens` |
| POST | `/email/send-code` | отправить email OTP | `email`, optional consent/referral | success/rate info | UniSender, `email_codes`, rate-limit |
| POST | `/email/verify-code` | проверить OTP | `email`, `code` | auth cookies/user | `email_codes`, `users`, `refresh_tokens` |
| POST | `/claim-telegram-bonus` | начислить бонус за TG | auth | updated user/bonus | `users` |

## Generation (`/api/generate`)

| Method | Route | Назначение | Принимает | Возвращает | Сервисы/таблицы |
|---|---|---|---|---|---|
| POST | `/` | сгенерировать worksheet | subject/grade/topic/difficulty/options | worksheet data, often streaming/SSE path | AI, optional BullMQ, `users`, `worksheets`, `generations`, `ai_usage` |
| POST | `/regenerate-task` | перегенерировать отдельное задание | worksheet/task context | updated task/content | AI, `worksheets`, `ai_usage` |
| POST | `/rebuild-pdf` | пересобрать PDF | worksheet content/style | PDF/url/base64 result | PDF renderer, optional auth |

## Worksheets (`/api/worksheets`)

| Method | Route | Назначение | Принимает | Возвращает | Таблицы |
|---|---|---|---|---|---|
| GET | `/` | список worksheets пользователя | pagination/filter/folder | list + meta | `worksheets`, `folders` |
| GET | `/:id` | получить worksheet | id | worksheet | `worksheets` |
| GET | `/:id/pdf` | скачать/получить PDF | id | PDF response | `worksheets`, PDF renderer |
| PATCH | `/:id` | обновить title/folder/content metadata | partial fields | updated worksheet | `worksheets`, `folders` |
| DELETE | `/:id` | soft delete | id | success | `worksheets` |

## Presentations (`/api/presentations`)

| Method | Route | Назначение | Принимает | Возвращает | Таблицы/сервисы |
|---|---|---|---|---|---|
| POST | `/generate` | сгенерировать презентацию | subject/grade/topic/theme/slideCount | presentation/PPTX data | AI, PPTX, optional BullMQ, `users`, `presentations`, `ai_usage` |
| GET | `/` | список презентаций | pagination/filter/folder | list + meta | `presentations`, `folders` |
| GET | `/:id` | получить презентацию | id | presentation | `presentations` |
| PATCH | `/:id` | обновить metadata/folder | partial fields | updated presentation | `presentations`, `folders` |
| DELETE | `/:id` | удалить презентацию | id | success | `presentations` |

## Folders (`/api/folders`)

| Method | Route | Назначение | Принимает | Возвращает | Таблицы |
|---|---|---|---|---|---|
| GET | `/` | список папок | filters | folders | `folders`, counts from materials |
| POST | `/` | создать папку | name/color/parent | folder | `folders` |
| GET | `/:id` | получить папку | id | folder | `folders` |
| PATCH | `/:id` | переименовать/изменить | partial folder | folder | `folders` |
| DELETE | `/:id` | soft delete folder | id | success | `folders`, materials folder links |

## Billing (`/api/billing`)

| Method | Route | Назначение | Принимает | Возвращает | Таблицы/сервисы |
|---|---|---|---|---|---|
| GET | `/subscription-plans` | публичный список тарифов | none | plans | `shared/plans` |
| GET | `/products` | продукты пакетов | none | products | billing config |
| POST | `/prodamus/create-link` | создать payment link | product/customer | pay URL/order | Prodamus, `payment_intents`, `users` |
| POST | `/create-subscription-link` | создать subscription link | plan/customer | pay URL/order | Prodamus, `payment_intents`, `subscriptions` |
| POST | `/cancel-subscription` | отменить подписку | auth | status | Prodamus, `subscriptions`, `users` |
| GET | `/payment-status/:orderId` | проверить статус оплаты | orderId | status | `payment_intents`, `subscriptions` |
| POST | `/webhook` | primary Prodamus webhook | raw payload/signature | ok/error | Prodamus, `webhook_events`, payment tables |
| POST | `/prodamus/webhook` | legacy webhook path | raw payload/signature | ok/error | same |
| GET | `/prodamus/test-payment` | dev-only test form | development only | HTML | no production use |

## Telegram (`/api/telegram`)

| Method | Route | Назначение | Принимает | Возвращает | Сервисы/таблицы |
|---|---|---|---|---|---|
| POST | `/webhook` | Telegram update webhook | Telegram update JSON + secret header | `{ok:true}` | Telegram commands, `users` |

## Public/Health

| Method | Route | Назначение | Возвращает | Таблицы |
|---|---|---|---|---|
| GET | `/api/health` | health check | status JSON | none |
| GET | `/api/pdf` | PDF subsystem check | status JSON | none |
| GET | `/api/public/stats` | публичная статистика | counts | `users`, `worksheets`/materials |

## Admin (`/api/admin`)

All admin routes require admin authentication.

| Method | Route | Назначение | Таблицы/сервисы |
|---|---|---|---|
| GET | `/users` | список пользователей | `users`, subscriptions/counts |
| GET | `/users/:id` | карточка пользователя | `users`, related tables |
| POST | `/users/:id/referral-code` | создать/обновить referral code | `users` |
| GET | `/users/:id/referrals` | рефералы пользователя | `users` |
| POST | `/users/:id/block` | заблокировать пользователя | `users` |
| POST | `/users/:id/unblock` | разблокировать | `users` |
| POST | `/users/:id/grant-generations` | выдать генерации | `users` |
| POST | `/users/:id/change-plan` | сменить план | `users`, `subscriptions` |
| DELETE | `/users/:id/purge` | удалить данные пользователя | many tables; destructive |
| GET | `/payments` | legacy payments | `payments`, `users` |
| GET | `/payment-intents` | payment intents | `payment_intents` |
| GET | `/webhook-events` | webhook log | `webhook_events` |
| GET | `/subscriptions` | subscriptions | `subscriptions`, `users` |
| GET | `/generations` | generation history | `generations`, `worksheets`, `users` |
| GET | `/stats` | dashboard stats | multiple tables |
| GET | `/stats/subscriber-trend` | subscription trend | `subscriptions` |
| GET | `/stats/revenue-trend` | revenue trend | payment tables |
| GET | `/ai-costs/summary` | AI cost summary | `ai_usage` |
| GET | `/ai-costs/daily` | AI cost daily breakdown | `ai_usage` |
| GET | `/settings` | admin settings | `users` for telegram settings |
| POST | `/settings/telegram` | save Telegram alert settings | `users`, Telegram API optional |
| DELETE | `/settings/telegram` | remove Telegram alert settings | `users` |
| POST | `/alerts/test-alert` | send test alert | Telegram/alerts |
| GET | `/alerts/metrics` | alert metrics | in-memory/alerts module |
| POST | `/alerts/reset` | reset metrics | alerts module |
| POST | `/alerts/reset-cooldowns` | reset cooldowns | alerts module |
| POST | `/alerts/test/error-rate` | simulate alert | alerts module |
| POST | `/alerts/test/timeout` | simulate alert | alerts module |
| POST | `/alerts/test/low-quality` | simulate alert | alerts module |
