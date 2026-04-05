import { useState, useEffect, useCallback, type ReactNode } from 'react'
import type { GenerateMode } from './types'

// =============================================================================
// Tip illustrations (CSS mini-UI mockups)
// =============================================================================

function IllustrationCabinet() {
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border border-[#ede9fe]">
        <svg className="w-4 h-4 text-[#8C52FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
        </svg>
        <span className="text-xs font-medium text-[#475569]">Личный кабинет</span>
      </div>
    </div>
  )
}

function IllustrationPricing() {
  const plans = [
    { gens: '30', name: 'Начинающий', price: '590', active: false },
    { gens: '60', name: 'Методист', price: '890', active: true },
    { gens: '120', name: 'Эксперт', price: '1590', active: false },
  ]
  return (
    <div className="flex items-end justify-center gap-2">
      {plans.map(p => (
        <div
          key={p.name}
          className={`rounded-lg px-3 py-2 text-center transition-all ${
            p.active
              ? 'bg-white border-[1.5px] border-[#8C52FF] shadow-sm scale-105'
              : 'bg-white/70 border border-[#e2e8f0]'
          }`}
          style={{ minWidth: 64 }}
        >
          {p.active && (
            <div className="text-[7px] font-bold text-white bg-[#8C52FF] rounded-full px-1.5 py-0.5 mb-1 -mt-1 mx-auto w-fit">
              Популярный
            </div>
          )}
          <div className={`text-sm font-bold ${p.active ? 'text-[#8C52FF]' : 'text-[#1e293b]'}`}>{p.gens}</div>
          <div className="text-[8px] text-[#94a3b8]">генераций</div>
          <div className={`text-[9px] font-semibold mt-0.5 ${p.active ? 'text-[#8C52FF]' : 'text-[#475569]'}`}>{p.price} P/мес</div>
        </div>
      ))}
    </div>
  )
}

