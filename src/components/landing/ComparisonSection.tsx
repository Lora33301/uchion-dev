const BLOCKS = [
  {
    title: 'Создание урока',
    manual: { time: '2-3 часа', items: ['Ищешь материал в интернете', 'Используешь слабые версии ИИ', 'Делаешь тест с нуля', 'Вёрстка в Word'] },
    uchion: { time: '1 минута', items: ['Указываешь предмет, класс, тему', 'Получаешь готовые задания + тест', 'Выбираешь стиль оформления', 'Распечатываешь и ведёшь урок'] },
  },
  {
    title: 'Презентации',
    manual: { time: '2-4 часа', items: ['Поиск информации', 'Ручная вёрстка слайдов'] },
    uchion: { time: '2-3 минуты', items: ['Готовая презентация к уроку', 'Всё в одном месте с заданиями', 'Скачиваешь PPTX и используешь'] },
  },
  {
    title: 'Задания и тесты',
    manual: { time: '—', items: ['1-2 варианта для всех', 'Сложно подстроить под уровень', 'Нет выбора оформления'] },
    uchion: { time: 'Гибко', items: ['Выбираешь уровень сложности', '5 типов заданий на выбор', 'Редактируешь любой вопрос', 'Замена задания в 1 клик'] },
  },
  {
    title: 'Печать материала',
    manual: { time: '—', items: ['Форматирование под печать', 'Ч/б или цвет — отдельная работа'] },
    uchion: { time: 'Сразу', items: ['PDF готов к печати', '3 стиля оформления', 'Переключение в 1 клик'] },
  },
]

export default function ComparisonSection() {
  return (
    <section className="py-[72px]">
      <div className="max-w-[760px] mx-auto px-5">
        <p className="text-xs font-semibold uppercase tracking-[1.5px] text-[#8C52FF] text-center mb-3">Сравнение</p>
        <h2 className="text-[28px] font-extrabold text-center leading-tight tracking-tight mb-3">Вручную или с УчиОн</h2>
        <p className="text-[15px] text-[#64748b] text-center max-w-[520px] mx-auto mb-9">
          Посмотрите, сколько времени вы экономите
        </p>

        <div className="flex flex-col gap-10">
          {BLOCKS.map((block) => (
            <div key={block.title}>
              <h3 className="text-lg font-bold text-center mb-4">{block.title}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Вручную */}
                <div className="rounded-[14px] p-5 bg-[#f9f8fa] border border-[#eae8ed]">
                  <span className="inline-block text-[11px] font-semibold uppercase tracking-wide bg-[#f1f0f3] text-[#64748b] px-2 py-0.5 rounded-[5px] mb-1.5">Вручную</span>
                  <div className="text-2xl font-extrabold text-[#94a3b8] leading-none mb-2.5">{block.manual.time}</div>
                  <div className="flex flex-col gap-1.5">
                    {block.manual.items.map((item) => (
                      <div key={item} className="text-[13px] text-[#475569] leading-normal pl-3.5 relative">
                        <span className="absolute left-0 top-[7px] w-[5px] h-[5px] rounded-full bg-[#cbd5e1]" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                {/* С УчиОн */}
                <div className="rounded-[14px] p-5 bg-[#faf8ff] border border-[#e8deff]">
                  <span className="inline-block text-[11px] font-semibold uppercase tracking-wide bg-[#ede9fe] text-[#8C52FF] px-2 py-0.5 rounded-[5px] mb-1.5">С УчиОн</span>
                  <div className="text-2xl font-extrabold text-[#8C52FF] leading-none mb-2.5">{block.uchion.time}</div>
                  <div className="flex flex-col gap-1.5">
                    {block.uchion.items.map((item) => (
                      <div key={item} className="text-[13px] text-[#475569] leading-normal pl-3.5 relative">
                        <span className="absolute left-0 top-[7px] w-[5px] h-[5px] rounded-full bg-[#8C52FF]" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
