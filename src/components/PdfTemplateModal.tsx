import { useEffect, useState } from 'react'

export type PdfTemplateId = 'standard' | 'rainbow' | 'academic'

interface PdfTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (templateId: PdfTemplateId) => void
  loading: boolean
  canUseStyles?: boolean // false = only standard available (free plan)
  onUpgrade?: () => void
}

const templates: { id: PdfTemplateId; name: string; description: string }[] = [
  {
    id: 'standard',
    name: 'Стандартный',
    description: 'Классический строгий дизайн УчиОн',
  },
  {
    id: 'rainbow',
    name: 'Радуга',
    description: 'Яркий и красочный, для начальной школы',
  },
  {
    id: 'academic',
    name: 'Академичный',
    description: 'Элегантный стиль для средней и старшей школы',
  },
]

export default function PdfTemplateModal({ isOpen, onClose, onSelect, loading, canUseStyles = true, onUpgrade }: PdfTemplateModalProps) {
  const [selected, setSelected] = useState<PdfTemplateId>('standard')

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose, loading])

  // Reset to standard when opening if styles not available
  useEffect(() => {
    if (isOpen && !canUseStyles) {
      setSelected('standard')
    }
  }, [isOpen, canUseStyles])

  if (!isOpen) return null

  const isLockedStyle = !canUseStyles && selected !== 'standard'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={loading ? undefined : onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
        <div className="relative px-6 pt-6 pb-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-slate-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>

          <h2 className="text-lg font-bold text-center text-gray-900 mb-1">Скачать PDF</h2>
          <p className="text-sm text-gray-500 text-center mb-5">Выберите стиль оформления рабочего листа</p>

          <div className="grid grid-cols-3 gap-3">
            {templates.map((tpl) => {
              const isLocked = !canUseStyles && tpl.id !== 'standard'
              return (
                <button
                  key={tpl.id}
                  onClick={() => setSelected(tpl.id)}
                  disabled={loading}
                  className={`relative rounded-xl border-2 p-3 text-left transition-all ${
                    selected === tpl.id
                      ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-200'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  } disabled:opacity-60`}
                >
                  {/* Preview thumbnail */}
                  <div className={`rounded-lg mb-3 h-28 flex items-center justify-center overflow-hidden ${
                    tpl.id === 'standard' ? 'bg-gray-50' : tpl.id === 'rainbow' ? 'bg-pink-50' : 'bg-amber-50/60'
                  } ${isLocked ? 'opacity-50' : ''}`}>
                    {tpl.id === 'standard' ? <StandardPreview /> : tpl.id === 'rainbow' ? <RainbowPreview /> : <AcademicPreview />}
                  </div>

                  <div className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
                    {tpl.name}
                    {isLocked && (
                      <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{tpl.description}</div>

                  {selected === tpl.id && !isLocked && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  {isLocked && selected === tpl.id && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="px-6 pb-6 pt-2">
          {isLockedStyle ? (
            <div>
              <button
                onClick={onUpgrade}
                className="w-full h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
                Доступно по подписке
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">Дополнительные стили PDF доступны с тарифа Начинающий</p>
            </div>
          ) : (
            <button
              onClick={() => onSelect(selected)}
              disabled={loading}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Генерация PDF...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Скачать
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* Mini-preview of the Standard template */
function StandardPreview() {
  return (
    <div className="w-full h-full p-2 flex flex-col gap-1 text-[6px] leading-tight">
      <div className="flex justify-between items-start">
        <span className="font-bold text-indigo-600 text-[8px]">УчиОн</span>
        <div className="flex flex-col items-end gap-0.5">
          <div className="w-12 h-[3px] bg-gray-200 rounded" />
          <div className="w-10 h-[3px] bg-gray-200 rounded" />
        </div>
      </div>
      <div className="h-[1px] bg-gray-200 my-0.5" />
      <div className="text-center font-bold text-[7px] text-gray-700">Тема урока</div>
      <div className="flex items-center gap-1 mt-1">
        <div className="w-3 h-3 bg-indigo-500 rounded text-white flex items-center justify-center text-[5px] font-bold shrink-0">E</div>
        <span className="font-bold text-gray-700">Задания</span>
      </div>
      <div className="flex flex-col gap-1 ml-1 mt-0.5">
        <div className="flex gap-1 items-start">
          <span className="text-indigo-500 font-bold">1.</span>
          <div className="flex-1">
            <div className="w-full h-[3px] bg-gray-200 rounded" />
            <div className="w-3/4 h-[3px] bg-gray-200 rounded mt-0.5" />
            <div className="h-4 border border-dashed border-gray-200 rounded mt-1" />
          </div>
        </div>
        <div className="flex gap-1 items-start">
          <span className="text-indigo-500 font-bold">2.</span>
          <div className="flex-1">
            <div className="w-full h-[3px] bg-gray-200 rounded" />
            <div className="h-4 border border-dashed border-gray-200 rounded mt-1" />
          </div>
        </div>
      </div>
    </div>
  )
}

/* Mini-preview of the Rainbow template */
function RainbowPreview() {
  return (
    <div className="w-full h-full flex flex-col text-[6px] leading-tight overflow-hidden">
      {/* Pink header */}
      <div className="bg-pink-300 px-2 py-1.5 flex items-center gap-1 relative">
        <div className="w-4 h-4 rounded-full bg-yellow-300 shrink-0" />
        <div className="w-2 h-2 rounded-full bg-pink-200 shrink-0" />
        <span className="font-bold text-[7px] text-gray-800">УчиОн</span>
        <div className="ml-auto w-5 h-5 rounded-full bg-sky-400 shrink-0" />
      </div>
      <div className="p-2 flex flex-col gap-1">
        {/* Topic */}
        <div className="text-center">
          <span className="inline-block bg-yellow-300 text-[6px] font-bold px-2 py-0.5 rounded-full text-gray-800">Тема урока</span>
        </div>
        {/* Section */}
        <div className="flex items-center gap-0.5">
          <div className="w-1 h-3 bg-purple-400 rounded-sm" />
          <span className="bg-green-400 text-white text-[5px] font-bold px-1.5 py-0.5 rounded-r-full">Задания</span>
        </div>
        {/* Tasks */}
        <div className="flex flex-col gap-1 ml-0.5">
          <div className="flex gap-1 items-start">
            <div className="w-3 h-3 rounded-full bg-green-500 text-white flex items-center justify-center text-[5px] font-bold shrink-0">1</div>
            <div className="flex-1">
              <div className="w-full h-[3px] bg-gray-200 rounded" />
              <div className="w-10 border-b-2 border-dotted border-gray-300 mt-1" />
            </div>
          </div>
          <div className="flex gap-1 items-start">
            <div className="w-3 h-3 rounded-full bg-orange-500 text-white flex items-center justify-center text-[5px] font-bold shrink-0">2</div>
            <div className="flex-1">
              <div className="w-full h-[3px] bg-gray-200 rounded" />
              <div className="w-8 border-b-2 border-dotted border-gray-300 mt-1" />
            </div>
          </div>
        </div>
        {/* Dots */}
        <div className="flex justify-center gap-[3px] mt-0.5">
          {['bg-pink-300','bg-yellow-300','bg-blue-300','bg-green-300','bg-purple-300','bg-orange-300','bg-pink-300','bg-cyan-300'].map((c, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full ${c}`} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* Mini-preview of the Academic template */
function AcademicPreview() {
  return (
    <div className="w-full h-full p-2 flex flex-col gap-1 text-[6px] leading-tight">
      {/* Header */}
      <div className="flex justify-between items-start">
        <span className="font-bold text-[8px] text-gray-800">УчиОн</span>
        <div className="flex flex-col items-end gap-0.5">
          <div className="w-12 h-[3px] bg-[#c4a882]/40 rounded" />
          <div className="w-10 h-[3px] bg-[#c4a882]/40 rounded" />
        </div>
      </div>
      <div className="h-[2px] bg-[#c4a882] rounded-full" />
      {/* Topic */}
      <div className="mt-1">
        <span className="font-bold text-[7px] text-gray-800">Тема урока</span>
        <div className="h-[2px] w-14 bg-[#c4a882] rounded-full mt-[1px]" />
      </div>
      {/* Section badge */}
      <div className="mt-1">
        <span className="inline-block bg-[#c4a882] text-white text-[5px] font-bold px-1.5 py-[2px] rounded-[2px]">Задания</span>
      </div>
      {/* Tasks */}
      <div className="flex flex-col gap-1 mt-0.5">
        <div className="flex gap-1 items-start">
          <div className="w-3 h-3 rounded-[2px] bg-gray-800 text-white flex items-center justify-center text-[5px] font-bold shrink-0">1</div>
          <div className="flex-1">
            <div className="w-full h-[3px] bg-gray-200 rounded" />
            <div className="w-3/4 h-[3px] bg-gray-200 rounded mt-0.5" />
            <div className="w-full h-[1px] bg-[#c4a882] mt-1.5" />
          </div>
        </div>
        <div className="flex gap-1 items-start">
          <div className="w-3 h-3 rounded-[2px] bg-gray-800 text-white flex items-center justify-center text-[5px] font-bold shrink-0">2</div>
          <div className="flex-1">
            <div className="w-full h-[3px] bg-gray-200 rounded" />
            <div className="w-full h-[1px] bg-[#c4a882] mt-1.5" />
          </div>
        </div>
      </div>
    </div>
  )
}
