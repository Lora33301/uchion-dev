// ==================== ADMIN API ====================

// Types for admin API responses
export interface AdminStats {
  totalUsers: number
  todayGenerations: number
  activeSubscriptions: number
  totalGenerations: number
  uptimeSeconds: number
  serverStartedAt: string
}

export interface AdminUser {
  id: string
  email: string
  name: string | null
  image: string | null
  role: 'user' | 'admin'
  provider: string | null
  providerId: string | null
  generationsLeft: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  isBlocked: boolean
  generationsCount: number
  worksheetsCount: number
}

export interface AdminUserDetail extends AdminUser {
  subscription: {
    plan: 'free' | 'basic' | 'premium'
    status: 'active' | 'canceled' | 'expired' | 'trial'
    expiresAt: string | null
  }
}

export interface AdminGeneration {
  id: string
  userId: string
  userEmail: string | null
  userName: string | null
  subject: 'math' | 'algebra' | 'geometry' | 'russian'
  grade: number
  topic: string
  title: string | null
  difficulty: 'easy' | 'medium' | 'hard'
  createdAt: string
}

export interface AdminPayment {
  id: string
  userId: string
  userEmail: string | null
  userName: string | null
  amount: number
  status: 'pending' | 'succeeded' | 'failed' | 'refunded'
  providerPaymentId: string | null
  createdAt: string
}

export interface AdminWorksheet {
  id: string
  subject: 'math' | 'algebra' | 'geometry' | 'russian'
  grade: number
  topic: string
  title: string | null
  createdAt: string
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ==================== FETCH HELPERS ====================

/**
 * Wrapper around fetch for admin API calls.
 * Handles auth errors (401/403) and extracts error messages from response body.
 */
async function adminFetch<T>(url: string, init?: RequestInit & { fallbackError?: string }): Promise<T> {
  const { fallbackError = 'Ошибка запроса', ...fetchInit } = init || {}
  const res = await fetch(url, { credentials: 'include', ...fetchInit })

  if (!res.ok) {
    if (res.status === 401) throw new Error('Требуется авторизация')
    if (res.status === 403) throw new Error('Нет доступа к админ-панели')
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || data.message || fallbackError)
  }

  return res.json()
}

function adminPost<T>(url: string, body?: unknown, fallbackError?: string): Promise<T> {
  return adminFetch<T>(url, {
    method: 'POST',
    ...(body != null && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    fallbackError,
  })
}

function buildAdminUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams()
  if (params) {
    for (const [key, val] of Object.entries(params)) {
      if (val) sp.set(key, String(val))
    }
  }
  const qs = sp.toString()
  return qs ? `${path}?${qs}` : path
}

// ==================== STATS ====================

export async function fetchAdminStats(): Promise<AdminStats> {
  const data = await adminFetch<{ stats: AdminStats }>('/api/admin/stats', {
    fallbackError: 'Не удалось загрузить статистику',
  })
  return data.stats
}

// ==================== USERS ====================

export interface FetchAdminUsersOptions {
  page?: number
  limit?: number
  search?: string
  status?: 'all' | 'active' | 'blocked'
  sortBy?: 'createdAt' | 'email' | 'name'
  sortOrder?: 'asc' | 'desc'
}

export interface FetchAdminUsersResponse {
  users: AdminUser[]
  pagination: Pagination
}

export function fetchAdminUsers(options?: FetchAdminUsersOptions): Promise<FetchAdminUsersResponse> {
  return adminFetch(
    buildAdminUrl('/api/admin/users', options as Record<string, string | number | undefined>),
    { fallbackError: 'Не удалось загрузить список пользователей' },
  )
}

export interface FetchAdminUserDetailResponse {
  user: AdminUserDetail
  generations: AdminGeneration[]
  worksheets: AdminWorksheet[]
}

export function fetchAdminUserDetail(userId: string): Promise<FetchAdminUserDetailResponse> {
  return adminFetch(`/api/admin/users/${userId}`, {
    fallbackError: 'Не удалось загрузить данные пользователя',
  })
}

