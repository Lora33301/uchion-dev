import OpenAI from 'openai'
import { getVerifierModelConfig } from '../../../ai-models.js'
import { trackFromContext } from '../../../ai-usage.js'
import { safeJsonParse } from './safe-json-parse.js'
import type { TaskTypeId } from '../../config/task-types.js'
import type { AgentResult, AgentTaskResult, AgentIssue } from './index.js'
import { KNOWN_SUBJECT_NAMES } from '../../parse-prompt.js'
import type { VerifierModelConfig } from '../../../ai-models.js'

// Same shape as in ai-provider.ts / deterministic.ts
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

const DISTRACTOR_CHECK = `
Для тестовых заданий (single_choice/multiple_choice):
1. Реши задание самостоятельно
2. Проверь КАЖДЫЙ вариант ответа — верный он или нет
3. Для single_choice: если правильных вариантов больше одного — ошибка MULTIPLE_CORRECT
4. Для single_choice: если указанный правильный вариант неверен — ошибка WRONG_ANSWER
5. Для multiple_choice: если среди «неправильных» есть правильный или среди «правильных» неправильный — ошибка WRONG_ANSWER`

const SUBJECT_PROMPTS: Record<string, string> = {
  math: `Ты -- проверяющий учитель математики начальной и средней школы (1-6 класс).
Для каждого задания:
1. Реши его самостоятельно
2. Сравни свой ответ с указанным
3. Если не совпадают -- укажи ошибку и правильный ответ

Проверяй: арифметику, дроби, проценты, простые уравнения.
${DISTRACTOR_CHECK}`,

  algebra: `Ты -- проверяющий учитель алгебры (7-11 класс).
Для каждого задания:
1. Реши его самостоятельно
2. Сравни свой ответ с указанным
3. Если не совпадают -- укажи ошибку и правильный ответ

Проверяй: уравнения, функции, графики, производные, логарифмы, тригонометрию.
${DISTRACTOR_CHECK}`,

  geometry: `Ты -- проверяющий учитель геометрии (7-11 класс).
Для каждого задания:
1. Реши его самостоятельно
2. Сравни свой ответ с указанным
3. Если не совпадают -- укажи ошибку и правильный ответ

Проверяй: теоремы, формулы площадей и объёмов, векторы, координаты.
${DISTRACTOR_CHECK}`,

  russian: `Ты -- проверяющий учитель русского языка (1-11 класс).
Для каждого задания:
1. Проверь правильность ответа по правилам русского языка
2. Если ответ неверный -- укажи ошибку и правильный ответ

Проверяй: орфографию, пунктуацию, грамматику, части речи, синтаксис.
${DISTRACTOR_CHECK}`,
}

function getVerifierPrompt(subject: string): string {
  if (SUBJECT_PROMPTS[subject]) return SUBJECT_PROMPTS[subject]

  const subjectName = KNOWN_SUBJECT_NAMES[subject] || subject
  return `Ты -- проверяющий учитель предмета "${subjectName}".
Для каждого задания:
1. Используя свои знания по предмету "${subjectName}", реши задание самостоятельно
2. Сравни свой ответ с указанным
3. Если не совпадают -- укажи ошибку и правильный ответ
4. Для фактических вопросов: проверь точность фактов, дат, определений
5. Для вычислительных задач: выполни расчёты и сравни результат

${DISTRACTOR_CHECK}`
}

function formatTaskForPrompt(task: GeneratedTask, index: number): string {
  const parts = [`--- Задание ${index} (тип: ${task.type}) ---`]

  switch (task.type) {
    case 'single_choice':
      parts.push(`Вопрос: ${task.question}`)
      parts.push(`Варианты: ${(task.options || []).map((o, i) => `${i}) ${o}`).join('; ')}`)
      parts.push(`Указанный правильный ответ: вариант ${task.correctIndex} (${task.options?.[task.correctIndex ?? 0]})`)
      break
    case 'multiple_choice':
      parts.push(`Вопрос: ${task.question}`)
      parts.push(`Варианты: ${(task.options || []).map((o, i) => `${i}) ${o}`).join('; ')}`)
      parts.push(`Указанные правильные: ${(task.correctIndices || []).map(i => `${i}) ${task.options?.[i]}`).join('; ')}`)
      break
    case 'open_question':
      parts.push(`Вопрос: ${task.question}`)
      parts.push(`Указанный ответ: ${task.correctAnswer}`)
      break
    case 'matching':
      parts.push(`Инструкция: ${task.instruction}`)
      parts.push(`Левый столбец: ${(task.leftColumn || []).map((v, i) => `${i}) ${v}`).join('; ')}`)
      parts.push(`Правый столбец: ${(task.rightColumn || []).map((v, i) => `${i}) ${v}`).join('; ')}`)
      parts.push(`Указанные пары: ${(task.correctPairs || []).map(([l, r]) => `${l}-${r}`).join(', ')}`)
      break
    case 'fill_blank':
      parts.push(`Текст: ${task.textWithBlanks}`)
      parts.push(`Пропуски: ${(task.blanks || []).map(b => `(${b.position}) ${b.correctAnswer}`).join('; ')}`)
      break
  }

  return parts.join('\n')
}

