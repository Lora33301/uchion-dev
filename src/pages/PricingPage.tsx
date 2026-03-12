import { useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import { SUBSCRIPTION_PLANS } from '../../shared/plans'
import type { SubscriptionPlanId } from '../../shared/plans'
import SubscriptionPlansModal from '../components/SubscriptionPlansModal'
import { useAuth } from '../lib/auth'

// ==================== ICONS ====================

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

function CrownIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M2.25 6.75l4.5 4.5 5.25-7.5 5.25 7.5 4.5-4.5-1.5 12h-16.5l-1.5-12z" />
    </svg>
  )
}

// ==================== PLAN FEATURES ====================

interface PlanFeature {
  text: string
  available: boolean
}

const PLAN_FEATURES: Record<SubscriptionPlanId, PlanFeature[]> = {
  free: [
    { text: '5 генераций (разовый лимит)', available: true },
    { text: 'Генерация рабочих листов', available: true },
    { text: '5 типов заданий', available: true },
    { text: '2 папки, до 15 листов', available: true },
    { text: 'Редактирование листов', available: true },
    { text: 'Стандартный шаблон PDF', available: true },
    { text: 'PDF с водяным знаком', available: true },
    { text: 'Презентации (12 слайдов)', available: true },
    { text: 'Хранилище: 5 презентаций', available: true },
    { text: 'Перегенерация заданий', available: false },
    { text: 'Стили оформления PDF', available: false },
  ],
  starter: [
    { text: '30 генераций в месяц', available: true },
    { text: 'Генерация рабочих листов', available: true },
    { text: '5 типов заданий', available: true },
    { text: '5 папок, до 20 листов', available: true },
    { text: 'До 3 перегенераций/день', available: true },
    { text: 'Редактирование листов', available: true },
    { text: 'Стили оформления PDF', available: true },
    { text: 'PDF без водяного знака', available: true },
    { text: 'Улучшенная ИИ-модель', available: true },
    { text: 'Презентации (12/18 сл.)', available: true },
    { text: 'Хранилище: 15 презентаций', available: true },
  ],
  teacher: [
    { text: '60 генераций в месяц', available: true },
    { text: 'Генерация рабочих листов', available: true },
    { text: '5 типов заданий', available: true },
    { text: '10 папок, до 50 листов', available: true },
    { text: 'До 6 перегенераций/день', available: true },
    { text: 'Редактирование листов', available: true },
    { text: 'Стили оформления PDF', available: true },
    { text: 'PDF без водяного знака', available: true },
    { text: 'Улучшенная ИИ-модель', available: true },
    { text: 'Презентации (12/18 сл.)', available: true },
    { text: 'Хранилище: 30 презентаций', available: true },
  ],
  expert: [
    { text: '120 генераций в месяц', available: true },
    { text: 'Генерация рабочих листов', available: true },
    { text: '5 типов заданий', available: true },
    { text: '10 папок, до 100 листов', available: true },
    { text: 'До 10 перегенераций/день', available: true },
    { text: 'Редактирование листов', available: true },
    { text: 'Стили оформления PDF', available: true },
    { text: 'PDF без водяного знака', available: true },
    { text: 'Улучшенная ИИ-модель', available: true },
    { text: 'Презентации (12/18/24 сл.)', available: true },
    { text: 'Хранилище: 60 презентаций', available: true },
    { text: 'Ранний доступ к новинкам', available: true },
  ],
}

const PLAN_DESCRIPTIONS: Record<SubscriptionPlanId, string> = {
  free: 'Попробуйте сервис бесплатно',
  starter: 'Для начала работы с ИИ-генерацией',
  teacher: 'Полный набор инструментов для учителя',
  expert: 'Максимум возможностей и приоритетный доступ',
}

// ==================== PLAN CARD ====================

interface PlanCardProps {
  planId: SubscriptionPlanId
  isPopular: boolean
  isCurrent: boolean
  onSelect: (planId: SubscriptionPlanId) => void
}

