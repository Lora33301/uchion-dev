import type { GenerateMode } from './types'

interface GenerationLoadingOverlayProps {
  mode: GenerateMode
  progress: number
}

export default function GenerationLoadingOverlay({ mode, progress }: GenerationLoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-md transition-all">
      <div className="w-full max-w-xl px-6 text-center">
        <h3 className="mb-6 text-2xl font-bold text-slate-800">
          {mode === 'worksheet' ? 'Создаем материалы...' : 'Создаем презентацию...'}
        </h3>
        <div className="mx-auto mb-6 h-14 w-14 animate-spin rounded-full border-4 border-slate-200 border-t-[#8C52FF]" />

        <div className="w-full text-left">
          <div className="mb-2 flex justify-between items-end text-sm font-medium">
            <span className="text-slate-600">Готово: {Math.round(progress)}%</span>
            <span className="text-xs text-slate-400">Генерация длится в среднем 2-3 минуты</span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-slate-200 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#8C52FF] to-[#A16BFF] transition-all duration-300 ease-out shadow-[0_0_10px_rgba(140,82,255,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
