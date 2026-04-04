import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchAdminPayments,
  fetchPaymentIntents,
  fetchWebhookEvents,
  fetchSubscriptions,
  applyPaymentIntent,
  formatPaymentStatus,
  formatPaymentIntentStatus,
  formatSubscriptionStatus,
  formatPlanName,
  formatAmount,
  formatDateTime,
  type PaymentStatusFilter,
  type PaymentIntentStatusFilter,
  type SubscriptionStatusFilter,
} from '../../lib/admin-api'
import { useSearchableTable } from '../../hooks/useSearchableTable'
import { AdminSearchBar } from '../../components/admin/AdminSearchBar'
import { AdminStatusTabs, type StatusTab } from '../../components/admin/AdminStatusTabs'
import { AdminPagination } from '../../components/admin/AdminPagination'
import { Spinner } from '../../components/ui/LoadingSpinner'

// ==================== ICONS (page-specific) ====================

function CurrencyIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
    </svg>
  )
}

function WebhookIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  )
}

function ArchiveIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
    </svg>
  )
}

function SubscriptionIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
    </svg>
  )
}

// ==================== STATUS CONFIGS ====================

type ViewMode = 'intents' | 'subscriptions' | 'webhooks' | 'legacy'

const intentStatusTabs: StatusTab<PaymentIntentStatusFilter>[] = [
  { value: 'all', label: 'Все', color: 'bg-slate-700' },
  { value: 'created', label: 'Создан', color: 'bg-amber-500' },
  { value: 'paid', label: 'Оплачен', color: 'bg-emerald-500' },
  { value: 'failed', label: 'Ошибка', color: 'bg-red-500' },
  { value: 'expired', label: 'Истёк', color: 'bg-slate-500' },
]

const subStatusTabs: StatusTab<SubscriptionStatusFilter>[] = [
  { value: 'all', label: 'Все', color: 'bg-slate-700' },
  { value: 'active', label: 'Активные', color: 'bg-emerald-500' },
  { value: 'past_due', label: 'Просроченные', color: 'bg-amber-500' },
  { value: 'cancelled', label: 'Отменённые', color: 'bg-red-500' },
  { value: 'expired', label: 'Истёкшие', color: 'bg-slate-500' },
]

const legacyStatusTabs: StatusTab<PaymentStatusFilter>[] = [
  { value: 'all', label: 'Все', color: 'bg-slate-700' },
  { value: 'succeeded', label: 'Успешные', color: 'bg-emerald-500' },
  { value: 'pending', label: 'Ожидание', color: 'bg-amber-500' },
  { value: 'failed', label: 'Ошибки', color: 'bg-red-500' },
  { value: 'refunded', label: 'Возвраты', color: 'bg-purple-500' },
]

// ==================== BADGE HELPERS ====================

function getIntentStatusBadgeStyle(status: string) {
  switch (status) {
    case 'paid': return 'bg-emerald-100 text-emerald-700'
    case 'created': return 'bg-amber-100 text-amber-700'
    case 'failed': return 'bg-red-100 text-red-700'
    case 'expired': return 'bg-slate-100 text-slate-600'
    default: return 'bg-slate-100 text-slate-600'
  }
}

function getSubStatusBadgeStyle(status: string) {
  switch (status) {
    case 'active': return 'bg-emerald-100 text-emerald-700'
    case 'past_due': return 'bg-amber-100 text-amber-700'
    case 'cancelled': return 'bg-red-100 text-red-700'
    case 'expired': return 'bg-slate-100 text-slate-600'
    default: return 'bg-slate-100 text-slate-600'
  }
}

function getPlanBadgeStyle(plan: string) {
  switch (plan) {
    case 'expert': return 'bg-purple-100 text-purple-700'
    case 'teacher': return 'bg-blue-100 text-blue-700'
    case 'starter': return 'bg-teal-100 text-teal-700'
    default: return 'bg-slate-100 text-slate-600'
  }
}

function getLegacyStatusBadgeStyle(status: string) {
  switch (status) {
    case 'succeeded': return 'bg-emerald-100 text-emerald-700'
    case 'pending': return 'bg-amber-100 text-amber-700'
    case 'failed': return 'bg-red-100 text-red-700'
    case 'refunded': return 'bg-purple-100 text-purple-700'
    default: return 'bg-slate-100 text-slate-600'
  }
}

// ==================== EMPTY STATE ====================

