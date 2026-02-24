import SlidePreview from '../presentations/SlidePreview'
import type { PresentationStructure } from '../../../shared/types'

interface GeneratedPresentation {
  id: string
  title: string
  pptxBase64: string
  pdfBase64: string
  slideCount: number
  structure: PresentationStructure
}

interface PresentationPreviewProps {
  presentation: GeneratedPresentation
  themePreset: 'professional' | 'kids' | 'school' | undefined
  onDownloadPptx: () => void
  onDownloadPdf: () => void
  onCreateNew: () => void
}

export default function PresentationPreview({
  presentation,
  themePreset,
  onDownloadPptx,
  onDownloadPdf,
  onCreateNew,
}: PresentationPreviewProps) {
  return (
    <div className="w-full mb-6 space-y-6">
      {/* Header with title + action buttons */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-purple-100">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold text-slate-900">{presentation.title}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{presentation.slideCount} слайдов</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onDownloadPptx}
              className="inline-flex h-10 px-5 items-center justify-center rounded-xl bg-[#A855F7]/80 hover:bg-[#A855F7]/90 text-sm font-semibold text-white shadow-md shadow-purple-400/20 transition-all hover:shadow-purple-400/30"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Скачать .pptx
            </button>
            <button
              onClick={onDownloadPdf}
              disabled={!presentation.pdfBase64}
              className="inline-flex h-10 px-5 items-center justify-center rounded-xl bg-red-500/80 hover:bg-red-500/90 text-sm font-semibold text-white shadow-md shadow-red-400/20 transition-all hover:shadow-red-400/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Скачать PDF
            </button>
            <button
              onClick={onCreateNew}
              className="h-10 px-5 rounded-xl border-2 border-slate-200 bg-white text-slate-700 text-sm font-medium hover:border-slate-300 transition-all"
            >
              Создать новую
            </button>
          </div>
        </div>
      </div>

      {/* Slide preview grid */}
      {presentation.structure && (
        <SlidePreview
          structure={presentation.structure}
          themePreset={themePreset}
        />
      )}
    </div>
  )
}
