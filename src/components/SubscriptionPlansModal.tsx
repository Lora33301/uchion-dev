import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { SUBSCRIPTION_PLANS } from '../../shared/plans'
import type { SubscriptionPlanId } from '../../shared/plans'

// ==================== ICONS ====================

function CloseIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}

function XMarkIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function WarningIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  )
}

function CrownIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M2.25 6.75l4.5 4.5 5.25-7.5 5.25 7.5 4.5-4.5-1.5 12h-16.5l-1.5-12z" />
    </svg>
  )
}

// ==================== HELPERS ====================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ==================== PLAN FEATURES ====================

interface PlanFeature {
  text: string
  available: boolean
  highlight?: boolean
}

const PLAN_FEATURES: Record<SubscriptionPlanId, PlanFeature[]> = {
  free: [],
  starter: [
    { text: '25 генераций в месяц', available: true, highlight: true },
    { text: 'PDF без водяного знака', available: true },
    { text: 'До 5 перегенераций/день', available: true },
    { text: 'Редактирование листов', available: true },
    { text: '5 папок, до 20 листов', available: true },
    { text: 'Презентации', available: false },
  ],
  teacher: [
    { text: '60 генераций в месяц', available: true, highlight: true },
    { text: 'PDF без водяного знака', available: true },
    { text: 'До 10 перегенераций/день', available: true },
    { text: 'Редактирование листов', available: true },
    { text: '10 папок, до 50 листов', available: true },
    { text: 'Презентации (12 слайдов)', available: true },
    { text: 'Хранилище: 30 презентаций', available: true },
  ],
  expert: [
    { text: '120 генераций в месяц', available: true, highlight: true },
    { text: 'PDF без водяного знака', available: true },
    { text: 'Безлимит перегенераций', available: true },
    { text: 'Редактирование листов', available: true },
    { text: '10 папок, до 100 листов', available: true },
    { text: 'Презентации (12/18/24 сл.)', available: true },
    { text: 'Хранилище: 60 презентаций', available: true },
    { text: 'Ранний доступ к новинкам', available: true },
  ],
}

// ==================== PLAN CARD ====================

interface PlanCardProps {
  planId: SubscriptionPlanId
  isCurrent: boolean
  isLoading: boolean
  isPopular?: boolean
  disabled: boolean
  onSelect: (planId: SubscriptionPlanId) => void
}

function PlanCard({ planId, isCurrent, isLoading, isPopular, disabled, onSelect }: PlanCardProps) {
  const plan = SUBSCRIPTION_PLANS[planId]
  const features = PLAN_FEATURES[planId]

  const cardStyles: Record<string, {
    border: string
    glow: string
    bg: string
    priceBg: string
    btnGradient: string
  }> = {
    starter: {
      border: isCurrent ? 'border-[#8C52FF]/60' : 'border-white/40',
      glow: isCurrent ? 'shadow-[0_0_24px_rgba(140,82,255,0.2)]' : '',
      bg: 'bg-white/60',
      priceBg: 'from-[#8C52FF]/5 to-transparent',
      btnGradient: 'from-[#8C52FF] to-[#A16BFF]',
    },
    teacher: {
      border: isCurrent ? 'border-violet-400/60' : 'border-white/40',
      glow: isCurrent ? 'shadow-[0_0_24px_rgba(139,92,246,0.25)]' : '',
      bg: 'bg-white/60',
      priceBg: 'from-violet-500/5 to-transparent',
      btnGradient: 'from-violet-500 to-purple-500',
    },
    expert: {
      border: isCurrent ? 'border-indigo-400/60' : 'border-white/40',
      glow: isCurrent ? 'shadow-[0_0_24px_rgba(99,102,241,0.25)]' : '',
      bg: 'bg-white/60',
      priceBg: 'from-indigo-500/5 to-transparent',
      btnGradient: 'from-indigo-500 to-violet-500',
    },
  }

  const style = cardStyles[planId] || cardStyles.starter

  return (
    <div
      className={`relative flex flex-col rounded-2xl border backdrop-blur-md transition-all duration-300 overflow-hidden ${style.bg} ${style.border} ${style.glow} ${
        !isCurrent ? 'hover:border-[#8C52FF]/30 hover:shadow-[0_8px_32px_rgba(140,82,255,0.12)]' : ''
      }`}
    >
      {/* Popular badge */}
      {isPopular && !isCurrent && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-[#8C52FF] to-violet-500 text-white text-center text-[11px] font-bold py-1 tracking-wide uppercase">
          Популярный выбор
        </div>
      )}

      {/* Current badge */}
      {isCurrent && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-center text-[11px] font-bold py-1 tracking-wide uppercase">
          Ваш текущий план
        </div>
      )}

      <div className={`p-5 flex flex-col flex-1 ${(isPopular && !isCurrent) || isCurrent ? 'pt-9' : ''}`}>
        {/* Plan name + price */}
        <div className={`rounded-xl p-3 mb-4 bg-gradient-to-b ${style.priceBg}`}>
          <div className="flex items-center gap-2 mb-1">
            {planId === 'expert' && <CrownIcon className="w-4 h-4 text-amber-500" />}
            <p className="text-sm font-semibold text-slate-500">{plan.name}</p>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-slate-800">{plan.price}</span>
            <span className="text-base font-semibold text-slate-500">{'\u20BD'}/мес</span>
          </div>
        </div>

        {/* Features */}
        <ul className="flex flex-col gap-2 mb-5 flex-1">
          {features.map((f, i) => (
            <li key={i} className={`flex items-start gap-2 text-[13px] leading-snug ${
              f.available ? (f.highlight ? 'text-[#8C52FF] font-medium' : 'text-slate-700') : 'text-slate-400'
            }`}>
              <span className={`flex-shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center mt-0.5 ${
                f.available ? 'bg-[#8C52FF]/10' : 'bg-slate-100'
              }`}>
                {f.available ? (
                  <CheckIcon className="w-2.5 h-2.5 text-[#8C52FF]" />
                ) : (
                  <XMarkIcon className="w-2.5 h-2.5 text-slate-300" />
                )}
              </span>
              {f.text}
            </li>
          ))}
        </ul>

        {/* Action button */}
        <button
          onClick={() => onSelect(planId)}
          disabled={isCurrent || isLoading || disabled}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            isCurrent
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default'
              : disabled
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : `bg-gradient-to-r ${style.btnGradient} text-white hover:opacity-90 hover:shadow-lg hover:shadow-purple-300/30 active:scale-[0.98]`
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
              Загрузка...
            </span>
          ) : isCurrent ? (
            'Активен'
          ) : disabled ? (
            'Примите условия'
          ) : (
            'Оформить'
          )}
        </button>
      </div>
    </div>
  )
}