// ==================== BLOCK/UNBLOCK ====================

export function blockUser(userId: string): Promise<void> {
  return adminPost(`/api/admin/users/${userId}/block`, undefined, 'Не удалось заблокировать пользователя')
}

export function unblockUser(userId: string): Promise<void> {
  return adminPost(`/api/admin/users/${userId}/unblock`, undefined, 'Не удалось разблокировать пользователя')
}

// ==================== GENERATIONS ====================

export type SubjectFilter = 'all' | 'math' | 'algebra' | 'geometry' | 'russian'

export interface FetchAdminGenerationsOptions {
  page?: number
  limit?: number
  subject?: SubjectFilter
  search?: string
}

export interface FetchAdminGenerationsResponse {
  generations: AdminGeneration[]
  pagination: Pagination
}

export function fetchAdminGenerations(options?: FetchAdminGenerationsOptions): Promise<FetchAdminGenerationsResponse> {
  return adminFetch(
    buildAdminUrl('/api/admin/generations', options as Record<string, string | number | undefined>),
    { fallbackError: 'Не удалось загрузить список генераций' },
  )
}

// ==================== GENERATION ERROR LOGS ====================

export interface GenerationLog {
  id: string
  userId: string
  userEmail: string | null
  userName: string | null
  subject: 'math' | 'algebra' | 'geometry' | 'russian' | null
  grade: number | null
  topic: string | null
  errorMessage: string | null
  createdAt: string
}

export interface FetchGenerationLogsOptions {
  page?: number
  limit?: number
  search?: string
}

export interface FetchGenerationLogsResponse {
  logs: GenerationLog[]
  pagination: Pagination
}

export function fetchGenerationLogs(options?: FetchGenerationLogsOptions): Promise<FetchGenerationLogsResponse> {
  return adminFetch(
    buildAdminUrl('/api/admin/generation-logs', options as Record<string, string | number | undefined>),
    { fallbackError: 'Не удалось загрузить логи генераций' },
  )
}

// ==================== PAYMENTS ====================

export type PaymentStatusFilter = 'all' | 'pending' | 'succeeded' | 'failed' | 'refunded'

export interface FetchAdminPaymentsOptions {
  page?: number
  limit?: number
  status?: PaymentStatusFilter
  search?: string
}

export interface FetchAdminPaymentsResponse {
  payments: AdminPayment[]
  pagination: Pagination
}

export function fetchAdminPayments(options?: FetchAdminPaymentsOptions): Promise<FetchAdminPaymentsResponse> {
  return adminFetch(
    buildAdminUrl('/api/admin/payments', options as Record<string, string | number | undefined>),
    { fallbackError: 'Не удалось загрузить список платежей' },
  )
}

// ==================== STUCK GENERATIONS ====================

export interface StuckGeneration {
  id: string
  userId: string
  userEmail: string | null
  userName: string | null
  subject: 'math' | 'algebra' | 'geometry' | 'russian' | null
  grade: number | null
  topic: string | null
  startedAt: string | null
  createdAt: string
}

export function fetchStuckGenerations(): Promise<{ stuckGenerations: StuckGeneration[] }> {
  return adminFetch('/api/admin/stuck-generations', {
    fallbackError: 'Не удалось загрузить зависшие генерации',
  })
}

export function forceFailGeneration(id: string, refund: boolean = true): Promise<{ success: boolean; refunded: boolean }> {
  return adminPost(`/api/admin/stuck-generations/${id}/force-fail`, { refund }, 'Не удалось завершить генерацию')
}

// ==================== PAYMENT INTENTS ====================

export type PaymentIntentStatusFilter = 'all' | 'created' | 'paid' | 'failed' | 'expired'

export interface AdminPaymentIntent {
  id: string
  userId: string
  userEmail: string | null
  userName: string | null
  productCode: string
  amount: number
  currency: string
  status: 'created' | 'paid' | 'failed' | 'expired'
  provider: string
  providerOrderId: string
  providerPaymentId: string | null
  createdAt: string
  paidAt: string | null
  expiresAt: string | null
}

