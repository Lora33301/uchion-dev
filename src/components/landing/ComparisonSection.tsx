const BLOCKS = [
  {
    title: 'Создание урока',
    manual: { time: '2-3 часа', items: ['Ищешь материал в интернете', 'Используешь слабые версии ИИ', 'Делаешь тест с нуля', 'Вёрстка в Word'] },
    uchion: { time: '1 минута', items: ['Указываешь предмет, класс, тему', 'Получаешь готовые задания + тест', 'Выбираешь стиль оформления', 'Распечатываешь и ведёшь урок'] },
  },
  {
    title: 'Презентации',
    manual: { time: '2-4 часа', items: ['Ищешь шаблон в PowerPoint', 'Заполняешь слайды вручную', 'Подбираешь оформление', 'Проверяешь ошибки'] },
    uchion: { time: '2-3 минуты', items: ['Указываешь тему и количество слайдов', 'ИИ генерирует структуру и контент', '3 темы оформления на выбор', 'Скачиваешь готовый PPTX'] },
  },
  {
    title: 'Задания и тесты',
    manual: { time: 'Ограничения', items: ['Однотипные задания из учебника', 'Сложно варьировать сложность', 'Нет автопроверки ответов', 'Мало типов заданий'] },
    uchion: { time: 'Гибкость', items: ['5 типов заданий на выбор', '3 уровня сложности', 'Многоагентная проверка ответов', 'Перегенерация в 1 клик'] },
  },
  {
    title: 'Печать материала',
    manual: { time: 'Ручное форматирование', items: ['Копируешь в Word/Docs', 'Подгоняешь размеры и шрифты', 'Добавляешь нумерацию', 'Сохраняешь в PDF вручную'] },
    uchion: { time: 'Сразу готово', items: ['PDF генерируется автоматически', '3 стиля оформления', 'Лист с ответами включён', 'Печатаешь и раздаёшь'] },
  },
]

export default function ComparisonSection() {
  return (
    <section className="py-[72px]">
      <div className="max-w-[760px] mx-auto px-5">
        <p className="text-xs font-semibold uppercase tracking-[1.5px] text-[#8C52FF] text-center mb-3">Сравнение</p>
        <h2 className="text-[28px] font-extrabold text-center leading-tight tracking-tight mb-9">Вручную или с УчиОн</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {BLOCKS.map((block) => (
            <div key={block.title}>
              <h3 className="text-sm font-bold text-center mb-3">{block.title}</h3>
              <div className="flex flex-col gap-2">
                {/* Manual card */}
                <div className="rounded-[12px] p-4 bg-[#f9f8fa] border border-[#eae8ed]">
                  <div className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-1">Вручную</div>
                  <div className="text-lg font-extrabold text-[#475569] mb-2">{block.manual.time}</div>
                  <ul className="space-y-1">
                    {block.manual.items.map((item) => (
                      <li key={item} className="text-xs text-[#64748b] flex items-start gap-1.5">
                        <span className="text-[#cbd5e1] mt-0.5">{'•'}</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                {/* УчиОн card */}
                <div className="rounded-[12px] p-4 bg-[#faf8ff] border border-[#e8deff]">
                  <div className="text-xs font-semibold text-[#8C52FF] uppercase tracking-wider mb-1">С УчиОн</div>
                  <div className="text-lg font-extrabold text-[#8C52FF] mb-2">{block.uchion.time}</div>
                  <ul className="space-y-1">
                    {block.uchion.items.map((item) => (
                      <li key={item} className="text-xs text-[#64748b] flex items-start gap-1.5">
                        <span className="text-[#8C52FF] mt-0.5">{'•'}</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
