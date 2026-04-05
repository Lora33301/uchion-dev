const AUDIENCES = [
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
    title: 'Учителя начальных классов',
    desc: 'Математика и русский 1\u20144 класс. Яркие листы для малышей',
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 4 3 6 3s6-1 6-3v-5"/></svg>,
    title: 'Учителя-предметники',
    desc: 'Алгебра, геометрия, русский 5\u201411 класс',
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
    title: 'Репетиторы',
    desc: 'Подбирайте сложность под каждого ученика',
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
    title: 'Молодые специалисты',
    desc: 'Быстрый старт без опыта подготовки',
  },
]

export default function AudienceSection() {
  return (
    <section className="py-[72px]">
      <div className="max-w-[760px] mx-auto px-5">
        <p className="text-xs font-semibold uppercase tracking-[1.5px] text-[#8C52FF] text-center mb-3">Для кого</p>
        <h2 className="text-[28px] font-extrabold text-center leading-tight tracking-tight mb-9">Кому подходит УчиОн</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          {AUDIENCES.map((a) => (
            <div key={a.title} className="p-5 rounded-[14px] border border-[#f1eef9] hover:border-[#e8deff] hover:bg-[#faf8ff] transition-all text-center">
              <div className="w-10 h-10 rounded-[10px] bg-[#f3eeff] flex items-center justify-center text-[#8C52FF] mx-auto mb-3">
                {a.icon}
              </div>
              <h3 className="text-sm font-bold mb-1">{a.title}</h3>
              <p className="text-xs text-[#64748b] leading-relaxed">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
