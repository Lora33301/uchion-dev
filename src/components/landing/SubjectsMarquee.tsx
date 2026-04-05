import { useRef, useEffect } from 'react'

const CHIPS = [
  'Математика \u00b7 1-6 класс',
  'Алгебра \u00b7 7-11 класс',
  'Геометрия \u00b7 7-11 класс',
  'Русский язык \u00b7 1-11 класс',
  '5 типов заданий',
  '3 уровня сложности',
  '3 стиля PDF',
  'Презентации PPTX',
]

// 4 copies for seamless scroll
const ALL_CHIPS = [...CHIPS, ...CHIPS, ...CHIPS, ...CHIPS]

export default function SubjectsMarquee() {
  const trackRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  const oneSetWidthRef = useRef(0)
  const pausedRef = useRef(false)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    // Measure width of one set of chips
    const chipEls = track.children
    const gap = 12
    let w = 0
    for (let i = 0; i < CHIPS.length && i < chipEls.length; i++) {
      w += (chipEls[i] as HTMLElement).offsetWidth + gap
    }
    oneSetWidthRef.current = w

    let raf: number
    function tick() {
      if (!pausedRef.current) {
        offsetRef.current += 0.6
        if (offsetRef.current >= oneSetWidthRef.current) {
          offsetRef.current -= oneSetWidthRef.current
        }
        track!.style.transform = `translateX(-${offsetRef.current}px)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      className="py-8 overflow-hidden border-y border-[#f1eef9] relative"
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
    >
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-[60px] bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-[60px] bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

      <div ref={trackRef} className="flex gap-3 will-change-transform" style={{ width: 'max-content' }}>
        {ALL_CHIPS.map((text, i) => (
          <div
            key={i}
            className="px-[18px] py-2 rounded-[20px] text-[13px] font-medium whitespace-nowrap bg-[#faf8ff] border border-[#ede9fe] text-[#6d28d9]"
          >
            {text}
          </div>
        ))}
      </div>
    </div>
  )
}
