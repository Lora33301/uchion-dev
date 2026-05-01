import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchAdminUserDetail,
  blockUser,
  unblockUser,
  generateReferralCode,
  fetchUserReferrals,
  formatProviderName,
  formatRoleName,
  formatGenerationStatus,
  formatDateTime,
  formatDate,
} from '../../lib/admin-api'
import { formatSubjectName, formatPlanName } from '../../lib/dashboard-api'
import { DocumentIcon } from '../../components/ui/Icons'

// Icon components
function ArrowLeftIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  )
}

function UserIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  )
}

function BoltIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  )
}

function LockClosedIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  )
}

function LockOpenIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  )
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => fetchAdminUserDetail(id!),
    enabled: !!id,
  })

  const blockMutation = useMutation({
    mutationFn: () => blockUser(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setActionError(null)
    },
    onError: (err: Error) => {
      setActionError(err.message)
    },
  })

  const unblockMutation = useMutation({
    mutationFn: () => unblockUser(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setActionError(null)
    },
    onError: (err: Error) => {
      setActionError(err.message)
    },
  })

  const referralsQuery = useQuery({
    queryKey: ['admin-user-referrals', id],
    queryFn: () => fetchUserReferrals(id!),
    enabled: !!id,
  })

  const generateCodeMutation = useMutation({
    mutationFn: () => generateReferralCode(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-user-referrals', id] })
      setActionError(null)
    },
    onError: (err: Error) => {
      setActionError(err.message)
    },
  })

  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const buildReferralUrl = (code: string): string => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}/?ref=${code}`
  }
  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyFeedback('Скопировано')
      setTimeout(() => setCopyFeedback(null), 1500)
    } catch {
      setCopyFeedback('Не удалось скопировать')
      setTimeout(() => setCopyFeedback(null), 1500)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="relative">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-200"></div>
          <div className="absolute inset-0 animate-spin rounded-full h-8 w-8 border-t-2 border-[#8C52FF]"></div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="glass-container p-6">
        <p className="text-red-500 text-center">Ошибка загрузки данных пользователя</p>
        <div className="text-center mt-4">
          <button
            onClick={() => navigate('/admin/users')}
            className="text-[#8C52FF] hover:underline"
          >
            Вернуться к списку
          </button>
        </div>
      </div>
    )
  }

  const { user, generations, worksheets } = data
  const isProcessing = blockMutation.isPending || unblockMutation.isPending

  // Status color for generations
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-700'
      case 'failed': return 'bg-red-100 text-red-700'
      case 'processing': return 'bg-blue-100 text-blue-700'
      default: return 'bg-slate-100 text-slate-600'
    }
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeftIcon className="w-5 h-5" />
        Назад к списку
      </Link>

      {/* User info card */}
      <div className="glass-container p-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          {user.image ? (
            <img
              src={user.image}
              alt=""
              className="w-20 h-20 rounded-2xl object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-slate-200 flex items-center justify-center">
              <UserIcon className="w-10 h-10 text-slate-400" />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h2 className={`text-2xl font-bold ${user.isBlocked ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                {user.name || 'Без имени'}
              </h2>
              {/* Status badge */}
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                user.isBlocked
                  ? 'bg-red-100 text-red-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {user.isBlocked ? (
                  <>
                    <LockClosedIcon className="w-3.5 h-3.5" />
                    Заблокирован
                  </>
                ) : (
                  'Активен'
                )}
              </span>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                user.role === 'admin'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {formatRoleName(user.role)}
              </span>
            </div>
            <p className="text-slate-500 mb-4">{user.email}</p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Провайдер</p>
                <p className="text-sm font-medium text-slate-900">{formatProviderName(user.provider)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Тариф</p>
                <p className="text-sm font-medium text-slate-900">{formatPlanName(user.subscription.plan)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Генераций осталось</p>
                <p className="text-sm font-medium text-slate-900">{user.generationsLeft}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Всего листов</p>
                <p className="text-sm font-medium text-slate-900">{user.worksheetsCount}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Генераций</p>
                <p className="text-sm font-medium text-slate-900">{user.generationsCount}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {user.isBlocked ? (
              <button
                onClick={() => unblockMutation.mutate()}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
              >
                <LockOpenIcon className="w-5 h-5" />
                Разблокировать
              </button>
            ) : (
              <button
                onClick={() => blockMutation.mutate()}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                <LockClosedIcon className="w-5 h-5" />
                Заблокировать
              </button>
            )}
          </div>
        </div>

        {actionError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {actionError}
          </div>
        )}
      </div>

      {/* Details cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-container p-5">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">ID пользователя</p>
          <p className="text-sm font-mono text-slate-600 break-all">{user.id}</p>
        </div>
        <div className="glass-container p-5">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Provider ID</p>
          <p className="text-sm font-mono text-slate-600 break-all">{user.providerId || '-'}</p>
        </div>
        <div className="glass-container p-5">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Дата регистрации</p>
          <p className="text-sm font-medium text-slate-900">{formatDateTime(user.createdAt)}</p>
        </div>
        <div className="glass-container p-5">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Последнее обновление</p>
          <p className="text-sm font-medium text-slate-900">{formatDateTime(user.updatedAt)}</p>
        </div>
      </div>

      {/* Referral / ambassador block */}
      <div className="glass-container overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-amber-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Реферальная программа</h3>
            {user.referralCode && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                Амбассадор
              </span>
            )}
          </div>
          {copyFeedback && (
            <span className="text-xs text-emerald-600 font-medium">{copyFeedback}</span>
          )}
        </div>

        <div className="p-6 space-y-5">
          {/* Code area */}
          {user.referralCode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Реферальный код</p>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-lg font-bold text-slate-900 px-3 py-1.5 bg-slate-100 rounded-lg">
                    {user.referralCode}
                  </code>
                  <button
                    onClick={() => copyText(user.referralCode!)}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 transition-colors"
                  >
                    Копировать
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Ссылка для амбассадора</p>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-xs text-slate-600 px-3 py-1.5 bg-slate-100 rounded-lg flex-1 truncate">
                    {buildReferralUrl(user.referralCode)}
                  </code>
                  <button
                    onClick={() => copyText(buildReferralUrl(user.referralCode!))}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 transition-colors whitespace-nowrap"
                  >
                    Копировать
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-slate-900 mb-0.5">У пользователя нет реферального кода</p>
                <p className="text-xs text-slate-500">Сгенерируйте код, чтобы он мог приглашать новых пользователей по своей ссылке.</p>
              </div>
              <button
                onClick={() => generateCodeMutation.mutate()}
                disabled={generateCodeMutation.isPending || user.isBlocked}
                className="px-4 py-2.5 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {generateCodeMutation.isPending ? 'Создаём...' : 'Создать код'}
              </button>
            </div>
          )}

          {/* Stats + invited list */}
          {user.referralCode && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Всего привлечено</p>
                  <p className="text-2xl font-bold text-slate-900">{referralsQuery.data?.total ?? user.referralsCount ?? 0}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">С платным тарифом</p>
                  <p className="text-2xl font-bold text-slate-900">{referralsQuery.data?.paidCount ?? 0}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700 mb-3">Привлечённые пользователи</p>
                {referralsQuery.isLoading ? (
                  <p className="text-sm text-slate-500">Загрузка...</p>
                ) : !referralsQuery.data || referralsQuery.data.referrals.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center bg-slate-50 rounded-xl">
                    По этой ссылке ещё никто не зарегистрировался
                  </p>
                ) : (
                  <div className="overflow-x-auto -mx-6">
                    <table className="w-full">
                      <thead>
                        <tr className="border-y border-slate-200 bg-slate-50">
                          <th className="text-left px-6 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">Email</th>
                          <th className="text-left px-6 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">Дата</th>
                          <th className="text-left px-6 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">Тариф</th>
                          <th className="text-left px-6 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">IP</th>
                          <th className="text-left px-6 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">Флаги</th>
                        </tr>
                      </thead>
                      <tbody>
                        {referralsQuery.data.referrals.map((r) => (
                          <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="px-6 py-2.5 text-sm">
                              <Link to={`/admin/users/${r.id}`} className={`hover:underline ${r.isBlocked ? 'text-slate-400 line-through' : 'text-[#8C52FF]'}`}>
                                {r.email}
                              </Link>
                            </td>
                            <td className="px-6 py-2.5 text-sm text-slate-600 whitespace-nowrap">
                              {r.referredAt ? formatDateTime(r.referredAt) : formatDateTime(r.registeredAt)}
                            </td>
                            <td className="px-6 py-2.5 text-sm text-slate-600">
                              {formatPlanName(r.subscriptionPlan)}
                            </td>
                            <td className="px-6 py-2.5 text-sm text-slate-500 font-mono">
                              {r.referredIp || '-'}
                            </td>
                            <td className="px-6 py-2.5 text-sm">
                              {r.suspicious ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700" title={r.flags.join(', ')}>
                                  Подозрительно
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Generations history */}
      <div className="glass-container overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BoltIcon className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">История генераций</h3>
            <span className="text-sm text-slate-500">(последние 20)</span>
          </div>
        </div>

        {generations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">Генераций пока нет</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Дата</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Статус</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Предмет</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Класс</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Тема</th>
                </tr>
              </thead>
              <tbody>
                {generations.map((gen) => (
                  <tr key={gen.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-6 py-3 text-sm text-slate-600">
                      {formatDateTime(gen.createdAt)}
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        Завершено
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">
                      {gen.subject ? formatSubjectName(gen.subject) : '-'}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">
                      {gen.grade ? `${gen.grade} класс` : '-'}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600 max-w-xs truncate">
                      {gen.topic || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Worksheets (saved) */}
      <div className="glass-container overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DocumentIcon className="w-5 h-5 text-[#8C52FF]" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Сохраненные листы</h3>
            <span className="text-sm text-slate-500">(последние 20)</span>
          </div>
        </div>

        {worksheets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">Сохраненных листов пока нет</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Дата</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Предмет</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Класс</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Тема</th>
                </tr>
              </thead>
              <tbody>
                {worksheets.map((ws) => (
                  <tr key={ws.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-6 py-3 text-sm text-slate-600">
                      {formatDateTime(ws.createdAt)}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">
                      {formatSubjectName(ws.subject)}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">
                      {ws.grade} класс
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600 max-w-xs truncate">
                      {ws.title || ws.topic}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
