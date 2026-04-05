import StatsSection from './StatsSection'
import SectionDivider from './SectionDivider'
import ServicePitch from './ServicePitch'
import ShowcaseCarousel from './ShowcaseCarousel'

export default function LandingSections() {
  return (
    <div className="bg-white">
      <StatsSection />
      <SectionDivider />
      <ServicePitch />
      <ShowcaseCarousel />
    </div>
  )
}
