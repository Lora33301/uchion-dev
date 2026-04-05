const FEATURES = [
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
    title: '5 типов заданий',
    desc: 'Единственный и множественный выбор, открытые вопросы, соотнесение, вставка пропусков',
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
    title: 'Презентации к урокам',
    desc: 'Готовые PPTX с 10 типами слайдов. 3 темы оформления, до 18 слайдов',
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 20V10M18 20V4M6 20v-4"/></svg>,
    title: 'Уровни сложности',
    desc: 'Базовый, средний и повышенный \u2014 подбирайте под уровень каждого ученика',
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    title: 'Редактирование',
    desc: 'Измените любой вопрос, вариант ответа или формулировку прямо на сайте',
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
    title: 'Перегенерация заданий',
    desc: 'Не понравилось задание \u2014 замените его в 1 клик, выбрав другой тип',
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>,
    title: 'Личный кабинет',
    desc: 'Все материалы сохраняются. Папки, поиск и быстрый доступ к истории',
  },
]

export default function FeaturesGrid() {
  return (
    <section className="py-[72px]">
      <div className="max-w-[760px] mx-auto px-5">
        <p className="text-xs font-semibold uppercase tracking-[1.5px] text-[#8C52FF] text-center mb-3">Возможности</p>
        <h2 className="text-[28px] font-extrabold text-center leading-tight tracking-tight mb-3">Что умеет УчиОн</h2>
        <p className="text-[15px] text-[#64748b] text-center max-w-[520px] mx-auto mb-9">
          Всё, что нужно для подготовки к урокам, в одном сервисе
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="p-5 rounded-[14px] border border-[#f1eef9] hover:border-[#e8deff] hover:bg-[#faf8ff] transition-all">
              <div className="w-10 h-10 rounded-[10px] bg-[#f3eeff] flex items-center justify-center text-[#8C52FF] mb-3">
                {f.icon}
              </div>
              <h3 className="text-sm font-bold mb-1">{f.title}</h3>
              <p className="text-xs text-[#64748b] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