// ==================== TABS ====================

type TabId = 'subscription' | 'topup'

// ==================== TOPUP TAB CONTENT ====================

// Pricing configuration (copied from BuyGenerationsModal for standalone use inside this modal)
const PRICE_PER_GENERATION = 20
const DISCOUNT_PACKAGES: Record<number, number> = {
  60: 990,
  120: 2190,
  200: 3790,
}
const GENERATION_STEPS = [5, 15, 30, 60, 120, 200] as const
const QUICK_PACKAGES = [
  { count: 15, price: 300 },
  { count: 30, price: 600 },
  { count: 60, price: 990 },
] as const

function getTopupPrice(count: number): number {
  if (count in DISCOUNT_PACKAGES) return DISCOUNT_PACKAGES[count]
  return count * PRICE_PER_GENERATION
}
function getTopupBasePrice(count: number): number {
  return count * PRICE_PER_GENERATION
}
function getTopupDiscount(count: number): number {
  if (!(count in DISCOUNT_PACKAGES)) return 0
  const base = getTopupBasePrice(count)
  const actual = DISCOUNT_PACKAGES[count]
  return Math.round(((base - actual) / base) * 100)
}

function TopupTabContent() {
  const [generationsCount, setGenerationsCount] = useState(15)
  const [purchasing, setPurchasing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalPrice = getTopupPrice(generationsCount)
  const basePrice = getTopupBasePrice(generationsCount)
  const discount = getTopupDiscount(generationsCount)
  const hasDiscount = discount > 0

  async function handlePurchase() {
    try {
      setPurchasing(true)
      setError(null)
      const res = await fetch('/api/billing/prodamus/create-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generationsCount }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Ошибка при создании платежа')
      }
      const data = await res.json()
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при создании платежа')
      void err
    } finally {
      setPurchasing(false)
    }
  }

  return (
    <div>
      {/* Quick packages */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {QUICK_PACKAGES.map((pkg) => {
          const isSelected = generationsCount === pkg.count
          const pkgBasePrice = pkg.count * PRICE_PER_GENERATION
          const pkgHasDiscount = pkg.price < pkgBasePrice
          return (
            <button
              key={pkg.count}
              onClick={() => setGenerationsCount(pkg.count)}
              className={`relative flex flex-col items-center py-3.5 px-2 rounded-2xl border-2 transition-all duration-200 ${
                isSelected
                  ? 'border-[#8C52FF] bg-gradient-to-b from-[#8C52FF]/10 to-[#A855F7]/5 shadow-[0_0_16px_rgba(140,82,255,0.25)]'
                  : 'border-purple-100 bg-white hover:border-[#8C52FF]/50 hover:shadow-[0_0_12px_rgba(140,82,255,0.15)]'
              }`}
            >
              {pkgHasDiscount && (
                <span
                  className="absolute -top-2.5 -right-1 px-2 py-0.5 text-white text-[10px] font-bold rounded-full leading-none shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                  style={{ background: 'linear-gradient(135deg, #A855F7, #D946EF)' }}
                >
                  -{Math.round(((pkgBasePrice - pkg.price) / pkgBasePrice) * 100)}%
                </span>
              )}
              <span className={`text-xl font-bold ${isSelected ? 'text-[#8C52FF]' : 'text-slate-800'}`}>
                {pkg.count}
              </span>
              <span className="text-[11px] text-slate-500 mb-1">генераций</span>
              {pkgHasDiscount && (
                <span className="text-[11px] text-slate-400 line-through">{pkgBasePrice} &#8381;</span>
              )}
              <span className={`text-sm font-bold ${isSelected ? 'text-[#8C52FF]' : 'text-slate-700'}`}>
                {pkg.price} &#8381;
              </span>
            </button>
          )
        })}
      </div>

      {/* Slider */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-600 text-sm">Или выберите количество:</span>
          <span className="text-lg font-bold text-slate-900">{generationsCount}</span>
        </div>
        {(() => {
          const stepIndex = GENERATION_STEPS.indexOf(generationsCount as typeof GENERATION_STEPS[number])
          const currentIndex = stepIndex >= 0 ? stepIndex : 0
          const maxIndex = GENERATION_STEPS.length - 1
          const fillPercent = (currentIndex / maxIndex) * 100
          return (
            <>
              <input
                type="range"
                min={0}
                max={maxIndex}
                step={1}
                value={currentIndex}
                onChange={(e) => setGenerationsCount(GENERATION_STEPS[parseInt(e.target.value, 10)])}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #8C52FF 0%, #8C52FF ${fillPercent}%, #e2e8f0 ${fillPercent}%, #e2e8f0 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                {GENERATION_STEPS.map((step) => (
                  <span key={step}>{step}</span>
                ))}
              </div>
            </>
          )
        })()}
      </div>

      {/* Total */}
      <div className="mb-4 text-center">
        <div className="text-slate-600 text-lg">
          Итого:{' '}
          {hasDiscount && (
            <span className="text-base text-slate-400 line-through mr-1.5">{basePrice} &#8381;</span>
          )}
          <span className="text-2xl font-bold text-slate-900">{totalPrice} &#8381;</span>
          {hasDiscount && (
            <span className="ml-2 text-sm font-bold text-[#A855F7]">-{discount}%</span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
          {error}
        </div>
      )}

      <button
        onClick={handlePurchase}
        disabled={purchasing}
        className={`w-full py-4 rounded-xl text-white font-semibold text-lg transition-all ${
          purchasing
            ? 'bg-[#A855F7]/50 cursor-wait'
            : 'bg-[#A855F7]/80 hover:bg-[#A855F7]/90 shadow-md shadow-purple-400/20 hover:shadow-purple-400/30'
        }`}
      >
        {purchasing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
            Загрузка...
          </span>
        ) : (
          'Купить генерации'
        )}
      </button>
    </div>
  )
}

