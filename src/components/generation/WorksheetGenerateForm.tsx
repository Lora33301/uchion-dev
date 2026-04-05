import { Controller } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import CustomSelect from '../ui/CustomSelect'
import GenerationErrorMessage from './GenerationErrorMessage'
import {
  DIFFICULTIES,
  FORMATS,
  TASK_TYPES,
  type TaskTypeId,
  type GenerateFormValues,
} from '../../constants/generation'

interface WorksheetGenerateFormProps {
  form: UseFormReturn<GenerateFormValues>
  currentFormat: typeof FORMATS[number] | undefined
  currentVariant: typeof FORMATS[number]['variants'][number] | undefined
  generationCost: number
  showAdvanced: boolean
  errorText: string | null
  errorCode: string | null
  onToggleTaskType: (typeId: TaskTypeId) => void
  onOpenBuyModal: () => void
  user: { id: string } | null
  folders: { id: string; name: string }[]
}

export default function WorksheetGenerateForm({
  form,
  currentFormat,
  currentVariant,
  showAdvanced,
  errorText,
  errorCode,
  onToggleTaskType,
  onOpenBuyModal,
  user,
  folders,
}: WorksheetGenerateFormProps) {
  const watchFormat = form.watch('format')
  const watchVariantIndex = form.watch('variantIndex')
  const watchTaskTypes = form.watch('taskTypes')

  if (!showAdvanced) {
    return (
      <>
        {/* Folder selector when advanced is collapsed — only for authenticated users with folders */}
        {user && folders.length > 0 && (
          <div className="w-full bg-white rounded-2xl p-6 shadow-sm border border-purple-100">
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
        {/* Error message */}
        {errorText && (
          <GenerationErrorMessage
            errorText={errorText}
            errorCode={errorCode}
            onOpenBuyModal={onOpenBuyModal}
          />
        )}
      </>
    )
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Folder selector */}
      {user && folders.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-purple-100">
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