export interface FetchPaymentIntentsOptions {
  page?: number
  limit?: number
  status?: PaymentIntentStatusFilter
  search?: string
}

export interface FetchPaymentIntentsResponse {
  paymentIntents: AdminPaymentIntent[]
  pagination: Pagination
}

export function fetchPaymentIntents(options?: FetchPaymentIntentsOptions): Promise<FetchPaymentIntentsResponse> {
  return adminFetch(
    buildAdminUrl('/api/admin/payment-intents', options as Record<string, string | number | undefined>),
    { fallbackError: 'Не удалось загрузить платежные интенты' },
  )
}

export function applyPaymentIntent(id: string): Promise<{ success: boolean; message: string }> {
  return adminPost(`/api/admin/payment-intents/${id}/apply`, undefined, 'Не удалось применить оплату')
}

// ==================== WEBHOOK EVENTS ====================

export interface AdminWebhookEvent {
  id: string
  provider: string
  eventKey: string
  rawPayloadHash: string
  processedAt: string
  createdAt: string
}

export interface FetchWebhookEventsOptions {
  page?: number
  limit?: number
  provider?: string
}

export interface FetchWebhookEventsResponse {
  webhookEvents: AdminWebhookEvent[]
  pagination: Pagination
}

export function fetchWebhookEvents(options?: FetchWebhookEventsOptions): Promise<FetchWebhookEventsResponse> {
  return adminFetch(
    buildAdminUrl('/api/admin/webhook-events', options as Record<string, string | number | undefined>),
    { fallbackError: 'Не удалось загрузить вебхук-события' },
  )
}

// ==================== SUBSCRIPTIONS ====================

export type SubscriptionStatusFilter = 'all' | 'active' | 'past_due' | 'cancelled' | 'expired'

export interface AdminSubscription {
  id: string
  userId: string
  userEmail: string | null
  userName: string | null
  plan: string
  status: string
  prodamusSubscriptionId: string | null
  prodamusProfileId: string | null
  generationsPerPeriod: number
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  customerEmail: string | null
  customerPhone: string | null
  cancelledAt: string | null
  createdAt: string
  updatedAt: string
}

export interface FetchSubscriptionsOptions {
  page?: number
  limit?: number
  status?: SubscriptionStatusFilter
  search?: string
}

export interface FetchSubscriptionsResponse {
  subscriptions: AdminSubscription[]
  pagination: Pagination
}

export function fetchSubscriptions(options?: FetchSubscriptionsOptions): Promise<FetchSubscriptionsResponse> {
  return adminFetch(
    buildAdminUrl('/api/admin/subscriptions', options as Record<string, string | number | undefined>),
    { fallbackError: 'Не удалось загрузить подписки' },
  )
}

export function formatSubscriptionStatus(status: string): string {
  switch (status) {
    case 'active': return 'Активна'
    case 'past_due': return 'Просрочена'
    case 'cancelled': return 'Отменена'
    case 'expired': return 'Истекла'
    default: return status
  }
}

export function formatPlanName(plan: string): string {
  switch (plan) {
    case 'starter': return 'Начинающий'
    case 'teacher': return 'Методист'
    case 'expert': return 'Эксперт'
    case 'free': return 'Бесплатный'
    default: return plan
  }
}

// ==================== TRENDS ====================

export interface TrendPoint {
  date: string
  count: number
}

export interface RevenueTrendPoint {
  date: string
  revenue: number
  transactions: number
}

export function fetchSubscriberTrend(days: number = 30): Promise<{ trend: TrendPoint[] }> {
  return adminFetch(`/api/admin/stats/subscriber-trend?days=${days}`, {
    fallbackError: 'Не удалось загрузить тренд подписчиков',
  })
}

export function fetchRevenueTrend(days: number = 30): Promise<{ trend: RevenueTrendPoint[] }> {
  return adminFetch(`/api/admin/stats/revenue-trend?days=${days}`, {
    fallbackError: 'Не удалось загрузить тренд выручки',
  })
}