// ==================== AGREEMENT CHECKBOXES ====================

interface AgreementCheckboxesProps {
  agreedTerms: boolean
  agreedRecurring: boolean
  onToggleTerms: () => void
  onToggleRecurring: () => void
}

function AgreementCheckboxes({ agreedTerms, agreedRecurring, onToggleTerms, onToggleRecurring }: AgreementCheckboxesProps) {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-slate-50/80 border border-slate-100">
      <label className="flex items-start gap-3 cursor-pointer group">
        <div className="relative flex-shrink-0 mt-0.5">
          <input
            type="checkbox"
            checked={agreedTerms}
            onChange={onToggleTerms}
            className="sr-only peer"
          />
          <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
            agreedTerms
              ? 'bg-[#8C52FF] border-[#8C52FF]'
              : 'border-slate-300 group-hover:border-[#8C52FF]/50'
          }`}>
            {agreedTerms && <CheckIcon className="w-3 h-3 text-white" />}
          </div>
        </div>
        <span className="text-[13px] text-slate-600 leading-snug select-none">
          Я принимаю{' '}
          <a href="#" onClick={(e) => e.preventDefault()} className="text-[#8C52FF] hover:underline">
            пользовательское соглашение
          </a>
          , с{' '}
          <a href="#" onClick={(e) => e.preventDefault()} className="text-[#8C52FF] hover:underline">
            политикой персональных данных
          </a>
          {' '}ознакомлен.
        </span>
      </label>

      <label className="flex items-start gap-3 cursor-pointer group">
        <div className="relative flex-shrink-0 mt-0.5">
          <input
            type="checkbox"
            checked={agreedRecurring}
            onChange={onToggleRecurring}
            className="sr-only peer"
          />
          <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
            agreedRecurring
              ? 'bg-[#8C52FF] border-[#8C52FF]'
              : 'border-slate-300 group-hover:border-[#8C52FF]/50'
          }`}>
            {agreedRecurring && <CheckIcon className="w-3 h-3 text-white" />}
          </div>
        </div>
        <span className="text-[13px] text-slate-600 leading-snug select-none">
          Даю согласие на автоматическое списание денежных средств для оплаты подписки (каждого последующего Расчетного периода).
        </span>
      </label>
    </div>
  )
}

