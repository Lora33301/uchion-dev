import { Controller } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import CustomSelect from '../ui/CustomSelect'
import GenerationErrorMessage from './GenerationErrorMessage'
import {
  SUBJECTS,
  DIFFICULTIES,
  FORMATS,
  TASK_TYPES,
  type Subject,
  type TaskTypeId,
  type GenerateFormValues,
} from '../../constants/generation'

interface WorksheetGenerateFormProps {
  form: UseFormReturn<GenerateFormValues>
  availableGrades: number[]
  currentFormat: typeof FORMATS[number] | undefined
  currentVariant: typeof FORMATS[number]['variants'][number] | undefined
  generationCost: number
  showAdvanced: boolean
  isPending: boolean
  isDisabled: boolean
  errorText: string | null
  errorCode: string | null
  generationsExhausted: boolean
  onSubjectChange: (subject: Subject) => void
  onToggleAdvanced: () => void
  onToggleTaskType: (typeId: TaskTypeId) => void
  onOpenBuyModal: () => void
  onSubmit: (values: GenerateFormValues) => void
  user: { id: string } | null
  folders: { id: string; name: string }[]
}

export default function WorksheetGenerateForm({
  form,
  availableGrades,
  currentFormat,
  currentVariant,
  generationCost,
  showAdvanced,
  isPending,
  isDisabled,
  errorText,
  errorCode,
  generationsExhausted,
  onSubjectChange,
  onToggleAdvanced,
  onToggleTaskType,
  onOpenBuyModal,
  onSubmit,
  user,
  folders,
}: WorksheetGenerateFormProps) {
  const watchFormat = form.watch('format')
  const watchVariantIndex = form.watch('variantIndex')
  const watchTaskTypes = form.watch('taskTypes')
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
          <label className="block text-sm font-semibold text-slate-700 text-left mb-2">Тема урока</label>
          <input
            type="text"
            className="h-14 w-full rounded-xl border border-slate-200 bg-white px-5 text-lg text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-[#8C52FF] focus:ring-4 focus:ring-[#8C52FF]/10"
            placeholder="Например: Сложение двузначных чисел"
            {...form.register('topic')}
          />
          {form.formState.errors.topic && (
            <p className="text-sm text-red-500 text-left mt-1">{form.formState.errors.topic.message}</p>
          )}
        </div>

        {/* Folder selector - only for authenticated users with folders */}
        {user && folders.length > 0 && (
          <div className="mb-6">
            <Controller
              control={form.control}
              name="folderId"
              render={({ field }) => (
                <CustomSelect
                  label="Сохранить в папку"
                  value={field.value ?? ''}
                  onChange={(val) => field.onChange(val === '' ? null : val)}
                  options={[
                    { label: 'Без папки', value: '' },
                    ...folders.map(f => ({ label: f.name, value: f.id }))
                  ]}
                />
              )}
            />
          </div>
        )}

        {/* Bottom action row: Advanced settings toggle + Create button */}
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          <button
            type="button"
            onClick={onToggleAdvanced}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-700 font-medium hover:border-slate-300 transition-all"
          >
            <span>
              {currentVariant
                ? `${currentVariant.openTasks + currentVariant.testQuestions} заданий`
                : '5 заданий'
              }
            </span>
            <svg
              className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

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
                  {generationCost}
                </span>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Advanced settings - collapsible */}
      {showAdvanced && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Format selection card */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-purple-100">
            <h3 className="text-lg font-semibold text-slate-800 text-left mb-5">Формат листа</h3>

            {/* Format tabs */}
            <div className="flex gap-3 mb-6 flex-wrap">
              {FORMATS.map(format => (
                <button
                  key={format.id}
                  type="button"
                  onClick={() => {
                    form.setValue('format', format.id)
                    form.setValue('variantIndex', 0)
                  }}
                  className={`px-5 py-3 rounded-xl text-sm font-medium transition-all border-2 ${
                    watchFormat === format.id
                      ? 'border-[#8C52FF] bg-purple-50 text-slate-800'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                  }`}
                >
                  {format.name}
                </button>
              ))}
            </div>

            {/* Variant selection */}
            {currentFormat && (
              <div className="flex gap-4 flex-wrap">
                {currentFormat.variants.map((variant, idx) => {
                  const description = variant.openTasks > 0 && variant.testQuestions > 0
                    ? `${variant.openTasks} заданий + ${variant.testQuestions} тест. вопросов`
                    : variant.openTasks > 0
                    ? `${variant.openTasks} заданий`
                    : `${variant.testQuestions} тест. вопросов`

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => form.setValue('variantIndex', idx)}
                      className={`flex items-center gap-3 px-5 py-4 rounded-xl border-2 transition-all ${
                        watchVariantIndex === idx
                          ? 'border-[#8C52FF] bg-purple-50 text-slate-800'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                      }`}
                    >
                      <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                        watchVariantIndex === idx ? 'bg-[#8C52FF] text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {variant.generations}
                      </span>
                      <div className="text-left">
                        <div className="text-sm font-medium">{description}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Difficulty selection */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-purple-100">
            <h3 className="text-lg font-semibold text-slate-800 text-left mb-5">Уровень сложности</h3>
            <div className="flex gap-4 flex-wrap">
              {DIFFICULTIES.map(diff => (
                <button
                  key={diff.value}
                  type="button"
                  onClick={() => form.setValue('difficulty', diff.value)}
                  className={`flex-1 min-w-[140px] px-5 py-4 rounded-xl border-2 transition-all ${
                    form.watch('difficulty') === diff.value
                      ? 'border-[#8C52FF] bg-purple-50 text-slate-800'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                  }`}
                >
                  <div className="text-sm font-semibold">{diff.label}</div>
                  <div className="text-xs text-slate-500 mt-1">{diff.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Task types selection */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-purple-100">
            <h3 className="text-lg font-semibold text-slate-800 text-left mb-5">Типы заданий</h3>
            <div className="flex gap-3 flex-wrap">
              {TASK_TYPES.map(type => {
                const isSelected = watchTaskTypes.includes(type.id)
                const formatAllowsType =
                  (type.category === 'test' && (currentVariant?.testQuestions || 0) > 0) ||
                  (type.category === 'open' && (currentVariant?.openTasks || 0) > 0)

                if (!formatAllowsType) return null

                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => onToggleTaskType(type.id)}
                    className={`px-5 py-3 rounded-xl text-sm font-medium transition-all border-2 ${
                      isSelected
                        ? 'border-[#8C52FF] bg-purple-50 text-slate-800'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                    }`}
                  >
                    {type.name}
                  </button>
                )
              })}
            </div>
            {form.formState.errors.taskTypes && (
              <p className="text-sm text-red-500 text-left mt-2">Выберите хотя бы один тип задания</p>
            )}
          </div>
        </div>
      )}

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
