import { Controller } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import CustomSelect from '../ui/CustomSelect'
import {
  DIFFICULTIES,
  FORMATS,
  TASK_TYPES,
  getTaskCountOptions,
  type TaskTypeId,
  type GenerateFormValues,
} from '../../constants/generation'

interface WorksheetGenerateFormProps {
  form: UseFormReturn<GenerateFormValues>
  currentVariant: { openTasks: number; testQuestions: number } | undefined
  onToggleTaskType: (typeId: TaskTypeId) => void
  user: { id: string } | null
  folders: { id: string; name: string }[]
}

export default function WorksheetGenerateForm({
  form,
  currentVariant,
  onToggleTaskType,
  user,
  folders,
}: WorksheetGenerateFormProps) {
  const watchFormat = form.watch('format')
  const watchVariantIndex = form.watch('variantIndex')
  const watchTaskTypes = form.watch('taskTypes')
  const watchDifficulty = form.watch('difficulty')

  return (
    <div className="w-full space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Row 1: Three dropdowns */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Controller
            control={form.control}
            name="variantIndex"
            render={({ field }) => (
              <CustomSelect
                label="Кол-во заданий"
                value={field.value}
                onChange={(val) => field.onChange(val as number)}
                options={getTaskCountOptions(watchFormat)}
              />
            )}
          />
        </div>
        <div className="flex-1">
          <CustomSelect
            label="Сложность"
            value={watchDifficulty}
            onChange={(val) => form.setValue('difficulty', val as typeof watchDifficulty)}
            options={DIFFICULTIES.map(d => ({ label: d.label, value: d.value }))}
          />
        </div>
        <div className="flex-1">
          <CustomSelect
            label="Формат"
            value={watchFormat}
            onChange={(val) => {
              form.setValue('format', val as typeof watchFormat)
              form.setValue('variantIndex', 0)
            }}
            options={FORMATS.map(f => ({ label: f.name, value: f.id }))}
          />
        </div>
      </div>

      {/* Row 2: Task type chips */}
      <div>
        <p className="text-sm font-medium text-[#475569] text-left mb-2.5">Типы заданий</p>
        <div className="flex gap-2 flex-wrap">
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                  isSelected
                    ? 'bg-[#f3f0ff] text-[#7c3aed] border-[#e8deff]'
                    : 'bg-white text-[#94a3b8] border-[#e2e8f0] hover:border-[#e8deff] hover:text-[#7c3aed]'
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

      {/* Row 3: Preferences */}
      <div>
        <label className="block text-sm font-medium text-[#475569] text-left mb-2">
          Пожелания <span className="text-[#94a3b8] font-normal">(необязательно)</span>
        </label>
        <input
          type="text"
          {...form.register('preferences')}
          placeholder="Например: больше задач на логику"
          className="w-full px-4 py-3 rounded-[10px] border border-[#e2e8f0] text-sm text-[#1e293b] placeholder:text-[#94a3b8] outline-none focus:border-[#e8deff] focus:ring-2 focus:ring-[#8C52FF]/10 transition-all"
        />
      </div>

      {/* Row 4: Folder selector */}
      {user && folders.length > 0 && (
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
      )}
    </div>
  )
}
