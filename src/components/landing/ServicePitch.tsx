import { useNavigate } from 'react-router-dom'

export default function ServicePitch() {
  const navigate = useNavigate()

  return (
    <section className="py-16 text-center max-w-[600px] mx-auto px-6">
      <h2 className="text-4xl font-extrabold text-[#1e293b] leading-tight tracking-tight mb-4">
        Время учить,{'\n'}оставьте подготовку{' '}
        <span className="text-[#8C52FF]">УчиОн</span>
      </h2>
      <p className="text-base text-[#64748b] leading-relaxed mb-8">
        Российский ИИ-помощник, который создаёт материалы к урокам за 3 минуты,
        бережёт ваше время и возвращает любовь к профессии.
      </p>
      <h3 className="text-xl font-bold text-[#1e293b] mb-2">Что может УчиОн?</h3>
      <p className="text-sm text-[#94a3b8] mb-7">
        Делегируйте своему персональному ИИ-агенту ежедневную рутину
      </p>
      <div className="flex gap-3 justify-center flex-wrap">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="px-7 py-3 bg-[#8C52FF] text-white rounded-xl text-sm font-semibold shadow-[0_4px_16px_rgba(140,82,255,0.25)] hover:bg-[#7B3FEE] transition-all"
        >
          Сгенерировать лист
        </button>
        <button
          onClick={() => navigate('/about')}
          className="px-7 py-3 bg-transparent text-[#8C52FF] border-[1.5px] border-[#e8deff] rounded-xl text-sm font-semibold hover:bg-[#faf8ff] transition-all"
        >
          Узнать подробнее &rarr;
        </button>
      </div>
    </section>
  )
}
