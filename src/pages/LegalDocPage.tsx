import { useParams, Navigate } from 'react-router-dom'
import Header from '../components/Header'
import agreementData from '../data/agreement.json'
import privacyData from '../data/privacy.json'
import consentData from '../data/consent.json'
import consentAdsData from '../data/consent_ads.json'

type Paragraph = { t: string; b: boolean; l?: boolean }

const docs: Record<string, { title: string; data: Paragraph[] }> = {
  'user-agreement': {
    title: 'Пользовательское соглашение',
    data: agreementData as Paragraph[],
  },
  'privacy-policy': {
    title: 'Политика конфиденциальности',
    data: privacyData as Paragraph[],
  },
  'data-consent': {
    title: 'Согласие на обработку данных',
    data: consentData as Paragraph[],
  },
  'ads-consent': {
    title: 'Согласие на получение рассылки рекламных материалов',
    data: consentAdsData as Paragraph[],
  },
}

export default function LegalDocPage() {
  const { slug } = useParams<{ slug: string }>()
  const doc = slug ? docs[slug] : undefined

  if (!doc) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-50">
      <Header />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 pb-16">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">{doc.title}</h1>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-10">
          <div className="text-sm text-slate-700 leading-relaxed">
            {doc.data.map((p, i) => {
              if (!p.t) return <div key={i} className="h-3" />

              if (p.l) {
                return (
                  <p key={i} className={`pl-6 relative before:content-['•'] before:absolute before:left-2 before:text-slate-400 ${p.b ? 'font-semibold text-slate-900' : ''}`}>
                    {p.t}
                  </p>
                )
              }

              if (p.b) {
                return <p key={i} className="font-semibold text-slate-900 mt-4 mb-1">{p.t}</p>
              }

              return <p key={i} className="mb-1">{p.t}</p>
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
