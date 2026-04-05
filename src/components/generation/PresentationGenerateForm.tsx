import type { UseFormReturn } from 'react-hook-form'
import GenerationErrorMessage from './GenerationErrorMessage'
import {
  THEME_PRESETS,
  SLIDE_COUNTS,
  type GeneratePresentationFormValues,
} from '../../constants/generation'

interface PresentationGenerateFormProps {
  form: UseFormReturn<GeneratePresentationFormValues>
  errorText: string | null
  errorCode: string | null
  onOpenBuyModal: () => void
}

export default function PresentationGenerateForm({
  form,
  errorText,
  errorCode,
  onOpenBuyModal,
}: PresentationGenerateFormProps) {
  const watchThemePreset = form.watch('themePreset')
  const watchSlideCount = form.watch('slideCount')

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Theme selector */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-purple-100">
        <h3 className="text-lg font-semibold text-slate-800 text-left mb-4">Стиль оформления</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {THEME_PRESETS.map(theme => (
            <button
              key={theme.value}
              type="button"
              onClick={() => form.setValue('themePreset', theme.value)}
              className={`relative flex items-center gap-4 px-5 py-4 rounded-xl border-2 transition-all text-left ${
                watchThemePreset === theme.value
                  ? 'border-[#8C52FF] bg-purple-50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg ${theme.color} flex-shrink-0`} />
              <div>
                <div className="text-sm font-semibold text-slate-900">{theme.label}</div>
                <div className="text-xs text-slate-500">{theme.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Slide count selector */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-purple-100">
        <h3 className="text-lg font-semibold text-slate-800 text-left mb-4">Количество слайдов</h3>
        <div className="grid grid-cols-3 gap-3">
          {SLIDE_COUNTS.map(sc => (
            <button
              key={sc.value}
              type="button"
              onClick={() => form.setValue('slideCount', sc.value)}
              className={`px-4 py-3 rounded-xl border-2 transition-all text-center ${
                watchSlideCount === sc.value
                  ? 'border-[#8C52FF] bg-purple-50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="text-sm font-semibold text-slate-900">{sc.label}</div>
              <div className="text-xs text-slate-500">{sc.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Error message */}
      {errorText && (
        <GenerationErrorMessage
          errorText={errorText}
          errorCode={errorCode}
          onOpenBuyModal={onOpenBuyModal}
        />
      )}
    </div>
  )
}