// ==================== SETTINGS ====================

export interface AdminSettings {
  telegramChatId: string | null
  wantsAlerts: boolean
}

export function fetchAdminSettings(): Promise<AdminSettings> {
  return adminFetch('/api/admin/settings', { fallbackError: 'Не удалось загрузить настройки' })
}

export function updateTelegramChatId(chatId: string): Promise<AdminSettings> {
  return adminPost('/api/admin/settings/telegram', { chatId }, 'Не удалось сохранить Chat ID')
}

export function removeTelegramChatId(): Promise<AdminSettings> {
  return adminFetch('/api/admin/settings/telegram', {
    method: 'DELETE',
    fallbackError: 'Не удалось отключить Telegram',
  })
}

export function sendTestAlert(message?: string): Promise<{ success: boolean; sentCount: number; message: string }> {
  return adminPost('/api/admin/test-alert', { level: 'info', message }, 'Не удалось отправить тестовый алерт')
}

// ==================== AI COSTS ====================

export interface AICostsByModel {
  model: string
  costRubles: number
  calls: number
  promptTokens: number
  completionTokens: number
}

export interface AICostsByCallType {
  callType: string
  costRubles: number
  calls: number
}

export interface AICostsSummary {
  totalCostRubles: number
  totalCalls: number
  totalPromptTokens: number
  totalCompletionTokens: number
  costByModel: AICostsByModel[]
  costByCallType: AICostsByCallType[]
}

export interface AICostsDaily {
  date: string
  costRubles: number
  calls: number
}

export function fetchAICostsSummary(period: 'today' | 'week' | 'month' | 'all' = 'month'): Promise<AICostsSummary> {
  return adminFetch(`/api/admin/ai-costs/summary?period=${period}`, {
    fallbackError: 'Не удалось загрузить данные о расходах AI',
  })
}

export function fetchAICostsDaily(days: number = 30): Promise<{ daily: AICostsDaily[] }> {
  return adminFetch(`/api/admin/ai-costs/daily?days=${days}`, {
    fallbackError: 'Не удалось загрузить данные о расходах AI',
  })
}

// ==================== HELPERS ====================

export function formatProviderName(provider: string | null): string {
  if (!provider) return 'Неизвестно'
  const names: Record<string, string> = {
    yandex: 'Яндекс',
    telegram: 'Telegram',
  }
  return names[provider] || provider
}

export function formatRoleName(role: string): string {
  const names: Record<string, string> = {
    user: 'Пользователь',
    admin: 'Администратор',
  }
  return names[role] || role
}

export function formatGenerationStatus(status: string): string {
  const names: Record<string, string> = {
    pending: 'Ожидание',
    processing: 'Обработка',
    completed: 'Завершено',
    failed: 'Ошибка',
  }
  return names[status] || status
}

export function formatPaymentStatus(status: string): string {
  const names: Record<string, string> = {
    pending: 'Ожидание',
    succeeded: 'Успешно',
    failed: 'Ошибка',
    refunded: 'Возврат',
  }
  return names[status] || status
}

export function formatPaymentIntentStatus(status: string): string {
  const names: Record<string, string> = {
    created: 'Создан',
    paid: 'Оплачен',
    failed: 'Ошибка',
    expired: 'Истёк',
  }
  return names[status] || status
}

export function formatSubjectName(subject: string | null): string {
  if (!subject) return 'Неизвестно'
  const names: Record<string, string> = {
    math: 'Математика',
    russian: 'Русский язык',
  }
  return names[subject] || subject
}

export function formatDifficulty(difficulty: string | null): string {
  if (!difficulty) return 'Средний'
  const names: Record<string, string> = {
    easy: 'Лёгкий',
    medium: 'Средний',
    hard: 'Сложный',
  }
  return names[difficulty] || difficulty
}

export function formatAmount(kopecks: number): string {
  const rubles = kopecks / 100
  return rubles.toLocaleString('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
