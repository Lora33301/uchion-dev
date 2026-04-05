import { useNavigate } from 'react-router-dom'
import { SUBSCRIPTION_PLANS, type SubscriptionPlanId } from '../../../shared/plans'

const PLAN_ORDER: SubscriptionPlanId[] = ['free', 'starter', 'teacher', 'expert']
const POPULAR_PLAN: SubscriptionPlanId = 'teacher'

function getPlanFeatures(plan: (typeof SUBSCRIPTION_PLANS)[SubscriptionPlanId]): string[] {
  const features: string[] = []
  features.push(plan.isRecurring ? `${plan.generationsPerPeriod} генераций/мес` : `${plan.generationsPerPeriod} генераций`)
  features.push(plan.pdfTemplateStyles ? 'Все стили PDF' : 'Стандартный PDF')
  features.push(`${plan.folders} ${plan.folders <= 2 ? 'папки' : 'папок'}`)
  if (plan.dailyRegenLimit > 0) features.push(`Перегенерация ${plan.dailyRegenLimit}/день`)
  if (plan.allowedSlideCounts.length > 1) features.push(`Презентации ${plan.allowedSlideCounts.join('/')} сл.`)
  return features
}

export default function PricingPreview() {
  const navigate = useNavigate()

  return (
    <section className="py-[72px]">
      <div className="max-w-[760px] mx-auto px-5">
        <p className="text-xs font-semibold uppercase tracking-[1.5px] text-[#8C52FF] text-center mb-3">Тарифы</p>
        <h2 className="text-[28px] font-extrabold text-center leading-tight tracking-tight mb-3">Выберите свой тариф</h2>
        <p className="text-[15px] text-[#64748b] text-center max-w-[520px] mx-auto mb-8">
          5 бесплатных генераций для старта. Подписка — когда будете готовы.
        </p>
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-4 gap-3">
          {PLAN_ORDER.map((planId) => {
            const plan = SUBSCRIPTION_PLANS[planId]
            const isPopular = planId === POPULAR_PLAN
            const features = getPlanFeatures(plan)
            return (
              <div key={planId} className={`rounded-[14px] p-6 text-center flex flex-col relative ${isPopular ? 'border-2 border-[#8C52FF]' : 'border border-[#f1eef9]'}`}>
                {isPopular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#8C52FF] text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-md whitespace-nowrap">
                    Популярный выбор
                  </div>
                )}
                <div className="text-sm font-bold mb-1">{plan.name}</div>
                <div className="text-2xl font-extrabold text-[#8C52FF] mb-0.5">
                  {plan.price > 0 ? `${plan.price.toLocaleString('ru-RU')} \u20BD` : '0 \u20BD'}
                </div>
                <div className="text-[11px] text-[#94a3b8] mb-3">
                  {plan.price > 0 ? '/ месяц' : 'навсегда'}
                </div>
                <ul className="text-left flex-1">
                  {features.map((f) => (
                    <li key={f} className="text-[11px] text-[#475569] py-1 border-b border-[#f8f7fa] flex items-center gap-1.5">
                      <span className="text-[#8C52FF] font-bold text-[10px]">{'\u2713'}</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate(planId === 'free' ? '/' : '/pricing')}
                  className={`mt-3.5 w-full py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    isPopular
                      ? 'bg-[#8C52FF] text-white hover:bg-[#7B3FEE]'
                      : 'bg-[#f3eeff] text-[#8C52FF] border border-[#e8deff] hover:bg-[#ede9fe]'
                  }`}
                >
                  {planId === 'free' ? 'Начать' : 'Подключить'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
