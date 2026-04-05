import type { UseFormReturn } from 'react-hook-form'
import CustomSelect from '../ui/CustomSelect'
import {
  THEME_PRESETS,
  SLIDE_COUNTS,
  type GeneratePresentationFormValues,
} from '../../constants/generation'

interface PresentationGenerateFormProps {
  form: UseFormReturn<GeneratePresentationFormValues>
}

export default function PresentationGenerateForm({
  form,
}: PresentationGenerateFormProps) {
  const watchThemePreset = form.watch('themePreset')
  const watchSlideCount = form.watch('slideCount') ?? 12

  return (
    <div className="w-full space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Row 1: Two dropdowns */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-[2]">
          <CustomSelect
            label="Стиль оформления"
            value={watchThemePreset}
            onChange={(val) => form.setValue('themePreset', val as typeof watchThemePreset)}
            options={THEME_PRESETS.map(t => ({ label: t.label, value: t.value }))}
          />
        </div>
        <div className="flex-1">
          <CustomSelect
            label="Кол-во слайдов"
            value={watchSlideCount}
            onChange={(val) => form.setValue('slideCount', val as 12 | 18 | 24)}
            options={SLIDE_COUNTS.map(s => ({ label: s.description, value: s.value }))}
          />
        </div>
      </div>

      {/* Row 2: Preferences */}
      <div>
        <label className="block text-sm font-medium text-[#475569] text-left mb-2">
          Пожелания <span className="text-[#94a3b8] font-normal">(необязательно)</span>
        </label>
        <input
          type="text"
          {...form.register('preferences')}
          placeholder="Например: больше примеров и иллюстраций"
          className="w-full px-4 py-3 rounded-[10px] border border-[#e2e8f0] text-sm text-[#1e293b] placeholder:text-[#94a3b8] outline-none focus:border-[#e8deff] focus:ring-2 focus:ring-[#8C52FF]/10 transition-all"
        />
      </div>
    </div>
  )
}
