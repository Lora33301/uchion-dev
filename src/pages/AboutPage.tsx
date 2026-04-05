import Header from '../components/Header'
import SubjectsMarquee from '../components/landing/SubjectsMarquee'
import FeaturesGrid from '../components/landing/FeaturesGrid'
import SectionDivider from '../components/landing/SectionDivider'
import ComparisonSection from '../components/landing/ComparisonSection'
import PdfStylesShowcase from '../components/landing/PdfStylesShowcase'
import AudienceSection from '../components/landing/AudienceSection'
import InteractiveSteps from '../components/landing/InteractiveSteps'
import PricingPreview from '../components/landing/PricingPreview'
import { useNavigate } from 'react-router-dom'

export default function AboutPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <Header />

      {/* Hero */}
      <section className="text-center pt-20 pb-12 px-6">
        <h1 className="text-4xl sm:text-[36px] font-extrabold leading-tight tracking-tight mb-4">
          Всё для подготовки к урокам —<br />в <span className="text-[#8C52FF]">УчиОн</span>
        </h1>
        <p className="text-base text-[#64748b] leading-relaxed max-w-[540px] mx-auto">
          Создавайте рабочие листы, тесты и презентации с помощью ИИ. Больше не нужно тратить вечера на подготовку.
        </p>
      </section>

      <SubjectsMarquee />
      <FeaturesGrid />
      <SectionDivider />
      <ComparisonSection />
      <SectionDivider />
      <PdfStylesShowcase />
      <SectionDivider />
      <AudienceSection />
      <SectionDivider />
      <InteractiveSteps />
      <SectionDivider />
      <PricingPreview />

      {/* Bottom CTA */}
      <section className="text-center py-12 pb-20 px-6">
        <p className="text-base text-[#64748b] mb-5">
          Создайте первый рабочий лист прямо сейчас — это бесплатно
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-8 py-3.5 bg-[#8C52FF] text-white rounded-xl text-[15px] font-semibold shadow-[0_4px_16px_rgba(140,82,255,0.25)] hover:bg-[#7B3FEE] transition-all"
        >
          Создать рабочий лист
        </button>
      </section>
    </div>
  )
}
