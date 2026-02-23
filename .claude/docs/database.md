# Database Schema (`db/schema.ts`)

PostgreSQL + Drizzle ORM. 12 tables.

## Tables

### users
Core user table. Fields: id, role ('user'|'admin'), provider ('yandex'|'email'), providerId, email, name, avatarUrl, generationsLeft, subscriptionPlan ('free'|'starter'|'teacher'|'expert'), hasPaidAccess (bool, true if user bought a generation pack), telegramChatId, wantsAlerts, createdAt, updatedAt, deletedAt.

### folders
Hierarchical folders for worksheets and presentations. Fields: id, userId, name, parentId (self-ref), color, sortOrder, createdAt, updatedAt, deletedAt.

### worksheets
Saved worksheets. Fields: id, userId, folderId, subject, grade, topic, difficulty, content (JSON), pdfBase64, createdAt, updatedAt, deletedAt.

### generations
Generation log. Fields: id, userId, subject, grade, topic, difficulty, format, status ('pending'|'completed'|'failed'), errorMessage, startedAt, completedAt.

### subscriptions
Active subscriptions. Fields: id, userId, plan ('starter'|'teacher'|'expert'), status ('active'|'past_due'|'cancelled'|'expired'), prodamusSubscriptionId, prodamusProfileId, generationsPerPeriod, currentPeriodStart, currentPeriodEnd, customerEmail, customerPhone, createdAt, updatedAt.

### payments
Payment records. Fields: id, userId, amount (in kopecks), status, provider, providerPaymentId, createdAt.

### payment_intents
Prodamus payment intents. Fields: id, userId, productCode (e.g. `sub_starter`), providerOrderId, metadata (JSON), status, createdAt, updatedAt.
Also stores pending subscription intents (productCode: `sub_<plan>`).

### webhook_events
Webhook idempotency. Fields: id, provider, eventKey (unique with provider), rawPayloadHash, processedAt, createdAt.
Unique constraint: `(provider, event_key)`.

### refresh_tokens
JWT refresh tokens with family tracking. Fields: id, userId, jti, familyId, revokedAt, expiresAt, createdAt.

### email_codes
OTP codes for email authentication. Fields: id, email, code, expiresAt (10 min), attempts (max 5), usedAt, createdAt.

### presentations
Saved presentations. Fields: id, userId, folderId, subject, grade, topic, themeType, themePreset ('professional'|'educational'|'minimal'|'scientific'|'kids'|'school'), slideCount, structure (JSON), pptxBase64, createdAt, updatedAt.

### ai_usage
AI call tracking. Fields: id, sessionId, callType, model, promptTokens, completionTokens, costKopecks, durationMs, createdAt.

## Patterns

- **Soft delete**: `deletedAt` column on users, folders, worksheets
- **Drizzle ORM error codes**: use `error.cause.code` (wrapped errors), NOT `error.code`
- **Amounts**: payments stored in kopecks (integer)
- **JSON columns**: worksheet content, presentation structure, payment_intent metadata
