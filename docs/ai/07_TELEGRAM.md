# 07. Telegram Integration

## Summary

Telegram integration includes a Bot API wrapper, webhook endpoint, command processor, and admin alert settings/notifications.

## Components

| Component | Location | Purpose |
|---|---|---|
| Webhook route | `server/routes/telegram.ts` | receives Telegram updates |
| Bot API wrapper | `api/_lib/telegram/bot.ts` | sends messages, verifies webhook token |
| Commands | `api/_lib/telegram/commands.ts` | processes incoming Telegram updates/commands |
| Public export | `api/_lib/telegram/index.ts` | integration exports |
| Webhook setup script | `scripts/setup-telegram-webhook.ts` | set/info/delete webhook via Telegram API |
| Admin settings API | `server/routes/admin/settings.ts` | save/delete Telegram chat for alerts |
| Alerts | `api/_lib/alerts/generation-alerts.ts` | generation/admin notifications |
| Admin UI | `src/pages/admin/AdminSettingsPage.tsx` | configuration screen |

## Webhook

- Route: `POST /api/telegram/webhook`.
- Secret: `TELEGRAM_WEBHOOK_SECRET`.
- Telegram setup script documents URL pattern: `https://uchion.ru/api/telegram/webhook`.

## Bot API

- Base API: `https://api.telegram.org/bot`.
- Token: `TELEGRAM_BOT_TOKEN`.
- Primary action found: send messages and process updates.

## Business API

Telegram Business API integration was **not found**. Only standard Bot API usage was found.

## Commands and events

Command processing is located in `api/_lib/telegram/commands.ts`. Before changing commands, inspect this file and verify DB access against `users` fields (`telegramChatId`, `wantsAlerts`).

## Notifications

Admin/generation alerts can be sent to Telegram when an admin stores chat settings. Alert metrics/test endpoints exist under `/api/admin/alerts/*`.

## Settings and secrets

| Env | Purpose | Required? |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | bot token for Telegram Bot API | required for sending/commands |
| `TELEGRAM_WEBHOOK_SECRET` | webhook verification secret | recommended/used by webhook route |

No real secret values should be committed.

## Middleware/security

Webhook route performs secret token validation using env. In `server.ts`, webhook paths bypass some CORS/origin checks because providers call server-to-server.
