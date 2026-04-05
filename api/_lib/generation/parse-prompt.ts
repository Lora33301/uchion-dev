/**
 * Parse free-text prompt into structured {subject, grade, topic}.
 * Two-tier: fast regex first, LLM fallback for ambiguous input.
 */
import OpenAI from 'openai'
import { getAgentsModel } from '../ai-models.js'

export interface ParsedPrompt {
  subject: string
  grade: number
  topic: string
}

// Known subject name mappings (Russian -> internal ID for config lookup)
// NOTE: \b doesn't work with Cyrillic in JS regex. Use (?:^|[\s,;:.]) instead.
const SUBJECT_PATTERNS: Array<{ pattern: RegExp; id: string; name: string }> = [
  { pattern: /математик[аеиу]?/i, id: 'math', name: 'Математика' },
  { pattern: /алгебр[аеыу]?/i, id: 'algebra', name: 'Алгебра' },
  { pattern: /геометри[яиюей]?/i, id: 'geometry', name: 'Геометрия' },
  { pattern: /русск(?:ий|ого|ому)?\s*(?:язык[аеу]?)?/i, id: 'russian', name: 'Русский язык' },
  // Generic subjects — no config, use generic prompt
  { pattern: /физик[аеиу]?/i, id: 'physics', name: 'Физика' },
  { pattern: /хими[яиюей]?/i, id: 'chemistry', name: 'Химия' },
  { pattern: /биологи[яиюей]?/i, id: 'biology', name: 'Биология' },
  { pattern: /истори[яиюей]?/i, id: 'history', name: 'История' },
  { pattern: /обществознани[яеюй]?/i, id: 'social_studies', name: 'Обществознание' },
  { pattern: /географи[яиюей]?/i, id: 'geography', name: 'География' },
  { pattern: /литератур[аеыу]?/i, id: 'literature', name: 'Литература' },
  { pattern: /информатик[аеиу]?/i, id: 'informatics', name: 'Информатика' },
  { pattern: /английск(?:ий|ого|ому)?\s*(?:язык[аеу]?)?/i, id: 'english', name: 'Английский язык' },
  { pattern: /окружающ(?:ий|его|ему)?\s*мир[ауе]?/i, id: 'world_around', name: 'Окружающий мир' },
  { pattern: /ОБЖ|безопасност[иь]\s*жизнедеятельност[иь]/i, id: 'obzh', name: 'ОБЖ' },
  { pattern: /музык[аеиу]?/i, id: 'music', name: 'Музыка' },
  { pattern: /технологи[яиюей]?/i, id: 'technology', name: 'Технология' },
]

const GRADE_PATTERN = /(\d{1,2})\s*(?:класс|кл\.?)/i
const GRADE_WORD_PATTERN = /(?:первый|второй|третий|четвёртый|четвертый|пятый|шестой|седьмой|восьмой|девятый|десятый|одиннадцатый)\s*класс/i
const GRADE_WORDS: Record<string, number> = {
  'первый': 1, 'второй': 2, 'третий': 3, 'четвёртый': 4, 'четвертый': 4,
  'пятый': 5, 'шестой': 6, 'седьмой': 7, 'восьмой': 8, 'девятый': 9,
  'десятый': 10, 'одиннадцатый': 11,
}

const TOPIC_SEPARATORS = /[,;:]\s*|(?:^|\s)тема\s+|(?:^|\s)на тему\s+/gi

/**
 * Parse a free-text prompt into structured fields.
 * Returns null if nothing useful could be extracted — caller should use LLM fallback.
 */