function EmptyState({ icon: Icon, filtered, label, hint }: {
  icon: React.ComponentType<{ className?: string }>
  filtered: boolean
  label: string
  hint: string
}) {
  return (
    <div className="text-center py-12">
      <div className="mb-4">
        <Icon className="w-12 h-12 text-slate-300 mx-auto" />
      </div>
      <p className="text-slate-500">
        {filtered ? `${label} не найдены` : `Нет ${label.toLowerCase()}`}
      </p>
      <p className="text-sm text-slate-400 mt-1">{hint}</p>
    </div>
  )
}

// ==================== PAYMENT INTENTS TAB ====================

function PaymentIntentsTab() {
  const queryClient = useQueryClient()
  const table = useSearchableTable<PaymentIntentStatusFilter>('all')
  const [applyingId, setApplyingId] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-payment-intents', table.page, table.search, table.statusFilter],
    queryFn: () => fetchPaymentIntents({ page: table.page, limit: table.limit, search: table.search, status: table.statusFilter }),
    staleTime: 30_000,
  })

  const handleApply = async (id: string) => {
    if (!window.confirm('Применить оплату вручную? Это зачислит подписку пользователю.')) return
    setApplyingId(id)
    try {
      await applyPaymentIntent(id)
      await queryClient.invalidateQueries({ queryKey: ['admin-payment-intents', table.page, table.search, table.statusFilter] })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось применить оплату')
    } finally {
      setApplyingId(null)
    }
  }

  if (error) return <div className="glass-container p-6 text-center"><p className="text-red-500">Ошибка загрузки платежных интентов</p></div>

  return (
    <div className="space-y-6">
      {data && (
        <div className="glass-container p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
            <CurrencyIcon className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Всего интентов</p>
            <p className="text-xl font-bold text-slate-700">{data.pagination.total}</p>
          </div>
        </div>
      )}

      <AdminStatusTabs tabs={intentStatusTabs} value={table.statusFilter} onChange={table.handleStatusChange} />
      <AdminSearchBar
        searchInput={table.searchInput}
        onSearchInputChange={table.setSearchInput}
        onSubmit={table.handleSearch}
        onClear={table.handleClearSearch}
        showClear={!!table.search}
      />

      <div className="glass-container overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner className="h-8 w-8" /></div>
        ) : !data?.paymentIntents.length ? (
          <EmptyState icon={CurrencyIcon} filtered={!!table.search || table.statusFilter !== 'all'} label="Интенты" hint="Интенты создаются при инициации оплаты пользователем" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Дата</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Пользователь</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Продукт</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Статус</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Сумма</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">ID заказа</th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-slate-600">Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {data.paymentIntents.map((intent) => (
                    <tr
                      key={intent.id}
                      className={`border-b border-slate-100 hover:bg-slate-50/50 ${
                        intent.status === 'failed' ? 'bg-red-50/30' :
                        intent.status === 'expired' ? 'bg-slate-50/50' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600">{formatDateTime(intent.createdAt)}</span>
                        {intent.paidAt && (
                          <p className="text-xs text-emerald-600 mt-0.5">Оплачен: {formatDateTime(intent.paidAt)}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Link to={`/admin/users/${intent.userId}`} className="text-sm font-medium text-[#8C52FF] hover:underline">
                          {intent.userEmail || 'Неизвестно'}
                        </Link>
                        {intent.userName && <p className="text-xs text-slate-500">{intent.userName}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono text-slate-700">{intent.productCode}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getIntentStatusBadgeStyle(intent.status)}`}>
                          {formatPaymentIntentStatus(intent.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm font-semibold ${
                          intent.status === 'paid' ? 'text-emerald-600' :
                          intent.status === 'failed' ? 'text-red-500' :
                          intent.status === 'expired' ? 'text-slate-400' :
                          'text-slate-700'
                        }`}>
                          {formatAmount(intent.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-500 font-mono" title={intent.providerOrderId}>
                          {intent.providerOrderId
                            ? intent.providerOrderId.slice(0, 12) + (intent.providerOrderId.length > 12 ? '...' : '')
                            : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {intent.status === 'created' ? (
                          <button
                            onClick={() => handleApply(intent.id)}
                            disabled={applyingId === intent.id}
                            className="px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {applyingId === intent.id ? 'Применяем...' : 'Применить оплату'}
                          </button>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPagination page={table.page} totalPages={data.pagination.totalPages} total={data.pagination.total} limit={table.limit} onPageChange={table.setPage} />
          </>
        )}
      </div>
    </div>
  )
}

// ==================== WEBHOOK EVENTS TAB ====================

function WebhookEventsTab() {
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-webhook-events', page],
    queryFn: () => fetchWebhookEvents({ page, limit }),
    staleTime: 30_000,
  })

  if (error) return <div className="glass-container p-6 text-center"><p className="text-red-500">Ошибка загрузки вебхук-событий</p></div>

  return (
    <div className="space-y-6">
      {data && (
        <div className="glass-container p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
            <WebhookIcon className="w-6 h-6 text-slate-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Всего вебхук-событий</p>
            <p className="text-xl font-bold text-slate-700">{data.pagination.total}</p>
          </div>
        </div>
      )}

      <div className="glass-container overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner className="h-8 w-8" /></div>
        ) : !data?.webhookEvents.length ? (
          <EmptyState icon={WebhookIcon} filtered={false} label="Вебхук-события" hint="События появятся после получения вебхуков от платёжной системы" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Дата</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Провайдер</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Ключ события</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Хеш</th>
                  </tr>
                </thead>
                <tbody>
                  {data.webhookEvents.map((event) => (
                    <tr key={event.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600">{formatDateTime(event.createdAt)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          {event.provider}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono text-slate-700 break-all">{event.eventKey}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono text-slate-400">{event.rawPayloadHash.slice(0, 12)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPagination page={page} totalPages={data.pagination.totalPages} total={data.pagination.total} limit={limit} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}

// ==================== SUBSCRIPTIONS TAB ====================

function SubscriptionsTab() {
  const table = useSearchableTable<SubscriptionStatusFilter>('all')

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-subscriptions', table.page, table.search, table.statusFilter],
    queryFn: () => fetchSubscriptions({ page: table.page, limit: table.limit, search: table.search, status: table.statusFilter }),
    staleTime: 30_000,
  })

  if (error) return <div className="glass-container p-6 text-center"><p className="text-red-500">Ошибка загрузки подписок</p></div>

  return (
    <div className="space-y-6">
      {data && (
        <div className="glass-container p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <SubscriptionIcon className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Всего подписок</p>
            <p className="text-xl font-bold text-slate-700">{data.pagination.total}</p>
          </div>
        </div>
      )}

      <AdminStatusTabs tabs={subStatusTabs} value={table.statusFilter} onChange={table.handleStatusChange} />
      <AdminSearchBar
        searchInput={table.searchInput}
        onSearchInputChange={table.setSearchInput}
        onSubmit={table.handleSearch}
        onClear={table.handleClearSearch}
        showClear={!!table.search}
      />

      <div className="glass-container overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner className="h-8 w-8" /></div>
        ) : !data?.subscriptions.length ? (
          <EmptyState icon={SubscriptionIcon} filtered={!!table.search || table.statusFilter !== 'all'} label="Подписки" hint="Подписки появятся после оплаты через Prodamus" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Дата</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Пользователь</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Тариф</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Статус</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Генераций</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Период до</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Prodamus ID</th>
                  </tr>
                </thead>
                <tbody>
                  {data.subscriptions.map((sub) => (
                    <tr
                      key={sub.id}
                      className={`border-b border-slate-100 hover:bg-slate-50/50 ${
                        sub.status === 'past_due' ? 'bg-amber-50/30' :
                        sub.status === 'expired' ? 'bg-slate-50/50' :
                        sub.status === 'cancelled' ? 'bg-red-50/20' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600">{formatDateTime(sub.createdAt)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <Link to={`/admin/users/${sub.userId}`} className="text-sm font-medium text-[#8C52FF] hover:underline">
                          {sub.userEmail || sub.customerEmail || 'Неизвестно'}
                        </Link>
                        {sub.userName && <p className="text-xs text-slate-500">{sub.userName}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getPlanBadgeStyle(sub.plan)}`}>
                          {formatPlanName(sub.plan)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getSubStatusBadgeStyle(sub.status)}`}>
                          {formatSubscriptionStatus(sub.status)}
                        </span>
                        {sub.cancelledAt && (
                          <p className="text-xs text-red-500 mt-0.5">Отменена: {formatDateTime(sub.cancelledAt)}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-semibold text-slate-700">{sub.generationsPerPeriod}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600">{sub.currentPeriodEnd ? formatDateTime(sub.currentPeriodEnd) : '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono text-slate-400" title={sub.prodamusSubscriptionId || ''}>
                          {sub.prodamusSubscriptionId || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPagination page={table.page} totalPages={data.pagination.totalPages} total={data.pagination.total} limit={table.limit} onPageChange={table.setPage} />
          </>
        )}
      </div>
    </div>
  )
}

// ==================== LEGACY PAYMENTS TAB ====================

function LegacyPaymentsTab() {
  const table = useSearchableTable<PaymentStatusFilter>('all')

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-payments', table.page, table.search, table.statusFilter],
    queryFn: () => fetchAdminPayments({ page: table.page, limit: table.limit, search: table.search, status: table.statusFilter }),
    staleTime: 30_000,
  })

  const totals = data?.payments.reduce(
    (acc, payment) => {
      if (payment.status === 'succeeded') acc.succeeded += payment.amount
      acc.total += payment.amount
      return acc
    },
    { total: 0, succeeded: 0 }
  ) || { total: 0, succeeded: 0 }

  if (error) return <div className="glass-container p-6 text-center"><p className="text-red-500">Ошибка загрузки платежей</p></div>

  return (
    <div className="space-y-6">
      {data && data.payments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-container p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <CurrencyIcon className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Успешных на странице</p>
              <p className="text-xl font-bold text-emerald-600">{formatAmount(totals.succeeded)}</p>
            </div>
          </div>
          <div className="glass-container p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
              <CurrencyIcon className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Всего платежей</p>
              <p className="text-xl font-bold text-slate-700">{data.pagination.total}</p>
            </div>
          </div>
        </div>
      )}

      <AdminStatusTabs tabs={legacyStatusTabs} value={table.statusFilter} onChange={table.handleStatusChange} />
      <AdminSearchBar
        searchInput={table.searchInput}
        onSearchInputChange={table.setSearchInput}
        onSubmit={table.handleSearch}
        onClear={table.handleClearSearch}
        showClear={!!table.search}
      />

      <div className="glass-container overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner className="h-8 w-8" /></div>
        ) : !data?.payments.length ? (
          <EmptyState icon={CurrencyIcon} filtered={!!table.search || table.statusFilter !== 'all'} label="Платежи" hint="Платежи появятся после интеграции с платёжной системой" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Дата</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Пользователь</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Статус</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Сумма</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">ID платежа</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((payment) => (
                    <tr
                      key={payment.id}
                      className={`border-b border-slate-100 hover:bg-slate-50/50 ${
                        payment.status === 'failed' ? 'bg-red-50/30' :
                        payment.status === 'refunded' ? 'bg-purple-50/30' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600">{formatDateTime(payment.createdAt)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <Link to={`/admin/users/${payment.userId}`} className="text-sm font-medium text-[#8C52FF] hover:underline">
                          {payment.userEmail || 'Неизвестно'}
                        </Link>
                        {payment.userName && <p className="text-xs text-slate-500">{payment.userName}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getLegacyStatusBadgeStyle(payment.status)}`}>
                          {formatPaymentStatus(payment.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm font-semibold ${
                          payment.status === 'succeeded' ? 'text-emerald-600' :
                          payment.status === 'refunded' ? 'text-purple-600' :
                          payment.status === 'failed' ? 'text-red-500' :
                          'text-slate-700'
                        }`}>
                          {payment.status === 'refunded' ? '-' : ''}{formatAmount(payment.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-500 font-mono">{payment.providerPaymentId || '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPagination page={table.page} totalPages={data.pagination.totalPages} total={data.pagination.total} limit={table.limit} onPageChange={table.setPage} />
          </>
        )}
      </div>
    </div>
  )
}

// ==================== MAIN PAGE ====================

const VIEW_TABS: { mode: ViewMode; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { mode: 'intents', icon: CurrencyIcon, label: 'Платежи' },
  { mode: 'subscriptions', icon: SubscriptionIcon, label: 'Подписки' },
  { mode: 'webhooks', icon: WebhookIcon, label: 'Вебхуки' },
  { mode: 'legacy', icon: ArchiveIcon, label: 'Устаревшие' },
]

export default function AdminPaymentsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('intents')

  return (
    <div className="space-y-6">
      <div className="glass-container p-1 inline-flex rounded-xl">
        {VIEW_TABS.map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === mode
                ? 'bg-[#8C52FF] text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </button>
        ))}
      </div>

      {viewMode === 'intents' && <PaymentIntentsTab />}
      {viewMode === 'subscriptions' && <SubscriptionsTab />}
      {viewMode === 'webhooks' && <WebhookEventsTab />}
      {viewMode === 'legacy' && <LegacyPaymentsTab />}
    </div>
  )
}
