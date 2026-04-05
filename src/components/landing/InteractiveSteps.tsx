import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const STEPS = [
  { num: '01', title: 'Укажите предмет, класс и тему', desc: 'Выберите из списка или напишите свою тему. Настройте тип заданий и уровень сложности \u2014 или оставьте по умолчанию.' },
  { num: '02', title: 'ИИ создаёт материал', desc: 'Генерация занимает меньше минуты. Каждое задание проходит многоагентную проверку \u2014 ошибки исправляются автоматически.' },
  { num: '03', title: 'Скачайте PDF и ведите урок', desc: 'Готовый рабочий лист можно сразу распечатать. Или отредактируйте любое задание, замените тип и скачайте заново.' },
]

export default function InteractiveSteps() {
  const [active, setActive] = useState(0)
  const navigate = useNavigate()

  return (
    <section className="py-[72px]">
      <div className="max-w-[760px] mx-auto px-5">
        <p className="text-xs font-semibold uppercase tracking-[1.5px] text-[#8C52FF] text-center mb-3">Начало работы</p>
        <h2 className="text-[28px] font-extrabold text-center leading-tight tracking-tight mb-10">
          От темы до готового листа — за минуту
        </h2>

        {/* Horizontal step nav */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {STEPS.map((step, i) => (
            <div key={step.num} className="flex items-center">
              <button
                onClick={() => setActive(i)}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold transition-all relative z-10 ${
                  i === active
                    ? 'bg-[#8C52FF] text-white border-2 border-[#8C52FF] shadow-[0_4px_16px_rgba(140,82,255,0.3)]'
                    : i < active
                      ? 'bg-[#ede9fe] text-[#8C52FF] border-2 border-[#ede9fe]'
                      : 'bg-white text-[#a5a0c0] border-2 border-[#ede9fe]'
                }`}
              >
                {step.num}
              </button>
              {i < STEPS.length - 1 && (
                <div className="w-20 sm:w-20 h-0.5 relative">
                  <div className="absolute inset-0 bg-[#ede9fe]" />
                  <div className={`absolute inset-y-0 left-0 bg-[#8C52FF] transition-all duration-300 ${i < active ? 'right-0' : 'right-full'}`} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="text-center min-h-[100px]">
          <h3 className="text-lg font-bold mb-2">{STEPS[active].title}</h3>
          <p className="text-sm text-[#64748b] leading-relaxed max-w-[420px] mx-auto">
            {STEPS[active].desc}
          </p>
        </div>

        {/* CTA */}
        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3.5 bg-[#8C52FF] text-white rounded-xl text-[15px] font-semibold shadow-[0_4px_16px_rgba(140,82,255,0.25)] hover:bg-[#7B3FEE] transition-all"
          >
            Попробовать бесплатно
          </button>
        </div>
      </div>
    </section>
  )
}
