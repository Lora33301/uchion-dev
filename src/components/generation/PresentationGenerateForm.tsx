import { Controller } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import CustomSelect from '../ui/CustomSelect'
import GenerationErrorMessage from './GenerationErrorMessage'
import {
  SUBJECTS,
  THEME_PRESETS,
  SLIDE_COUNTS,
  type Subject,
  type GeneratePresentationFormValues,
} from '../../constants/generation'

interface PresentationGenerateFormProps {
  form: UseFormReturn<GeneratePresentationFormValues>
  availableGrades: number[]
  presentationCost: number
  isPending: boolean
  isDisabled: boolean
  errorText: string | null
  errorCode: string | null
  generationsExhausted: boolean
  onSubjectChange: (subject: Subject) => void
  onOpenBuyModal: () => void
  onSubmit: (values: GeneratePresentationFormValues) => void
}

export default function PresentationGenerateForm({
  form,
  availableGrades,
  presentationCost,
  isPending,
  isDisabled,
  errorText,
  errorCode,
  generationsExhausted,
  onSubjectChange,
  onOpenBuyModal,
  onSubmit,
}: PresentationGenerateFormProps) {
  const watchThemePreset = form.watch('themePreset')
  const watchSlideCount = form.watch('slideCount')
  const watchSubject = form.watch('subject')
  const hasSubject = !!watchSubject

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
      {/* Main compact card */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-purple-100">
        {/* Subject and Grade row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <Controller
              control={form.control}
              name="subject"
              render={({ field }) => (
                <CustomSelect
                  label="Предмет"
                  value={field.value}
                  onChange={(v) => onSubjectChange(v as Subject)}
                  options={SUBJECTS.map(s => ({ label: s.label, value: s.value }))}
                  placeholder="Выбрать предмет"
                  error={!!form.formState.errors.subject}
                />
              )}
            />
            {form.formState.errors.subject && (
              <p className="text-sm text-red-500 text-left mt-1">{form.formState.errors.subject.message}</p>
            )}
          </div>

          <Controller
            control={form.control}
            name="grade"
            render={({ field }) => (
              <CustomSelect
                label="Класс"
                value={field.value}
                onChange={field.onChange}
                options={availableGrades.map(g => ({ label: `${g} класс`, value: g }))}
                placeholder="Выберите класс"
                disabled={!hasSubject}
              />
            )}
          />
        </div>

        {/* Topic input */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-700 text-left mb-2">Тема презентации</label>
          <input
            type="text"
            className="h-14 w-full rounded-xl border border-slate-200 bg-white px-5 text-lg text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-[#8C52FF] focus:ring-4 focus:ring-[#8C52FF]/10"
            placeholder="Введите тему презентации"
            {...form.register('topic')}
          />
          {form.formState.errors.topic && (
            <p className="text-sm text-red-500 text-left mt-1">{form.formState.errors.topic.message}</p>
          )}
        </div>

        {/* Theme selector */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-700 text-left mb-3">Стиль оформления</label>
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
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-700 text-left mb-3">Количество слайдов</label>
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

        {/* Submit button */}
        <div className="flex justify-end">
          <button
            type={generationsExhausted ? "button" : "submit"}
            onClick={generationsExhausted ? () => onOpenBuyModal() : undefined}
            disabled={isDisabled}
            className="group relative inline-flex h-12 px-8 items-center justify-center overflow-hidden rounded-xl bg-[#A855F7]/80 hover:bg-[#A855F7]/90 text-base font-semibold text-white shadow-md shadow-purple-400/20 transition-all hover:shadow-purple-400/30 disabled:opacity-60 disabled:hover:bg-[#A855F7]/80"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Генерируем...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Создать
                <span className="flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-0.5 text-sm">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                  </svg>
                  {presentationCost}
                </span>
              </span>
            )}
          </button>
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
    </form>
  )
}
