import { useRef, useEffect } from 'react'

const ITEMS = [
  { type: 'Рабочий лист', title: 'Отечественная война 1812', img: '/images/showcase/worksheet-standard.png' },
  { type: 'Рабочий лист \u00b7 Радуга', title: 'Хозяйственная деятельность', img: '/images/showcase/worksheet-rainbow.png' },
  { type: 'Рабочий лист', title: 'Past Perfect Continuous', img: '/images/showcase/worksheet-english.png' },
  { type: 'Презентация', title: 'Функция квадратного корня', img: '/images/showcase/presentation-title.png' },
  { type: 'Презентация \u00b7 слайд', title: 'Определение кв. корня', img: '/images/showcase/presentation-slide.png' },
  { type: 'Рабочий лист \u00b7 Академичный', title: 'Русский язык, 4 класс', img: '/images/showcase/worksheet-academic.png' },
]

// 4 copies for seamless infinite scroll
const CARDS = [...ITEMS, ...ITEMS, ...ITEMS, ...ITEMS]

export default function ShowcaseCarousel() {
  const trackRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  const pausedRef = useRef(false)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const CARD_WIDTH = 260 + 20 // card width + gap
    const oneSetWidth = ITEMS.length * CARD_WIDTH
    let raf: number

    function tick() {
      if (!pausedRef.current) {
        offsetRef.current += 0.6
        if (offsetRef.current >= oneSetWidth) {
          offsetRef.current -= oneSetWidth
        }
        track!.style.transform = `translateX(-${offsetRef.current}px)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <section
      className="pb-20 overflow-hidden relative"
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
    >
      <div ref={trackRef} className="flex gap-5 will-change-transform" style={{ width: 'max-content' }}>
        {CARDS.map((item, i) => (
          <div
            key={i}
            className="w-[260px] h-[340px] bg-[#faf8ff] rounded-2xl border border-[#f1eef9] overflow-hidden flex-shrink-0 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(140,82,255,0.1)] transition-all flex flex-col"
          >
            <div className="flex-1 overflow-hidden">
              <img src={item.img} alt={item.title} className="w-full h-full object-cover object-top" loading="lazy" />
            </div>
            <div className="px-4 py-3 border-t border-[#f1eef9]">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-[#8C52FF] mb-0.5">{item.type}</div>
              <div className="text-[13px] font-medium text-[#475569] truncate">{item.title}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