function PlanCard({ planId, isPopular, isCurrent, onSelect }: PlanCardProps) {
  const plan = SUBSCRIPTION_PLANS[planId]
  const features = PLAN_FEATURES[planId]
  const description = PLAN_DESCRIPTIONS[planId]
  const isFree = planId === 'free'
  const isExpert = planId === 'expert'

  return (
    <div className={`relative flex flex-col rounded-2xl border-2 bg-white transition-all ${
      isPopular
        ? 'border-[#8C52FF] shadow-[0_0_24px_rgba(140,82,255,0.15)]'
        : 'border-slate-200 hover:border-slate-300'
    }`}>
      {/* Popular badge */}
      {isPopular && (
        <div
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 text-white text-xs font-bold rounded-full whitespace-nowrap shadow-[0_0_12px_rgba(140,82,255,0.4)]"
          style={{ background: 'linear-gradient(135deg, #8C52FF, #A855F7)' }}
        >
          Популярный выбор
        </div>
      )}

      <div className="p-6 flex flex-col flex-1">
        {/* Plan name + price */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            {isExpert && <CrownIcon className="w-5 h-5 text-amber-500" />}
            <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
            {isCurrent && (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[11px] font-semibold rounded-full">
                Текущий
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {isFree ? '0' : plan.price}
            </span>
            <span className="text-lg text-slate-900 font-bold">{'\u20BD'}</span>
            <span className="text-sm text-slate-500">/месяц</span>
          </div>

          <p className="text-sm text-slate-500 mt-2">{description}</p>
        </div>

        {/* CTA button */}
        {isFree ? (
          <Link
            to="/"
            className="block w-full py-3 rounded-xl text-center text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors mb-5"
          >
            Начать бесплатно
          </Link>
        ) : isCurrent ? (
          <button
            disabled
            className="w-full py-3 rounded-xl text-sm font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default mb-5"
          >
            Активен
          </button>
        ) : (
          <button
            onClick={() => onSelect(planId)}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-all mb-5 ${
              isPopular
                ? 'bg-[#8C52FF] text-white hover:bg-[#7B3FEE] shadow-md shadow-purple-300/30 hover:shadow-purple-400/40'
                : 'bg-white text-[#8C52FF] border-2 border-[#8C52FF] hover:bg-[#8C52FF]/5'
            }`}
          >
            Подключить
          </button>
        )}

        {/* Features */}
        <ul className="flex flex-col gap-2.5 flex-1">
          {features.map((f, i) => (
            <li key={i} className={`flex items-start gap-2.5 text-sm leading-snug ${
              f.available ? 'text-slate-700' : 'text-slate-400'
            }`}>
              <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                f.available ? 'bg-[#8C52FF]/10' : 'bg-slate-100'
              }`}>
                {f.available ? (
                  <CheckIcon className="w-3 h-3 text-[#8C52FF]" />
                ) : (
                  <XMarkIcon className="w-3 h-3 text-slate-300" />
                )}
              </span>
              {f.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ==================== PAGE ====================

export default function PricingPage() {
  const { user } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanId>('teacher')

  const currentPlan = user?.subscription?.plan ?? 'free'

  function handleSelectPlan(planId: SubscriptionPlanId) {
    setSelectedPlan(planId)
    setModalOpen(true)
  }

  const ALL_PLANS: SubscriptionPlanId[] = ['free', 'starter', 'teacher', 'expert']

  return (
    <>
      <Header />

      <main className="min-h-screen bg-gradient-to-b from-white to-slate-50">
        {/* Hero section */}
        <section className="pt-16 pb-10 px-4 sm:px-6 text-center">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
              Выберите тариф для работы
            </h1>
            <p className="text-base sm:text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto">
              Создавайте рабочие листы и презентации с помощью ИИ. Начните бесплатно или выберите подписку с расширенными возможностями.
            </p>
          </div>
        </section>

        {/* Plans grid */}
        <section className="pb-20 px-4 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
              {ALL_PLANS.map((planId) => (
                <div key={planId}>
                  <PlanCard
                    planId={planId}
                    isPopular={planId === 'teacher'}
                    isCurrent={currentPlan === planId}
                    onSelect={handleSelectPlan}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SubscriptionPlansModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialPlan={selectedPlan}
      />
    </>
  )
}