function IllustrationFeatures() {
  const features = ['60 генераций в месяц', 'PDF без водяного знака', 'До 6 перегенераций/день', 'Презентации (12/18 сл.)']
  return (
    <div className="bg-white/80 rounded-xl px-4 py-3 max-w-[220px] mx-auto">
      <div className="text-[10px] font-semibold text-[#1e293b] mb-1.5">Вам будет доступно:</div>
      {features.map(f => (
        <div key={f} className="flex items-center gap-1.5 mb-1 last:mb-0">
          <svg className="w-3 h-3 text-[#8C52FF] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span className="text-[9px] text-[#475569]">{f}</span>
        </div>
      ))}
    </div>
  )
}

function IllustrationTaskTypes() {
  const types = ['Открытый вопрос', 'Соотнесение', 'Вставка пропуска']
  return (
    <div className="flex items-start justify-center gap-3">
      <div className="bg-white/50 rounded-lg px-3 py-1.5 text-[9px] text-[#94a3b8] border border-[#e2e8f0]">
        <span className="text-[8px] text-[#a5a0c0] block mb-0.5">ТИП ЗАДАНИЯ</span>
        ...
      </div>
      <div className="bg-white rounded-xl shadow-lg border border-[#e2e8f0] py-1 min-w-[120px]">
        {types.map((t, i) => (
          <div
            key={t}
            className={`px-3 py-1.5 text-[10px] cursor-default ${
              i === 0 ? 'text-[#8C52FF] bg-[#f8f5ff] font-medium' : 'text-[#475569]'
            }`}
          >
            {t}
          </div>
        ))}
      </div>
    </div>
  )
}

function IllustrationCounter() {
  return (
    <div className="flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] px-4 py-2.5 flex items-center gap-3">
        <div className="flex items-center gap-2 bg-[#f8f5ff] rounded-full px-3 py-1.5 border border-[#ede9fe]">
          <svg className="w-3.5 h-3.5 text-[#7c3aed]" fill="currentColor" viewBox="0 0 20 20">
            <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
          </svg>
          <span className="text-xs font-semibold text-[#7c3aed]">Генераций: 141</span>
        </div>
        <div className="w-6 h-6 rounded-full bg-[#f8f5ff] border border-[#ede9fe] flex items-center justify-center">
          <span className="text-[#7c3aed] text-xs font-bold">+</span>
        </div>
      </div>
    </div>
  )
}

function IllustrationPdfStyles() {
  return (
    <div className="flex items-end justify-center gap-3">
      {/* Standard */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-[42px] h-[56px] bg-white rounded border border-[#e2e8f0] p-1.5 shadow-sm">
          <div className="h-[3px] bg-[#e2e8f0] rounded-sm mb-1" />
          <div className="h-[2px] bg-[#e2e8f0] rounded-sm mb-0.5 w-[70%]" />
          <div className="h-[2px] bg-[#e2e8f0] rounded-sm mb-0.5 w-[90%]" />
          <div className="h-[2px] bg-[#e2e8f0] rounded-sm w-[60%]" />
        </div>
        <span className="text-[7px] text-[#94a3b8]">Стандарт</span>
      </div>
      {/* Rainbow */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-[42px] h-[56px] bg-white rounded border-[1.5px] border-[#8C52FF] p-1.5 shadow-md scale-110">
          <div className="h-[3px] rounded-sm mb-1" style={{ background: 'linear-gradient(to right, #ef4444, #f97316, #eab308, #22c55e, #3b82f6)' }} />
          <div className="h-[2px] bg-[#e2e8f0] rounded-sm mb-0.5 w-[70%]" />
          <div className="h-[2px] bg-[#e2e8f0] rounded-sm mb-0.5 w-[90%]" />
          <div className="h-[2px] bg-[#e2e8f0] rounded-sm w-[60%]" />
        </div>
        <span className="text-[7px] text-[#8C52FF] font-medium">Радуга</span>
      </div>
      {/* Academic */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-[42px] h-[56px] bg-white rounded border border-[#e2e8f0] p-1.5 shadow-sm">
          <div className="h-[3px] bg-[#1e293b] rounded-sm mb-1" />
          <div className="h-[2px] bg-[#e2e8f0] rounded-sm mb-0.5 w-[70%]" />
          <div className="h-[2px] bg-[#e2e8f0] rounded-sm mb-0.5 w-[90%]" />
          <div className="h-[2px] bg-[#e2e8f0] rounded-sm w-[60%]" />
        </div>
        <span className="text-[7px] text-[#94a3b8]">Академич.</span>
      </div>
    </div>
  )
}

function IllustrationPrint() {
  return (
    <div className="flex items-center justify-center gap-3">
      <svg className="w-10 h-10 text-[#8C52FF] opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659" />
      </svg>
      <div className="bg-white rounded-lg px-3 py-2 shadow-sm border border-[#e2e8f0]">
        <div className="text-[9px] text-[#94a3b8] mb-0.5">Макет</div>
        <div className="text-[11px] font-medium text-[#1e293b]">Число страниц: <span className="text-[#8C52FF] font-bold">2</span></div>
      </div>
    </div>
  )
}

function IllustrationUpgrade() {
  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center gap-2 bg-gradient-to-r from-[#8C52FF] to-[#A855F7] rounded-xl px-5 py-2.5 shadow-lg shadow-purple-400/20">
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
        </svg>
        <span className="text-sm font-semibold text-white">Подключить тариф</span>
      </div>
    </div>
  )
}

// =============================================================================
// Tips data
// =============================================================================

interface Tip {
  title: string
  text: string
  illustration: () => ReactNode
}

const TIPS: Tip[] = [
  {
    title: 'Личный кабинет',
    text: 'Чтобы увидеть все сгенерированные материалы, достаточно перейти в личный кабинет',
    illustration: IllustrationCabinet,
  },
  {
    title: 'Тарифы и возможности',
    text: 'Подписка даёт возможность создавать больше материалов, выбирать макеты, создавать улучшенные презентации и многое другое',
    illustration: IllustrationPricing,
  },
  {
    title: 'Тариф Методист',
    text: 'На тарифе Методист вы получаете 60 генераций в месяц, PDF без водяного знака, расширенные презентации (12/18 сл.) и остальные функции',
    illustration: IllustrationFeatures,
  },
  {
    title: 'Перегенерация заданий',
    text: 'Если какое-то задание не понравилось, вы можете изменить тип и перегенерировать его. Для этого нужно оформить подписку',
    illustration: IllustrationTaskTypes,
  },
  {
    title: 'Счётчик генераций',
    text: 'Следить за количеством генераций можно на главном экране и в личном кабинете',
    illustration: IllustrationCounter,
  },
  {
    title: '3 стиля PDF',
    text: 'Задания можно сразу распечатать или скачать — при подключении тарифа вам доступно больше стилей',
    illustration: IllustrationPdfStyles,
  },
  {
    title: 'Совет для печати',
    text: 'Чтобы печатать несколько листов на 1 странице, выберите в настройках принтера: макет — число страниц 2',
    illustration: IllustrationPrint,
  },
  {
    title: 'Больше генераций',
    text: 'Чтобы получить больше генераций, подключите тариф — до 120 генераций в месяц',
    illustration: IllustrationUpgrade,
  },
]

// =============================================================================
// Component
// =============================================================================

interface GenerationLoadingOverlayProps {
  mode: GenerateMode
  progress: number
}

export default function GenerationLoadingOverlay({ mode, progress }: GenerationLoadingOverlayProps) {
  const [currentTip, setCurrentTip] = useState(0)
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in')

  const goToTip = useCallback((index: number) => {
    setFadeState('out')
    setTimeout(() => {
      setCurrentTip(index)
      setFadeState('in')
    }, 300)
  }, [])

  // Auto-rotate tips every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      goToTip((currentTip + 1) % TIPS.length)
    }, 10_000)
    return () => clearInterval(interval)
  }, [currentTip, goToTip])

  const tip = TIPS[currentTip]
  const Illustration = tip.illustration

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/60 backdrop-blur-md transition-all">
      {/* Progress section */}
      <div className="flex flex-col items-center">
        <h3 className="mb-6 text-2xl font-bold text-slate-800">
          {mode === 'worksheet' ? 'Создаем материалы...' : 'Создаем презентацию...'}
        </h3>
        <div className="mx-auto mb-6 h-14 w-14 animate-spin rounded-full border-4 border-slate-200 border-t-[#8C52FF]" />

        <div className="w-full max-w-md px-6">
          <div className="mb-2 flex justify-between items-end text-sm font-medium">
            <span className="text-slate-600">Готово: {Math.round(progress)}%</span>
            <span className="text-xs text-slate-400">Генерация длится в среднем 2-3 минуты</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#8C52FF] to-[#A16BFF] transition-all duration-500 ease-out shadow-[0_0_10px_rgba(140,82,255,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tips carousel — below progress */}
      <div className="mt-10 px-4 sm:px-6 w-full">
        <div className="mx-auto max-w-lg overflow-hidden rounded-2xl bg-white shadow-[0_4px_24px_rgba(140,82,255,0.12)] border border-[#ede9fe]">
          {/* Illustration area */}
          <div
            className={`flex items-center justify-center py-5 px-4 bg-gradient-to-br from-[#f8f5ff] to-[#ede9fe] transition-opacity duration-300 ${
              fadeState === 'out' ? 'opacity-0' : 'opacity-100'
            }`}
            style={{ minHeight: 88 }}
          >
            <Illustration />
          </div>

          {/* Text + dots */}
          <div className="px-5 pt-3.5 pb-4">
            <div
              className={`transition-opacity duration-300 ${
                fadeState === 'out' ? 'opacity-0' : 'opacity-100'
              }`}
            >
              <div className="text-[13px] font-semibold text-[#1e293b] mb-1">
                {tip.title}
              </div>
              <p className="text-[13px] leading-relaxed text-[#64748b]">{tip.text}</p>
            </div>

            {/* Dot indicators */}
            <div className="flex items-center justify-center gap-1.5 mt-3.5">
              {TIPS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goToTip(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === currentTip
                      ? 'w-5 h-[7px] bg-[#8C52FF]'
                      : 'w-[7px] h-[7px] bg-[#d1d5db] hover:bg-[#a5a0c0]'
                  }`}
                  aria-label={`Подсказка ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
