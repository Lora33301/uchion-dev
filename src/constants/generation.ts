import { z } from 'zod'

// =============================================================================
// Types
// =============================================================================

export type Subject = 'math' | 'algebra' | 'geometry' | 'russian'
export type DifficultyLevel = 'easy' | 'medium' | 'hard'
export type WorksheetFormatId = 'open_only' | 'test_only' | 'test_and_open'
export type TaskTypeId = 'single_choice' | 'multiple_choice' | 'open_question' | 'matching' | 'fill_blank'

export interface FormatVariant {
  openTasks: number
  testQuestions: number
  generations: number
  label?: string
}

// =============================================================================
// Constants
// =============================================================================

export const SUBJECTS: { value: Subject; label: string; grades: number[] }[] = [
  { value: 'math', label: 'Математика', grades: [1, 2, 3, 4, 5, 6] },
  { value: 'algebra', label: 'Алгебра', grades: [7, 8, 9, 10, 11] },
  { value: 'geometry', label: 'Геометрия', grades: [7, 8, 9, 10, 11] },
  { value: 'russian', label: 'Русский язык', grades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
]

export const DIFFICULTIES: { value: DifficultyLevel; label: string; description: string }[] = [
  { value: 'easy', label: 'Базовый', description: 'Простые задания' },
  { value: 'medium', label: 'Средний', description: 'Стандартный уровень' },
  { value: 'hard', label: 'Повышенный', description: 'Для продвинутых' },
]

export const FORMATS: { id: WorksheetFormatId; name: string; variants: FormatVariant[] }[] = [
  {
    id: 'test_and_open',
    name: 'Тест + задания',
    variants: [
      { openTasks: 5, testQuestions: 10, generations: 2 },
      { openTasks: 10, testQuestions: 15, generations: 3 },
      { openTasks: 15, testQuestions: 20, generations: 4 },
    ],
  },
  {
    id: 'test_only',
    name: 'Только тест',
    variants: [
      { openTasks: 0, testQuestions: 10, generations: 1 },
      { openTasks: 0, testQuestions: 15, generations: 2 },
      { openTasks: 0, testQuestions: 20, generations: 3 },
    ],
  },
  {
    id: 'open_only',
    name: 'Только задания',
    variants: [
      { openTasks: 5, testQuestions: 0, generations: 1 },
      { openTasks: 10, testQuestions: 0, generations: 2 },
      { openTasks: 15, testQuestions: 0, generations: 3 },
    ],
  },
]

export const TASK_TYPES: { id: TaskTypeId; name: string; description: string; category: 'test' | 'open' }[] = [
  { id: 'single_choice', name: 'Единственный выбор', description: 'Один правильный ответ', category: 'test' },
  { id: 'multiple_choice', name: 'Множественный выбор', description: 'Несколько правильных', category: 'test' },
  { id: 'open_question', name: 'Открытый вопрос', description: 'Ввод ответа', category: 'open' },
  { id: 'matching', name: 'Соотнесение', description: 'Соединить пары', category: 'open' },
  { id: 'fill_blank', name: 'Вставка пропусков', description: 'Заполнить пропуски', category: 'open' },
]

export const SLIDE_COUNTS: { value: 12 | 18 | 24; label: string; description: string }[] = [
  { value: 12, label: 'Короткая', description: '12 слайдов' },
  { value: 18, label: 'Средняя', description: '18 слайдов' },
  { value: 24, label: 'Детальная', description: '24 слайда' },
]

export const THEME_PRESETS: { value: 'professional' | 'kids' | 'school'; label: string; description: string; color: string }[] = [
  { value: 'professional', label: 'Профессиональный', description: 'Строгий, деловой', color: 'bg-blue-900' },
  { value: 'kids', label: 'Для детей', description: 'Яркий, начальная школа', color: 'bg-[#4ECDC4]' },
  { value: 'school', label: 'Школьный', description: 'Классический, уютный', color: 'bg-[#8B9DAE]' },
]

export const PRESENTATION_COST: Record<number, number> = { 12: 2, 18: 3, 24: 5 }

// =============================================================================
// Zod Schemas
// =============================================================================

export const GenerateFormSchema = z.object({
  subject: z.enum(['math', 'algebra', 'geometry', 'russian'], {
    errorMap: () => ({ message: 'Выберите предмет' }),
  }),
  grade: z.number({ message: 'Выберите класс' }).int().min(1, 'Выберите класс').max(11),
  topic: z.string().min(3, 'Минимум 3 символа').max(200, 'Максимум 200 символов'),
  folderId: z.string().uuid().nullable().optional(),
  format: z.enum(['open_only', 'test_only', 'test_and_open']),
  variantIndex: z.number().int().min(0).max(2),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  taskTypes: z.array(z.enum(['single_choice', 'multiple_choice', 'open_question', 'matching', 'fill_blank'])).min(1),
})

export type GenerateFormValues = z.infer<typeof GenerateFormSchema>

export const GeneratePresentationFormSchema = z.object({
  subject: z.enum(['math', 'algebra', 'geometry', 'russian'], {
    errorMap: () => ({ message: 'Выберите предмет' }),
  }),
  grade: z.number({ message: 'Выберите класс' }).int().min(1, 'Выберите класс').max(11),
  topic: z.string().min(3, 'Минимум 3 символа').max(200, 'Максимум 200 символов'),
  themeType: z.literal('preset'),
  themePreset: z.enum(['professional', 'kids', 'school']).optional(),
  slideCount: z.union([z.literal(12), z.literal(18), z.literal(24)]).optional(),
})

export type GeneratePresentationFormValues = z.infer<typeof GeneratePresentationFormSchema>