export function parsePromptLocal(prompt: string): ParsedPrompt | null {
  const trimmed = prompt.trim()
  if (!trimmed) return null

  // 1. Extract grade
  let grade: number | null = null
  let textWithoutGrade = trimmed

  const gradeMatch = trimmed.match(GRADE_PATTERN)
  if (gradeMatch) {
    const g = parseInt(gradeMatch[1])
    if (g >= 1 && g <= 11) {
      grade = g
      textWithoutGrade = trimmed.replace(GRADE_PATTERN, ' ').trim()
    }
  }

  if (!grade) {
    const wordMatch = trimmed.match(GRADE_WORD_PATTERN)
    if (wordMatch) {
      const word = wordMatch[0].replace(/\s*класс/i, '').trim().toLowerCase()
      grade = GRADE_WORDS[word] || null
      if (grade) {
        textWithoutGrade = trimmed.replace(GRADE_WORD_PATTERN, ' ').trim()
      }
    }
  }

  // 2. Extract subject
  let subject: { id: string; name: string } | null = null
  let textWithoutSubject = textWithoutGrade

  for (const sp of SUBJECT_PATTERNS) {
    // Also check with preposition: "по математике"
    const withPrep = new RegExp(`по\\s+${sp.pattern.source}`, 'i')
    const matchPrep = textWithoutGrade.match(withPrep)
    if (matchPrep) {
      subject = { id: sp.id, name: sp.name }
      textWithoutSubject = textWithoutGrade.replace(withPrep, ' ').trim()
      break
    }
    const matchDirect = textWithoutGrade.match(sp.pattern)
    if (matchDirect) {
      subject = { id: sp.id, name: sp.name }
      textWithoutSubject = textWithoutGrade.replace(sp.pattern, ' ').trim()
      break
    }
  }

  // 3. Extract topic — everything remaining after subject/grade removal
  let topic = textWithoutSubject
    .replace(TOPIC_SEPARATORS, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,;:.]+|[\s,;:.]+$/g, '')
    .trim()

  // Strip leading intent words, "тема/на тему" markers, and leftover prepositions
  topic = topic
    .replace(/^(задания|задание|задачи|тест|контрольная|проверочная)\s*/i, '')
    .replace(/^по\s+/i, '')
    .replace(/^(на\s+тему|тема)\s+/i, '')
    .trim()

  // If we got all three, return
  if (subject && grade && topic.length >= 2) {
    return { subject: subject.id, grade, topic }
  }

  // If only topic is missing but we have subject+grade, use subject name as topic
  if (subject && grade && topic.length < 2) {
    return { subject: subject.id, grade, topic: subject.name }
  }

  // Partial parse — not enough for generation
  return null
}

/**
 * LLM fallback: ask AI to extract subject/grade/topic from ambiguous text.
 * Uses OpenAI client directly (AIProvider has no chat() method).
 */
export async function parsePromptWithLLM(prompt: string): Promise<ParsedPrompt> {
  const apiKey = process.env.OPENAI_API_KEY
  const baseURL = process.env.AI_BASE_URL
  const model = getAgentsModel()

  if (!apiKey) {
    throw new Error('Cannot parse ambiguous prompt: no AI API key configured')
  }

  const client = new OpenAI({ apiKey, ...(baseURL && { baseURL }) })

  const systemPrompt = `Ты помощник, который извлекает из пользовательского запроса три поля для генерации школьных заданий.
Извлеки:
- subject: название предмета на русском (например: "Физика", "Математика", "История")
- grade: номер класса (число от 1 до 11)
- topic: тема урока

Если предмет не указан явно, определи по контексту темы.
Если класс не указан, определи подходящий класс по теме и предмету.

Ответь ТОЛЬКО валидным JSON без markdown:
{"subject": "...", "grade": N, "topic": "..."}`

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    temperature: 0,
    max_tokens: 200,
  })

  const text = response.choices[0]?.message?.content?.trim() || ''
  // Strip markdown fences if present
  const jsonStr = text.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()

  const parsed = JSON.parse(jsonStr)

  // Map Russian subject name to internal ID if known
  const subjectId = mapSubjectNameToId(parsed.subject) || slugify(parsed.subject)
  const grade = Math.max(1, Math.min(11, Math.round(Number(parsed.grade))))
  const topic = String(parsed.topic || prompt).slice(0, 200)

  return { subject: subjectId, grade, topic }
}

/**
 * Main entry point: try local parsing first, fall back to LLM.
 */
export async function parsePrompt(prompt: string): Promise<ParsedPrompt> {
  const local = parsePromptLocal(prompt)
  if (local) return local
  return parsePromptWithLLM(prompt)
}

// --- Helpers ---

function mapSubjectNameToId(name: string): string | null {
  const lower = name.toLowerCase().trim()
  for (const sp of SUBJECT_PATTERNS) {
    if (sp.pattern.test(lower)) return sp.id
  }
  return null
}

function slugify(name: string): string {
  const map: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
  }
  return name
    .toLowerCase()
    .split('')
    .map(c => map[c] || c)
    .join('')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

/**
 * Normalize a subject string to an internal slug ID.
 * Known Russian names (e.g. "Биология") -> slug ("biology").
 * Already-slug values (e.g. "biology") pass through unchanged.
 * Unknown names get transliterated to a slug.
 */
export function normalizeSubject(subject: string): string {
  // If it's already a known slug, return as-is
  if (SUBJECT_PATTERNS.some(sp => sp.id === subject)) return subject
  // Try to map Russian name to slug
  return mapSubjectNameToId(subject) || slugify(subject)
}

/** Subject ID -> Russian display name (for formatSubjectName and generic prompts) */
export const KNOWN_SUBJECT_NAMES: Record<string, string> = Object.fromEntries(
  SUBJECT_PATTERNS.map(sp => [sp.id, sp.name])
)
