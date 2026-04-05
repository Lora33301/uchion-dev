import OpenAI from 'openai'
import { getAgentsModel } from '../../../ai-models.js'
import { trackFromContext } from '../../../ai-usage.js'
import { safeJsonParse } from './safe-json-parse.js'
import { getGradeConfig } from '../../config/index.js'
import { KNOWN_SUBJECT_NAMES } from '../../parse-prompt.js'
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

const CRITICAL_CHECKS = `
КРИТИЧЕСКИЕ ПРОВЕРКИ (обязательны для каждого задания):
1. РЕШАЕМОСТЬ: Может ли ученик данного класса выполнить задание за конечное число шагов? Ответ должен быть конечным и записываемым.
2. SINGLE_CHOICE: Ровно один вариант должен быть однозначно правильным. Если 2+ варианта можно обосновать как правильные — ошибка BAD_FORMULATION.
3. ДИСТРАКТОРЫ: Все неправильные варианты должны быть однозначно неверными. Проверь каждый вариант.
4. MULTIPLE_CHOICE: Все указанные правильные — действительно правильны; все остальные — однозначно нет.
5. MATCHING: Каждый элемент левого столбца однозначно соответствует ровно одному элементу правого.
6. FILL_BLANK: Пропуск имеет единственный верный ответ.
7. OPEN_QUESTION: Задание имеет конкретный, записываемый ответ. «Найди все решения» бесконечного множества — ошибка.`

const SUBJECT_PROMPTS: Record<string, string> = {
  russian: `Ты — методист по русскому языку. Проверь качество и соответствие каждого задания.

КОРРЕКТНОСТЬ ФОРМУЛИРОВКИ:
- Если в вопросе есть пример — убедись что он соответствует тому, о чём спрашивается
- Классификация частей речи, членов предложения, типов предложений должна быть верной
- Термины должны использоваться правильно

ВАРИАНТЫ ОТВЕТОВ (для тестов):
- Среди вариантов ДОЛЖЕН быть хотя бы один правильный
- Если ни один вариант не подходит — это ошибка
${CRITICAL_CHECKS}`,

  math: `Ты — методист по математике начальной и средней школы. Проверь качество и соответствие каждого задания.

КОРРЕКТНОСТЬ ФОРМУЛИРОВКИ:
- Условие задачи полное и однозначное
- Данные не противоречат друг другу
- Задача имеет решение

ВАРИАНТЫ ОТВЕТОВ (для тестов):
- Среди вариантов ДОЛЖЕН быть правильный
- Неправильные варианты — правдоподобные (типичные ошибки учеников)
${CRITICAL_CHECKS}`,

  algebra: `Ты — методист по алгебре. Проверь качество и соответствие каждого задания.

КОРРЕКТНОСТЬ ФОРМУЛИРОВКИ:
- Условие полное и однозначное
- Уравнения/неравенства записаны корректно
- Задача имеет решение в рамках изученного материала

ВАРИАНТЫ ОТВЕТОВ (для тестов):
- Среди вариантов ДОЛЖЕН быть правильный
- Неправильные варианты — правдоподобные
${CRITICAL_CHECKS}`,

  geometry: `Ты — методист по геометрии. Проверь качество и соответствие каждого задания.

КОРРЕКТНОСТЬ ФОРМУЛИРОВКИ:
- Условие полное, фигура определена однозначно
- Данные не противоречат друг другу
- Задача имеет решение

ВАРИАНТЫ ОТВЕТОВ (для тестов):
- Среди вариантов ДОЛЖЕН быть правильный
- Неправильные варианты — правдоподобные
${CRITICAL_CHECKS}`,
}

function getUnifiedCheckerPrompt(subject: string): string {
  if (SUBJECT_PROMPTS[subject]) return SUBJECT_PROMPTS[subject]

  const subjectName = KNOWN_SUBJECT_NAMES[subject] || subject
  return `Ты — методист по предмету "${subjectName}". Проверь качество и соответствие каждого задания.

КОРРЕКТНОСТЬ ФОРМУЛИРОВКИ:
- Условие задания полное и однозначное
- Используемые термины и факты корректны для предмета "${subjectName}"
- Задание имеет однозначное решение/ответ

ВАРИАНТЫ ОТВЕТОВ (для тестов):
- Среди вариантов ДОЛЖЕН быть правильный
- Неправильные варианты — правдоподобные (типичные ошибки учеников)
${CRITICAL_CHECKS}`
}

