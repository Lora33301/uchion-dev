import { useQuery } from '@tanstack/react-query'

async function fetchPublicStats(): Promise<{ stats: { users: number; materials: number; hoursSaved: number } }> {
  const res = await fetch('/api/public/stats')
  if (!res.ok) throw new Error('Failed to fetch stats')
  return res.json()
}

function formatNumber(n: number): string {
  return n.toLocaleString('ru-RU')
}

export default function StatsSection() {
  const { data } = useQuery({
    queryKey: ['public-stats'],
    queryFn: fetchPublicStats,
    staleTime: 5 * 60 * 1000,
  })

  const stats = data?.stats

  return (
    <section className="py-20 text-center">
      <p className="text-[15px] font-medium text-[#94a3b8] mb-10">
        Ваши коллеги уже экономят время
      </p>
      <div className="flex justify-center gap-20 flex-wrap px-4">
        <div className="text-center">
          <div className="text-[32px] font-extrabold text-[#8C52FF] leading-none tracking-tight">
            {stats ? formatNumber(stats.users) : '\u2014'}
          </div>
          <div className="text-sm text-[#64748b] mt-2">педагогов доверяют УчиОн</div>
        </div>
        <div className="text-center">
          <div className="text-[32px] font-extrabold text-[#8C52FF] leading-none tracking-tight">
            {stats ? formatNumber(stats.materials) : '\u2014'}
          </div>
          <div className="text-sm text-[#64748b] mt-2">материалов создано</div>
        </div>
        <div className="text-center">
          <div className="text-[32px] font-extrabold text-[#8C52FF] leading-none tracking-tight">
            {stats ? formatNumber(stats.hoursSaved) : '\u2014'}
          </div>
          <div className="text-sm text-[#64748b] mt-2">часов на жизнь вне работы</div>
        </div>
      </div>
    </section>
  )
}
