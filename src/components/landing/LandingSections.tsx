import { useRef, useEffect, useState } from 'react'
import StatsSection from './StatsSection'
import SectionDivider from './SectionDivider'
import ServicePitch from './ServicePitch'
import ShowcaseCarousel from './ShowcaseCarousel'

export default function LandingSections() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.05 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`bg-white transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
    >
      <StatsSection />
      <SectionDivider />
      <ServicePitch />
      <ShowcaseCarousel />
    </div>
  )
}