interface LLMTaskResult {
  index: number
  status: 'ok' | 'error'
  code?: 'WRONG_ANSWER' | 'MULTIPLE_CORRECT'
  issue?: string
}

export async function verifyAnswers(
  tasks: GeneratedTask[],
  subject: string,
  grade?: number,
  modelConfig?: VerifierModelConfig
): Promise<AgentResult> {
  const agentName = 'answer-verifier'
  const start = Date.now()

  const apiKey = process.env.OPENAI_API_KEY
  const baseURL = process.env.AI_BASE_URL
  const { model, reasoning } = modelConfig ?? getVerifierModelConfig(subject, grade)
  console.log(`[${agentName}] Verifier model: ${model}, reasoning:`, JSON.stringify(reasoning))

  if (!apiKey) {
    console.warn(`[${agentName}] No API key, skipping`)
    return emptyResult(agentName)
  }

  const client = new OpenAI({ apiKey, ...(baseURL && { baseURL }) })
  const subjectPrompt = getVerifierPrompt(subject)

  const tasksText = tasks.map((t, i) => formatTaskForPrompt(t, i)).join('\n\n')

  const userPrompt = `${subjectPrompt}

Вот задания для проверки:

${tasksText}

Верни ТОЛЬКО JSON (без markdown):
{
  "tasks": [
    {"index": 0, "status": "ok"},
    {"index": 1, "status": "error", "code": "WRONG_ANSWER", "issue": "Неверный ответ. Указано: ... Правильно: ..."},
    {"index": 2, "status": "error", "code": "MULTIPLE_CORRECT", "issue": "Варианты 0 и 2 оба правильны"}
  ]
}

Коды ошибок:
- "WRONG_ANSWER" — указанный ответ неверен, или среди дистракторов есть правильный вариант
- "MULTIPLE_CORRECT" — в single_choice задании несколько вариантов можно обосновать как правильные

Проверь ВСЕ ${tasks.length} заданий. Индексы от 0 до ${tasks.length - 1}.`

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: 16000, // Gemini counts thinking tokens as output; need headroom for 10-15 tasks
      temperature: 0.1,
      ...({ reasoning } as Record<string, unknown>),
    })

    if (completion.usage) {
      trackFromContext({
        callType: 'verifier',
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

    const parsed = safeJsonParse<{ tasks: LLMTaskResult[] }>(jsonMatch[0], agentName)
    if (!parsed) {
      return emptyResult(agentName, 'JSON_PARSE_ERROR')
    }
    const llmTasks = parsed.tasks || []
    const resultByIndex = new Map(llmTasks.map(t => [t.index, t]))

    const missingCount = tasks.length - resultByIndex.size
    if (missingCount > 0) {
      console.warn(`[${agentName}] ${missingCount} tasks missing from verifier response, treating as ok`)
    }

    const taskResults: AgentTaskResult[] = tasks.map((_, i) => {
      const t = resultByIndex.get(i)
      if (!t || t.status !== 'error') {
        return { taskIndex: i, status: 'ok' as const, issues: [] }
      }
      const issues: AgentIssue[] = []
      if (t.issue) {
        const code = t.code || 'WRONG_ANSWER'
        const suggestion = code === 'MULTIPLE_CORRECT'
          ? 'Переформулировать задание — несколько вариантов могут быть правильными'
          : 'Пересгенерировать задание или исправить ответ'
        issues.push({ code, message: t.issue, suggestion })
      }
      return {
        taskIndex: i,
        status: 'error' as const,
        issues,
      }
    })

    const totalErrors = taskResults.filter(t => t.status === 'error').length
    const duration = Date.now() - start
    console.log(`[${agentName}] Done in ${duration}ms: ${totalErrors} errors found`)

    return { agentName, tasks: taskResults, totalErrors, totalWarnings: 0 }
  } catch (error) {
    const duration = Date.now() - start
    console.error(`[${agentName}] Failed in ${duration}ms:`, error)
    return emptyResult(agentName, 'AGENT_ERROR')
  }
}

function emptyResult(agentName: string, warningCode?: string): AgentResult {
  const issues: AgentIssue[] = warningCode
    ? [{ code: warningCode, message: 'Agent could not complete verification' }]
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
