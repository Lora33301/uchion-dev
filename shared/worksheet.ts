import { z } from 'zod'

// --- Enums ---
export const KnownSubjectSchema = z.enum(['math', 'algebra', 'geometry', 'russian'])
export type KnownSubject = z.infer<typeof KnownSubjectSchema>
export const SubjectSchema = z.string().min(1).max(100)
export type Subject = string

export const TaskTypeIdSchema = z.enum([
  'single_choice',
  'multiple_choice',
  'open_question',
  'matching',
  'fill_blank',
])
export type TaskTypeId = z.infer<typeof TaskTypeIdSchema>

export const DifficultyLevelSchema = z.enum(['easy', 'medium', 'hard'])
export type DifficultyLevel = z.infer<typeof DifficultyLevelSchema>

export const WorksheetFormatIdSchema = z.enum(['open_only', 'test_only', 'test_and_open'])
export type WorksheetFormatId = z.infer<typeof WorksheetFormatIdSchema>

export const AssignmentTypeSchema = z.enum(['theory', 'apply', 'error', 'creative'])
export type AssignmentType = z.infer<typeof AssignmentTypeSchema>

// --- Sub-components for Final Worksheet ---
export const AssignmentSchema = z.object({
  title: z.string(),
  text: z.string(),
})
export type Assignment = z.infer<typeof AssignmentSchema>

export const TestQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()),
  answer: z.string(),
})
export type TestQuestion = z.infer<typeof TestQuestionSchema>

export const WorksheetAnswersSchema = z.object({
  assignments: z.array(z.string()),
  test: z.array(z.string()),
})
export type WorksheetAnswers = z.infer<typeof WorksheetAnswersSchema>

// --- Main Worksheet Model ---
export const WorksheetSchema = z.object({
  id: z.string(),
  subject: SubjectSchema,
  grade: z.string(),
  topic: z.string(),
  assignments: z.array(AssignmentSchema),
  test: z.array(TestQuestionSchema),
  answers: WorksheetAnswersSchema,
  pdfBase64: z.string(),
})
export type Worksheet = z.infer<typeof WorksheetSchema>

// --- Generation Form Schema ---
// Supports two modes:
// Mode 1 (new): { prompt: "Физика 8 класс, сила трения" }
// Mode 2 (legacy): { subject: "math", grade: 3, topic: "Сложение" }
export const GenerateSchema = z.object({
  prompt: z.string().min(3).max(500).optional(),
  subject: z.string().min(1).max(100).optional(),
  grade: z.number().int().min(1).max(11).optional(),
  topic: z.string().min(3).max(200).optional(),
  preferences: z.string().max(500).optional(),
  folderId: z.string().uuid().nullable().optional(),
  taskTypes: z.array(TaskTypeIdSchema).min(1).max(5).optional(),
  difficulty: DifficultyLevelSchema.optional(),
  format: WorksheetFormatIdSchema.optional(),
  variantIndex: z.number().int().min(0).max(2).optional(),
}).refine(
  (data) => data.prompt || (data.subject && data.grade != null && data.topic),
  { message: 'Введите запрос или укажите предмет, класс и тему', path: ['prompt'] }
)
export type GenerateFormValues = z.infer<typeof GenerateSchema>

export type GeneratePayload = {
  prompt?: string
  subject?: string
  grade?: number
  topic?: string
  preferences?: string
  folderId?: string | null
  taskTypes?: TaskTypeId[]
  difficulty?: DifficultyLevel
  format?: WorksheetFormatId
  variantIndex?: number
}

/** Resolved payload after parsing prompt — all fields guaranteed present */
export type ResolvedGeneratePayload = {
  subject: string
  grade: number
  topic: string
  preferences?: string
  folderId?: string | null
  taskTypes?: TaskTypeId[]
  difficulty?: DifficultyLevel
  format?: WorksheetFormatId
  variantIndex?: number
}

// --- Internal/AI Types ---
export interface WorksheetJson {
  assignments: {
    index: number
    type: AssignmentType
    text: string
  }[]
  test: {
    index: number
    question: string
    options: {
      A: string
      B: string
      C: string
    }
  }[]
  answers: {
    assignments: string[]
    test: ('A' | 'B' | 'C')[]
  }
}