function formatTaskForPrompt(task: GeneratedTask, index: number): string {
  const parts = [`--- Задание ${index} (тип: ${task.type}) ---`]

  switch (task.type) {
    case 'single_choice':
      parts.push(`Вопрос: ${task.question}`)
      parts.push(`Варианты: ${(task.options || []).map((o, i) => `${i}) ${o}`).join('; ')}`)
      parts.push(`Указанный правильный: вариант ${task.correctIndex} (${task.options?.[task.correctIndex ?? 0]})`)
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

interface LLMUnifiedResult {
  index: number
  status: 'ok' | 'warning' | 'error'
  code?: 'BAD_FORMULATION' | 'OFF_TOPIC' | 'PARTIAL_MISMATCH'
  issue?: string
}

/**
 * Unified quality + content checker.
 * Replaces separate quality-checker and content-checker agents.
 * Checks in a single LLM call:
 * - Formulation correctness (BAD_FORMULATION)
 * - Answer options validity + distractors (BAD_FORMULATION)
 * - Topic relevance (OFF_TOPIC)
 * - Grade appropriateness (PARTIAL_MISMATCH)
 */
export async function checkQualityAndContent(
  tasks: GeneratedTask[],
  subject: string,
  grade: number,
  topic: string,
  difficulty: DifficultyLevel
): Promise<AgentResult> {
  const agentName = 'unified-checker'
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
  const subjectPrompt = getUnifiedCheckerPrompt(subject)
  const difficultyName = DIFFICULTY_NAMES[difficulty] || difficulty
  const subjectName = SUBJECT_NAMES[subject] || KNOWN_SUBJECT_NAMES[subject] || subject

  // Get topics from grade config
  const gradeConfig = getGradeConfig(subject, grade as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11)
  const gradeTopics = gradeConfig?.topics?.join(', ') || null

  const tasksText = tasks.map((t, i) => formatTaskForPrompt(t, i)).join('\n\n')

  const userPrompt = `${subjectPrompt}

Предмет: ${subjectName}
Класс: ${grade}
Тема: "${topic}"
Уровень сложности: ${difficultyName} (${difficulty})

${gradeTopics ? `Темы программы ${grade} класса: ${gradeTopics}` : `Предмет "${subjectName}" — проверяй по общим знаниям программы ${grade} класса`}

КРИТЕРИИ СЛОЖНОСТИ:
- easy: 1-2 действия, простые примеры, прямое применение правил
- medium: 2-3 действия, стандартные случаи из учебника
- hard: 3+ действий, составные задачи, нестандартные случаи

Вот задания для проверки:

${tasksText}

Для каждого задания проверь ВСЁ:
1. Корректность формулировки (полное, однозначное, решаемое)
2. Правильность вариантов ответов (указанный правильный действительно верен, дистракторы однозначно неверны)
3. Соответствие теме "${topic}"
4. Соответствие программе ${grade} класса (нет лишних терминов)

Верни ТОЛЬКО JSON (без markdown):
{
  "tasks": [
    {"index": 0, "status": "ok"},
    {"index": 1, "status": "error", "code": "BAD_FORMULATION", "issue": "Описание проблемы"},
    {"index": 2, "status": "error", "code": "OFF_TOPIC", "issue": "Не соответствует теме"},
    {"index": 3, "status": "warning", "code": "PARTIAL_MISMATCH", "issue": "Используются термины не по программе"}
  ]
}

Проверь ВСЕ ${tasks.length} заданий. Индексы от 0 до ${tasks.length - 1}.
Коды ошибок:
- "BAD_FORMULATION" (error) — формулировка некорректна, нет правильного варианта, нерешаемо, несколько правильных вариантов, дистрактор можно обосновать как правильный
- "OFF_TOPIC" (error) — полностью не соответствует теме или классу
- "PARTIAL_MISMATCH" (warning) — частично выходит за рамки или использует сложные термины
Если задание в порядке — "ok" (без code и issue).`

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: 4000,
      temperature: 0.1,
    })

    if (completion.usage) {
      trackFromContext({
        callType: 'unified_checker',
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

    const parsed = safeJsonParse<{ tasks: LLMUnifiedResult[] }>(jsonMatch[0], agentName)
    if (!parsed) {
      return emptyResult(agentName, 'JSON_PARSE_ERROR')
    }
    const llmTasks = parsed.tasks || []

    const taskResults: AgentTaskResult[] = llmTasks.map((t) => {
      const issues: AgentIssue[] = []
      if ((t.status === 'error' || t.status === 'warning') && t.issue) {
        const code = t.code || (t.status === 'error' ? 'BAD_FORMULATION' : 'PARTIAL_MISMATCH')
        const suggestion = getSuggestion(code)
        issues.push({ code, message: t.issue, suggestion })
      }
      return {
        taskIndex: t.index,
        status: t.status,
        issues,
      }
    })

    const totalErrors = taskResults.filter(t => t.status === 'error').length
    const totalWarnings = taskResults.filter(t => t.status === 'warning').length
    const duration = Date.now() - start
    console.log(`[${agentName}] Done in ${duration}ms: ${totalErrors} errors, ${totalWarnings} warnings`)

    return { agentName, tasks: taskResults, totalErrors, totalWarnings }
  } catch (error) {
    const duration = Date.now() - start
    console.error(`[${agentName}] Failed in ${duration}ms:`, error)
    return emptyResult(agentName, 'AGENT_ERROR')
  }
}

function getSuggestion(code: string): string {
  switch (code) {
    case 'BAD_FORMULATION':
      return 'Переформулировать задание или исправить варианты ответов'
    case 'OFF_TOPIC':
      return 'Пересгенерировать задание по указанной теме'
    case 'PARTIAL_MISMATCH':
      return 'Проверить соответствие уровню класса'
    default:
      return 'Проверить задание'
  }
}

function emptyResult(agentName: string, warningCode?: string): AgentResult {
  const issues: AgentIssue[] = warningCode
    ? [{ code: warningCode, message: 'Agent could not complete quality/content check' }]
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
