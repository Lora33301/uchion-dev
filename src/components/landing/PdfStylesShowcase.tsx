const STYLES = [
  { name: 'Стандартный', desc: 'Классический строгий дизайн УчиОн', img: '/images/pdf-styles/standard.png', pdf: '/docs/standard.pdf' },
  { name: 'Радуга', desc: 'Яркий и красочный, для начальной школы', img: '/images/pdf-styles/rainbow.png', pdf: '/docs/rainbow.pdf' },
  { name: 'Академичный', desc: 'Элегантный стиль для старшей школы', img: '/images/pdf-styles/academic.png', pdf: '/docs/academic.pdf' },
]

export default function PdfStylesShowcase() {
  return (
    <section className="py-[72px]">
      <div className="max-w-[760px] mx-auto px-5">
        <p className="text-xs font-semibold uppercase tracking-[1.5px] text-[#8C52FF] text-center mb-3">Оформление</p>
        <h2 className="text-[28px] font-extrabold text-center leading-tight tracking-tight mb-3">3 стиля PDF</h2>
        <p className="text-[15px] text-[#64748b] text-center max-w-[520px] mx-auto mb-8">
          Выберите подходящий дизайн для рабочего листа
        </p>
        <div className="flex gap-5 justify-center flex-wrap">
          {STYLES.map((s) => (
            <div key={s.name} className="w-[220px] rounded-[14px] overflow-hidden border border-[#f1eef9] hover:border-[#e8deff] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(140,82,255,0.08)] transition-all text-center relative group">
              <div className="h-[280px] overflow-hidden">
                <img src={s.img} alt={s.name} className="w-full h-full object-cover object-top" loading="lazy" />
              </div>
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-[#8C52FF]/85 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-[14px]">
                <a
                  href={s.pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white text-sm font-semibold flex items-center gap-2 px-5 py-2.5 border-2 border-white/60 rounded-[10px] hover:border-white hover:bg-white/15 transition-all"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  Открыть PDF
                </a>
              </div>
              <div className="py-3 px-3">
                <div className="text-sm font-semibold">{s.name}</div>
                <div className="text-xs text-[#94a3b8]">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
