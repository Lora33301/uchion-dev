import OpenAI from 'openai'
import { getAgentsModel } from '../../../ai-models.js'
import { trackFromContext } from '../../../ai-usage.js'
import { safeJsonParse } from './safe-json-parse.js'
import type { TaskTypeId } from '../../config/task-types.js'
import type { DifficultyLevel } from '../../config/difficulty.js'
import type { AgentResult, AgentTaskResult, AgentIssue } from './index.js'

interface GeneratedTask {
  type: TaskTypeId
  question?: string
  options?: string[]
  correctIndex?: number
  correctIndices?: number[]
  explanation?: string
  correctAnswer?: string
  acceptableVariants?: string[]
  instruction?: string
  leftColumn?: string[]
  rightColumn?: string[]
  correctPairs?: [number, number][]
  textWithBlanks?: string
  blanks?: { position: number; correctAnswer: string; acceptableVariants?: string[] }[]
}

const DIFFICULTY_NAMES: Record<DifficultyLevel, string> = {
  easy: 'лёгкий',
  medium: 'средний',
  hard: 'повышенный',
}

const SUBJECT_NAMES: Record<string, string> = {
  math: 'Математика',
  algebra: 'Алгебра',
  geometry: 'Геометрия',
  russian: 'Русский язык',
}

function formatTaskForPrompt(task: GeneratedTask, index: number): string {
  const parts = [`--- Задание ${index} (тип: ${task.type}) ---`]

  switch (task.type) {
    case 'single_choice':
      parts.push(`Вопрос: ${task.question}`)
      parts.push(`Варианты: ${(task.options || []).map((o, i) => `${i}) ${o}`).join('; ')}`)
      break
    case 'multiple_choice':
      parts.push(`Вопрос: ${task.question}`)
      parts.push(`Варианты: ${(task.options || []).map((o, i) => `${i}) ${o}`).join('; ')}`)
      break
    case 'open_question':
      parts.push(`Вопрос: ${task.question}`)
      break
    case 'matching':
      parts.push(`Инструкция: ${task.instruction}`)
      parts.push(`Левый столбец: ${(task.leftColumn || []).map((v, i) => `${i}) ${v}`).join('; ')}`)
      parts.push(`Правый столбец: ${(task.rightColumn || []).map((v, i) => `${i}) ${v}`).join('; ')}`)
      break
    case 'fill_blank':
      parts.push(`Текст: ${task.textWithBlanks}`)
      break
  }

  return parts.join('\n')
}

interface LLMDifficultyResult {
  index: number
  status: 'ok' | 'warning'
  issue?: string
}

/**
 * Difficulty checker agent.
 * Validates that task difficulty matches the requested level.
 * Currently logs only (warnings, not errors) — does not trigger fixer.
 */
export async function checkDifficulty(
  tasks: GeneratedTask[],
  subject: string,
  grade: number,
  difficulty: DifficultyLevel
): Promise<AgentResult> {
  const agentName = 'difficulty-checker'
  const start = Date.now()

  const apiKey = process.env.OPENAI_API_KEY
  const baseURL = process.env.AI_BASE_URL
  const model = getAgentsModel()
  console.log(`[${agentName}] Model: ${model}`)

  if (!apiKey) {
    console.warn(`[${agentName}] No API key, skipping`)
    return emptyResult(agentName)
  }

  const client = new OpenAI({ apiKey, ...(baseURL && { baseURL }) })
  const difficultyName = DIFFICULTY_NAMES[difficulty] || difficulty
  const subjectName = SUBJECT_NAMES[subject] || subject

  const tasksText = tasks.map((t, i) => formatTaskForPrompt(t, i)).join('\n\n')

  const userPrompt = `Ты — эксперт по оценке сложности школьных заданий.

Предмет: ${subjectName}
Класс: ${grade}
Запрошенный уровень сложности: ${difficultyName} (${difficulty})

КРИТЕРИИ СЛОЖНОСТИ:
- easy (лёгкий): 1-2 действия, простые примеры, прямое применение правил, типовые задачи
- medium (средний): 2-3 действия, стандартные случаи из учебника, требуется понимание взаимосвязей
- hard (повышенный): 3+ действий, составные задачи, нестандартные случаи, требуется анализ

Вот задания для проверки:

${tasksText}

Для каждого задания оцени, соответствует ли его реальная сложность запрошенному уровню "${difficultyName}".
Учитывай: количество шагов решения, сложность вычислений, необходимость рассуждений, уровень абстракции.

Верни ТОЛЬКО JSON (без markdown):
{
  "tasks": [
    {"index": 0, "status": "ok"},
    {"index": 1, "status": "warning", "issue": "Задание слишком лёгкое для уровня ${difficultyName} — требует только 1 действие"}
  ]
}

Проверь ВСЕ ${tasks.length} заданий. Индексы от 0 до ${tasks.length - 1}.
Статус "warning" — если сложность не соответствует уровню ${difficultyName}.
Статус "ok" — если сложность соответствует.`

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: 4000,
      temperature: 0.1,
    })

    if (completion.usage) {
      trackFromContext({
        callType: 'difficulty_checker',
        model: completion.model || model,
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        durationMs: Date.now() - start,
      })
    }

    const content = completion.choices[0]?.message?.content || ''
    const jsonMatch = content.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      console.warn(`[${agentName}] No JSON in response`)
      return emptyResult(agentName, 'NO_JSON_RESPONSE')
    }

    const parsed = safeJsonParse<{ tasks: LLMDifficultyResult[] }>(jsonMatch[0], agentName)
    if (!parsed) {
      return emptyResult(agentName, 'JSON_PARSE_ERROR')
    }
    const llmTasks = parsed.tasks || []

    const taskResults: AgentTaskResult[] = llmTasks.map((t) => {
      const issues: AgentIssue[] = []
      if (t.status === 'warning' && t.issue) {
        issues.push({
          code: 'DIFFICULTY_MISMATCH',
          message: t.issue,
          suggestion: 'Скорректировать сложность задания',
        })
      }
      return {
        taskIndex: t.index,
        status: t.status === 'warning' ? 'warning' as const : 'ok' as const,
        issues,
      }
    })

    const totalWarnings = taskResults.filter(t => t.status === 'warning').length
    const duration = Date.now() - start
    console.log(`[${agentName}] Done in ${duration}ms: ${totalWarnings} warnings`)

    return { agentName, tasks: taskResults, totalErrors: 0, totalWarnings }
  } catch (error) {
    const duration = Date.now() - start
    console.error(`[${agentName}] Failed in ${duration}ms:`, error)
    return emptyResult(agentName, 'AGENT_ERROR')
  }
}

function emptyResult(agentName: string, warningCode?: string): AgentResult {
  const issues: AgentIssue[] = warningCode
    ? [{ code: warningCode, message: 'Agent could not complete difficulty check' }]
    : []

  return {
    agentName,
    tasks: issues.length > 0
      ? [{ taskIndex: -1, status: 'warning' as const, issues }]
      : [],
    totalErrors: 0,
    totalWarnings: issues.length,
  }
}