// ==================== MAIN MODAL ====================

export interface SubscriptionPlansModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: TabId
}

export default function SubscriptionPlansModal({ isOpen, onClose, initialTab = 'subscription' }: SubscriptionPlansModalProps) {
  const { user, refreshAuth } = useAuth()
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)
  const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlanId | null>(null)
  const [subscribeError, setSubscribeError] = useState<string | null>(null)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null)
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [agreedRecurring, setAgreedRecurring] = useState(false)

  const subscription = user?.subscription
  const currentPlan = subscription?.plan ?? 'free'
  const subStatus = subscription?.status ?? 'active'
  const isPaid = currentPlan !== 'free'

  // Show topup tab only if user has active paid subscription and ran out of generations
  const showTopupTab = isPaid && subStatus === 'active' && (user?.generationsLeft ?? 0) <= 0

  const bothAgreed = agreedTerms && agreedRecurring

  // Sync tab when initialTab changes (e.g. opened from different triggers)
  useEffect(() => {
    if (isOpen) {
      // If topup tab requested but not allowed, fall back to subscription
      const tab = initialTab === 'topup' && !showTopupTab ? 'subscription' : initialTab
      setActiveTab(tab)
      setSubscribeError(null)
      setCancelConfirm(false)
      setCancelError(null)
      setCancelSuccess(null)
      setAgreedTerms(false)
      setAgreedRecurring(false)
    }
  }, [isOpen, initialTab, showTopupTab])

  // Escape key + body scroll lock
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  async function handleSelectPlan(planId: SubscriptionPlanId) {
    if (planId === 'free' || !bothAgreed) return
    try {
      setLoadingPlan(planId)
      setSubscribeError(null)
      const res = await fetch('/api/billing/create-subscription-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan: planId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Ошибка при создании ссылки на оплату')
      }
      const data = await res.json()
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
      }
    } catch (err) {
      setSubscribeError(err instanceof Error ? err.message : 'Ошибка при создании ссылки')
      void err
    } finally {
      setLoadingPlan(null)
    }
  }

  async function handleCancelSubscription() {
    if (!cancelConfirm) {
      setCancelConfirm(true)
      return
    }
    try {
      setCancelling(true)
      setCancelError(null)
      const res = await fetch('/api/billing/cancel-subscription', {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Ошибка при отмене подписки')
      }
      const data = await res.json()
      setCancelSuccess(data.message || 'Подписка отменена')
      setCancelConfirm(false)
      await refreshAuth()
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Ошибка при отмене подписки')
      void err
    } finally {
      setCancelling(false)
    }
  }

  if (!isOpen) return null

  const PAID_PLANS: SubscriptionPlanId[] = ['starter', 'teacher', 'expert']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gradient-to-b from-white to-slate-50 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto border border-white/60">
        {/* Decorative gradient blob */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-gradient-to-b from-[#8C52FF]/8 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-xl z-10 px-6 pt-6 pb-0 rounded-t-3xl border-b border-slate-100/50">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-slate-100/80 rounded-xl transition-colors"
            aria-label="Закрыть"
          >
            <CloseIcon className="w-5 h-5 text-slate-400" />
          </button>

          <h2 className="text-2xl font-bold text-center mb-1">
            Управление <span className="bg-gradient-to-r from-[#8C52FF] to-violet-500 bg-clip-text text-transparent">подпиской</span>
          </h2>
          <p className="text-center text-slate-500 text-sm mb-4">
            {showTopupTab ? 'Выберите тариф или пополните генерации' : 'Выберите подходящий тариф'}
          </p>

          {/* Tabs - only show when topup is available */}
          {showTopupTab && (
            <div className="flex gap-1 p-1 bg-slate-100/80 rounded-xl mb-5">
              <button
                onClick={() => setActiveTab('subscription')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'subscription'
                    ? 'bg-white text-[#8C52FF] shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Подписка
              </button>
              <button
                onClick={() => setActiveTab('topup')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'topup'
                    ? 'bg-white text-[#8C52FF] shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Пополнить генерации
              </button>
            </div>
          )}
          {!showTopupTab && <div className="mb-5" />}
        </div>

        {/* Content */}
        <div className="px-6 pb-6 pt-2">
          {activeTab === 'subscription' ? (
            <>
              {/* Status banners */}
              {subStatus === 'past_due' && (
                <div className="flex items-center gap-3 p-3 mb-4 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-800 text-sm backdrop-blur-sm">
                  <WarningIcon className="w-5 h-5 flex-shrink-0 text-amber-500" />
                  <span className="font-medium">Проблема с оплатой. Обновите платёжные данные, чтобы продолжить пользоваться сервисом.</span>
                </div>
              )}

              {subStatus === 'cancelled' && subscription?.currentPeriodEnd && (
                <div className="flex items-center gap-3 p-3 mb-4 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-700 text-sm backdrop-blur-sm">
                  <span className="font-medium">Подписка отменена. Активна до {formatDate(subscription.currentPeriodEnd)}.</span>
                </div>
              )}

              {cancelSuccess && (
                <div className="flex items-center gap-3 p-3 mb-4 bg-green-50/80 border border-green-200 rounded-xl text-green-800 text-sm backdrop-blur-sm">
                  <CheckIcon className="w-5 h-5 flex-shrink-0 text-green-500" />
                  <span className="font-medium">{cancelSuccess}</span>
                </div>
              )}

              {/* Current plan info for paid users */}
              {isPaid && subscription && subStatus !== 'cancelled' && (
                <div className="mb-4 p-3 bg-[#8C52FF]/5 border border-[#8C52FF]/10 rounded-xl text-sm text-slate-700 backdrop-blur-sm">
                  <span className="font-semibold text-[#8C52FF]">Ваш план: {SUBSCRIPTION_PLANS[currentPlan].name}</span>
                  {subscription.currentPeriodEnd && subStatus === 'active' && (
                    <span className="text-slate-500 ml-2">
                      — следующее списание: {formatDate(subscription.currentPeriodEnd)}
                    </span>
                  )}
                </div>
              )}

              {/* Plan cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                {PAID_PLANS.map((planId) => (
                  <div key={planId}>
                    <PlanCard
                      planId={planId}
                      isCurrent={currentPlan === planId}
                      isLoading={loadingPlan === planId}
                      isPopular={planId === 'teacher'}
                      disabled={!bothAgreed && currentPlan !== planId}
                      onSelect={handleSelectPlan}
                    />
                  </div>
                ))}
              </div>

              {subscribeError && (
                <div className="mb-4 p-3 bg-red-50/80 border border-red-200 rounded-xl text-red-600 text-sm text-center backdrop-blur-sm">
                  {subscribeError}
                </div>
              )}

              {/* Agreement checkboxes */}
              <AgreementCheckboxes
                agreedTerms={agreedTerms}
                agreedRecurring={agreedRecurring}
                onToggleTerms={() => setAgreedTerms((v) => !v)}
                onToggleRecurring={() => setAgreedRecurring((v) => !v)}
              />

              {/* Cancel subscription */}
              {isPaid && subStatus !== 'cancelled' && (
                <div className="border-t border-slate-100 pt-4 mt-5">
                  {cancelError && (
                    <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
                      {cancelError}
                    </div>
                  )}
                  {cancelConfirm ? (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm text-slate-600 text-center">
                        Вы уверены? Подписка отменится, но останется активной до конца периода.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCancelConfirm(false)}
                          className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          Нет, оставить
                        </button>
                        <button
                          onClick={handleCancelSubscription}
                          disabled={cancelling}
                          className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {cancelling ? 'Отменяю...' : 'Да, отменить'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <button
                        onClick={handleCancelSubscription}
                        className="text-xs text-slate-400 hover:text-red-500 transition-colors underline underline-offset-2"
                      >
                        Отменить подписку
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <TopupTabContent />
            </>
          )}
        </div>
      </div>

      {/* Slider styles */}
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          border: 3px solid #8C52FF;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          border: 3px solid #8C52FF;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }
      `}</style>
    </div>
  )
}
