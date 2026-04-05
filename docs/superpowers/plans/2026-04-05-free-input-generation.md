# Free-Input Generation Refactoring Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded 4-subject dropdown with free-text input so users can generate worksheets for any school subject.

**Architecture:** Hybrid approach — existing detailed configs (math, algebra, geometry, russian) remain for quality; a generic prompt path handles any other subject. A `parsePrompt()` function extracts subject/grade/topic from free text. DB migrates `subject` from enum to varchar. Frontend replaces subject+grade dropdowns with a single text input.

**Tech Stack:** Zod, Express, Drizzle ORM, PostgreSQL, React Hook Form, Tailwind CSS

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `api/_lib/generation/parse-prompt.ts` | Parse free-text input into {subject, grade, topic} |
| Create | `api/_lib/generation/generic-prompt.ts` | Generic system/content prompts for unknown subjects |
| Create | `db/migrations/0018_subject_varchar.sql` | Migrate subject columns from enum to varchar |
| Modify | `shared/worksheet.ts:4,48,59-60` | Subject type: enum -> string, GenerateSchema: add prompt field |
| Modify | `shared/types.ts:60-70` | WorksheetListItem.subject: string |
| Modify | `db/schema.ts:13,76,104` | worksheets.subject + generations.subject: varchar |
| Modify | `api/_lib/generation/prompts.ts:644-701` | buildSystemPrompt/buildUserPrompt: generic fallback |
| Modify | `api/_lib/generation/config/index.ts:22-46` | getSubjectConfig: return undefined for unknown |
| Modify | `api/_lib/ai-models.ts:26-29` | isStemSubject: keep set, unknown = non-STEM |
| Modify | `server/routes/generate.ts:29,33,147-161,376-383,430-436` | Accept prompt or subject+grade+topic |
| Modify | `server/routes/presentations.ts:30` | Accept string subject |
| Modify | `server/routes/admin/generations.ts:23` | Admin filter: allow any subject string |
| Modify | `src/constants/generation.ts:23-28,92-103` | Remove SUBJECTS array, update GenerateFormSchema |
| Modify | `src/pages/GeneratePage.tsx:121-146,182-203,326-345` | Free-text input, remove dropdowns |
| Modify | `src/components/generation/WorksheetGenerateForm.tsx:68-101` | Replace subject/grade selects with text input |
| Modify | `src/lib/dashboard-api.ts:223-231` | formatSubjectName: pass-through unknown |
| Modify | `tests/unit/schemas.test.ts` | Update schema tests for string subject |

---

## Task 1: Database Migration — subject enum to varchar

**Why first:** Everything else depends on the DB accepting arbitrary subject strings. The enum `('math', 'algebra', 'geometry', 'russian')` blocks any new value.

**Files:**
- Create: `db/migrations/0018_subject_varchar.sql`
- Modify: `db/schema.ts:13,76,104`

- [ ] **Step 1: Write the migration SQL**

```sql
-- 0018_subject_varchar.sql
-- Migrate subject from enum to varchar for free-input support
-- Step 1: Add new varchar columns
ALTER TABLE "worksheets" ADD COLUMN "subject_v2" varchar(100);
ALTER TABLE "generations" ADD COLUMN "subject_v2" varchar(100);

-- Step 2: Copy data
UPDATE "worksheets" SET "subject_v2" = "subject"::text;
UPDATE "generations" SET "subject_v2" = "subject"::text WHERE "subject" IS NOT NULL;

-- Step 3: Drop old columns and rename
ALTER TABLE "worksheets" DROP COLUMN "subject";
ALTER TABLE "generations" DROP COLUMN "subject";

ALTER TABLE "worksheets" RENAME COLUMN "subject_v2" TO "subject";
ALTER TABLE "generations" RENAME COLUMN "subject_v2" TO "subject";

-- Step 4: Add NOT NULL constraint back on worksheets.subject
ALTER TABLE "worksheets" ALTER COLUMN "subject" SET NOT NULL;

-- Step 5: Recreate indexes that referenced subject
CREATE INDEX IF NOT EXISTS "worksheets_subject_idx" ON "worksheets" ("subject");
```

Save to `db/migrations/0018_subject_varchar.sql`.

- [ ] **Step 2: Update db/schema.ts — replace subjectEnum usage with varchar**

In `db/schema.ts`, the `subjectEnum` on line 13 stays (for reference/old migrations), but the table columns change:

```typescript
// db/schema.ts — worksheets table, line 76:
// OLD:
subject: subjectEnum('subject').notNull(),
// NEW:
subject: varchar('subject', { length: 100 }).notNull(),
```

```typescript
// db/schema.ts — generations table, line 104:
// OLD:
subject: subjectEnum('subject'),
// NEW:
subject: varchar('subject', { length: 100 }),
```

Leave the `subjectEnum` definition on line 13 intact — it's referenced by old migrations. Just stop using it in table definitions.

- [ ] **Step 3: Run migration locally and verify**

Run: `npm run db:migrate`
Expected: Migration applies, tables have varchar subject columns.

Verify: `npm run db:studio` — open worksheets table, confirm subject column is varchar, existing data preserved.

- [ ] **Step 4: Commit**

```bash
git add db/migrations/0018_subject_varchar.sql db/schema.ts
git commit -m "feat: migrate subject columns from enum to varchar for free-input support"
```

---

## Task 2: Shared Types — Subject as string, GenerateSchema accepts prompt

**Files:**
- Modify: `shared/worksheet.ts:4-5,48,59-70`
- Modify: `shared/types.ts:60-70`

- [ ] **Step 1: Update shared/worksheet.ts — Subject type**

```typescript
// shared/worksheet.ts

// Line 4-5: OLD:
export const SubjectSchema = z.enum(['math', 'algebra', 'geometry', 'russian'])
export type Subject = z.infer<typeof SubjectSchema>

// NEW:
export const KnownSubjectSchema = z.enum(['math', 'algebra', 'geometry', 'russian'])
export type KnownSubject = z.infer<typeof KnownSubjectSchema>
export const SubjectSchema = z.string().min(1).max(100)
export type Subject = string
```

- [ ] **Step 2: Update WorksheetSchema — subject is string**

```typescript
// shared/worksheet.ts, line 46-56: OLD:
export const WorksheetSchema = z.object({
  id: z.string(),
  subject: SubjectSchema,
  // ...

// No code change needed here — SubjectSchema is now z.string(), so WorksheetSchema automatically accepts any string.
```

Verify that `WorksheetSchema` still works by checking line 48 uses `SubjectSchema` which is now `z.string()`.

- [ ] **Step 3: Update GenerateSchema — accept prompt OR structured fields**

```typescript
// shared/worksheet.ts, lines 59-69: OLD:
export const GenerateSchema = z.object({
  subject: SubjectSchema,
  grade: z.number().int().min(1).max(11),
  topic: z.string().min(3).max(200),
  folderId: z.string().uuid().nullable().optional(),
  taskTypes: z.array(TaskTypeIdSchema).min(1).max(5).optional(),
  difficulty: DifficultyLevelSchema.optional(),
  format: WorksheetFormatIdSchema.optional(),
  variantIndex: z.number().int().min(0).max(2).optional(),
})

// NEW — supports two modes:
// Mode 1 (new): { prompt: "Физика 8 класс, сила трения" }
// Mode 2 (legacy/explicit): { subject: "math", grade: 3, topic: "Сложение" }
export const GenerateSchema = z.object({
  // Free-text prompt (new primary input)
  prompt: z.string().min(3).max(500).optional(),
  // Structured fields (legacy, also used after parsing)
  subject: z.string().min(1).max(100).optional(),
  grade: z.number().int().min(1).max(11).optional(),
  topic: z.string().min(3).max(200).optional(),
  // Common options
  folderId: z.string().uuid().nullable().optional(),
  taskTypes: z.array(TaskTypeIdSchema).min(1).max(5).optional(),
  difficulty: DifficultyLevelSchema.optional(),
  format: WorksheetFormatIdSchema.optional(),
  variantIndex: z.number().int().min(0).max(2).optional(),
}).refine(
  (data) => data.prompt || (data.subject && data.grade && data.topic),
  { message: 'Введите запрос или укажите предмет, класс и тему', path: ['prompt'] }
)
```

- [ ] **Step 4: Update GeneratePayload type**

```typescript
// shared/worksheet.ts, lines 71-80: OLD:
export type GeneratePayload = {
  subject: Subject
  grade: number
  topic: string
  folderId?: string | null
  taskTypes?: TaskTypeId[]
  difficulty?: DifficultyLevel
  format?: WorksheetFormatId
  variantIndex?: number
}

// NEW:
export type GeneratePayload = {
  prompt?: string
  subject?: string
  grade?: number
  topic?: string
  folderId?: string | null
  taskTypes?: TaskTypeId[]
  difficulty?: DifficultyLevel
  format?: WorksheetFormatId
  variantIndex?: number
}

// Resolved payload (after parsing prompt)
export type ResolvedGeneratePayload = {
  subject: string
  grade: number
  topic: string
  folderId?: string | null
  taskTypes?: TaskTypeId[]
  difficulty?: DifficultyLevel
  format?: WorksheetFormatId
  variantIndex?: number
}
```

- [ ] **Step 5: Update shared/types.ts — WorksheetListItem**

```typescript
// shared/types.ts, line 60-70: OLD:
export interface WorksheetListItem {
  id: string
  folderId?: string | null
  title?: string | null
  subject: 'math' | 'algebra' | 'geometry' | 'russian'
  // ...

// NEW:
export interface WorksheetListItem {
  id: string
  folderId?: string | null
  title?: string | null
  subject: string
  // ... rest unchanged
```

- [ ] **Step 6: Run existing tests to see what breaks**

Run: `npm run test:run`
Expected: `tests/unit/schemas.test.ts` will fail (tests expect enum rejection of 'english').

- [ ] **Step 7: Update tests/unit/schemas.test.ts**

```typescript
// tests/unit/schemas.test.ts — full replacement:
import { describe, it, expect } from 'vitest'
import { KnownSubjectSchema, GenerateSchema } from '../../shared/worksheet'

describe('Shared Schemas', () => {
  describe('KnownSubjectSchema', () => {
    it('should accept known subjects', () => {
      expect(() => KnownSubjectSchema.parse('math')).not.toThrow()
      expect(() => KnownSubjectSchema.parse('russian')).not.toThrow()
    })

    it('should reject unknown subjects', () => {
      expect(() => KnownSubjectSchema.parse('english')).toThrow()
      expect(() => KnownSubjectSchema.parse('')).toThrow()
    })
  })

  describe('GenerateSchema', () => {
    it('should accept prompt-based input', () => {
      const payload = { prompt: 'Физика 8 класс, сила трения' }
      expect(() => GenerateSchema.parse(payload)).not.toThrow()
    })

    it('should accept structured input', () => {
      const payload = { subject: 'math', grade: 3, topic: 'Сложение' }
      expect(() => GenerateSchema.parse(payload)).not.toThrow()
    })

    it('should accept any subject string in structured input', () => {
      const payload = { subject: 'physics', grade: 8, topic: 'Сила трения' }
      expect(() => GenerateSchema.parse(payload)).not.toThrow()
    })

    it('should reject empty input (no prompt and no structured fields)', () => {
      expect(() => GenerateSchema.parse({})).toThrow()
      expect(() => GenerateSchema.parse({ difficulty: 'easy' })).toThrow()
    })

    it('should reject incomplete structured input', () => {
      expect(() => GenerateSchema.parse({ subject: 'math', grade: 2 })).toThrow()
    })

    it('should accept valid grades (1-11)', () => {
      expect(() => GenerateSchema.parse({ subject: 'math', grade: 1, topic: 'Счёт' })).not.toThrow()
      expect(() => GenerateSchema.parse({ subject: 'algebra', grade: 11, topic: 'Логарифмы' })).not.toThrow()
    })

    it('should reject invalid grades', () => {
      expect(() => GenerateSchema.parse({ subject: 'math', grade: 0, topic: 'Тема' })).toThrow()
      expect(() => GenerateSchema.parse({ subject: 'math', grade: 12, topic: 'Тема' })).toThrow()
    })
  })
})
```

- [ ] **Step 8: Run tests to verify**

Run: `npm run test:run`
Expected: All pass.

- [ ] **Step 9: Commit**

```bash
git add shared/worksheet.ts shared/types.ts tests/unit/schemas.test.ts
git commit -m "feat: subject type from enum to string, GenerateSchema accepts prompt"
```

---

## Task 3: Prompt Parser — extract subject/grade/topic from free text

**Files:**
- Create: `api/_lib/generation/parse-prompt.ts`

- [ ] **Step 1: Create parse-prompt.ts with regex-based parsing**

```typescript
// api/_lib/generation/parse-prompt.ts
import { getAIProvider } from '../ai-provider.js'
import { getAgentsModel } from '../ai-models.js'

export interface ParsedPrompt {
  subject: string
  grade: number
  topic: string
}

// Known subject name mappings (Russian -> internal ID for config lookup)
const SUBJECT_PATTERNS: Array<{ pattern: RegExp; id: string; name: string }> = [
  { pattern: /\bматематик[аеиу]?\b/i, id: 'math', name: 'Математика' },
  { pattern: /\bалгебр[аеыу]?\b/i, id: 'algebra', name: 'Алгебра' },
  { pattern: /\bгеометри[яиюей]?\b/i, id: 'geometry', name: 'Геометрия' },
  { pattern: /\bрусск(ий|ого|ому)?\s*(язык[аеу]?)?\b/i, id: 'russian', name: 'Русский язык' },
  // Generic subjects — no config, use generic prompt
  { pattern: /\bфизик[аеиу]?\b/i, id: 'physics', name: 'Физика' },
  { pattern: /\bхими[яиюей]?\b/i, id: 'chemistry', name: 'Химия' },
  { pattern: /\bбиологи[яиюей]?\b/i, id: 'biology', name: 'Биология' },
  { pattern: /\bистори[яиюей]?\b/i, id: 'history', name: 'История' },
  { pattern: /\bобществознани[яеюй]?\b/i, id: 'social_studies', name: 'Обществознание' },
  { pattern: /\bгеографи[яиюей]?\b/i, id: 'geography', name: 'География' },
  { pattern: /\bлитератур[аеыу]?\b/i, id: 'literature', name: 'Литература' },
  { pattern: /\bинформатик[аеиу]?\b/i, id: 'informatics', name: 'Информатика' },
  { pattern: /\bанглийск(ий|ого|ому)?\s*(язык[аеу]?)?\b/i, id: 'english', name: 'Английский язык' },
  { pattern: /\bокружающ(ий|его|ему)?\s*мир[ауе]?\b/i, id: 'world_around', name: 'Окружающий мир' },
  { pattern: /\bОБЖ\b|безопасност[иь]\s*жизнедеятельност[иь]/i, id: 'obzh', name: 'ОБЖ' },
  { pattern: /\bмузык[аеиу]?\b/i, id: 'music', name: 'Музыка' },
  { pattern: /\bтехнологи[яиюей]?\b/i, id: 'technology', name: 'Технология' },
]

const GRADE_PATTERN = /(\d{1,2})\s*(?:класс|кл\.?)/i
const GRADE_WORD_PATTERN = /(?:первый|второй|третий|четвёртый|четвертый|пятый|шестой|седьмой|восьмой|девятый|десятый|одиннадцатый)\s*класс/i
const GRADE_WORDS: Record<string, number> = {
  'первый': 1, 'второй': 2, 'третий': 3, 'четвёртый': 4, 'четвертый': 4,
  'пятый': 5, 'шестой': 6, 'седьмой': 7, 'восьмой': 8, 'девятый': 9,
  'десятый': 10, 'одиннадцатый': 11,
}

// Prepositions to strip from topic: "по физике" -> "физике" is matched, rest is topic
const PREPOSITION_SUBJECT = /\bпо\s+/gi
const TOPIC_SEPARATORS = /[,;:]\s*|\bтема\s+|\bна тему\s+/gi

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

  // Strip leading "задания" / "задание" / "задачи" — these are intent words, not topic
  topic = topic.replace(/^(задания|задание|задачи|тест|контрольная|проверочная)\s*/i, '').trim()

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
 */
export async function parsePromptWithLLM(prompt: string): Promise<ParsedPrompt> {
  const ai = getAIProvider()
  const model = getAgentsModel()

  const systemPrompt = `Ты помощник, который извлекает из пользовательского запроса три поля для генерации школьных заданий.
Извлеки:
- subject: название предмета на русском (например: "Физика", "Математика", "История")
- grade: номер класса (число от 1 до 11)
- topic: тема урока

Если предмет не указан явно, определи по контексту темы.
Если класс не указан, определи подходящий класс по теме и предмету.

Ответь ТОЛЬКО валидным JSON без markdown:
{"subject": "...", "grade": N, "topic": "..."}`

  const response = await ai.chat({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    temperature: 0,
    max_tokens: 200,
  })

  const text = response.content.trim()
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
  // Simple transliteration for storage
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

/** Exported for use in formatSubjectName on frontend */
export const KNOWN_SUBJECT_NAMES: Record<string, string> = Object.fromEntries(
  SUBJECT_PATTERNS.map(sp => [sp.id, sp.name])
)
```

- [ ] **Step 2: Write tests for parsePromptLocal**

Create `tests/unit/parse-prompt.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parsePromptLocal } from '../../api/_lib/generation/parse-prompt'

describe('parsePromptLocal', () => {
  it('should parse "Математика 3 класс, сложение двузначных чисел"', () => {
    const result = parsePromptLocal('Математика 3 класс, сложение двузначных чисел')
    expect(result).toEqual({ subject: 'math', grade: 3, topic: 'сложение двузначных чисел' })
  })

  it('should parse "Задания по физике, 8 класс, тема сила трения"', () => {
    const result = parsePromptLocal('Задания по физике, 8 класс, тема сила трения')
    expect(result).toEqual({ subject: 'physics', grade: 8, topic: 'сила трения' })
  })

  it('should parse "Алгебра 7 класс линейные уравнения"', () => {
    const result = parsePromptLocal('Алгебра 7 класс линейные уравнения')
    expect(result).toEqual({ subject: 'algebra', grade: 7, topic: 'линейные уравнения' })
  })

  it('should parse "русский язык 5 кл. части речи"', () => {
    const result = parsePromptLocal('русский язык 5 кл. части речи')
    expect(result).toEqual({ subject: 'russian', grade: 5, topic: 'части речи' })
  })

  it('should parse "история 9 класс, Великая Отечественная война"', () => {
    const result = parsePromptLocal('история 9 класс, Великая Отечественная война')
    expect(result).toEqual({ subject: 'history', grade: 9, topic: 'Великая Отечественная война' })
  })

  it('should parse "геометрия 8 класс теорема Пифагора"', () => {
    const result = parsePromptLocal('геометрия 8 класс теорема Пифагора')
    expect(result).toEqual({ subject: 'geometry', grade: 8, topic: 'теорема Пифагора' })
  })

  it('should parse "окружающий мир 2 класс, времена года"', () => {
    const result = parsePromptLocal('окружающий мир 2 класс, времена года')
    expect(result).toEqual({ subject: 'world_around', grade: 2, topic: 'времена года' })
  })

  it('should return null for unparseable input', () => {
    expect(parsePromptLocal('что-то непонятное')).toBeNull()
    expect(parsePromptLocal('')).toBeNull()
  })

  it('should return null if only subject without grade', () => {
    // No grade -> can't determine
    expect(parsePromptLocal('физика')).toBeNull()
  })

  it('should use subject name as topic when topic is missing', () => {
    const result = parsePromptLocal('химия 9 класс')
    expect(result).toEqual({ subject: 'chemistry', grade: 9, topic: 'Химия' })
  })
})
```

- [ ] **Step 3: Run tests**

Run: `npm run test:run -- tests/unit/parse-prompt.test.ts`
Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add api/_lib/generation/parse-prompt.ts tests/unit/parse-prompt.test.ts
git commit -m "feat: add parsePrompt module — extract subject/grade/topic from free text"
```

---

## Task 4: Generic Prompt — universal system prompt for unknown subjects

**Files:**
- Create: `api/_lib/generation/generic-prompt.ts`
- Modify: `api/_lib/generation/prompts.ts:644-674,687-701`
- Modify: `api/_lib/generation/config/index.ts` (no code change needed, `getSubjectConfig` already returns undefined)

- [ ] **Step 1: Create generic-prompt.ts**

```typescript
// api/_lib/generation/generic-prompt.ts
import type { DifficultyLevel } from './config/difficulty.js'
import type { SubjectPromptConfig, GradeTierConfig } from './config/types.js'
import { KNOWN_SUBJECT_NAMES } from './parse-prompt.js'

/**
 * Build a generic SubjectPromptConfig for any subject not in the detailed config registry.
 */
export function buildGenericPromptConfig(subjectId: string): SubjectPromptConfig {
  const subjectName = KNOWN_SUBJECT_NAMES[subjectId] || subjectId

  return {
    systemPrompt: `ПРЕДМЕТ: ${subjectName}

Ты опытный учитель предмета "${subjectName}" в российской школе.
Создавай задания, соответствующие российской школьной программе (ФГОС) для указанного класса.

Особенности:
- Используй терминологию и понятия, принятые в российских учебниках
- Формулировки должны быть понятны ученику указанного класса
- Ответы должны быть однозначными и проверяемыми
- Все задания на русском языке`,

    contentRequirements: (grade: number, level: DifficultyLevel): string => {
      const levelRu = level === 'easy' ? 'базовый' : level === 'medium' ? 'средний' : 'повышенный'
      return `СОДЕРЖАНИЕ ЗАДАНИЙ (${subjectName}, ${grade} класс, ${levelRu} уровень):
- Задания должны соответствовать программе ${grade} класса
- Для тестов: дистракторы должны быть правдоподобными, отражающими типичные ошибки
- Используй конкретные факты, определения, примеры из курса ${grade} класса
- Избегай заданий, требующих знаний более старших классов`
    },

    diversityHints: `
Обязательно включи разнообразные задания:
- Задания на ЗНАНИЕ фактов, определений, формул
- Задания на ПОНИМАНИЕ (объясни, сравни, приведи пример)
- Задания на ПРИМЕНЕНИЕ (реши, найди, определи)
- Задания на АНАЛИЗ (найди ошибку, сравни, обоснуй)`,
  }
}

/**
 * Build a generic grade tier for any subject.
 * Less specific than per-subject tiers, but still enforces age-appropriate cognitive depth.
 */
export function buildGenericGradeTier(grade: number): GradeTierConfig {
  if (grade <= 4) {
    return {
      grades: [1, 4],
      cognitiveContract: `УРОВЕНЬ НАЧАЛЬНОЙ ШКОЛЫ (${grade} класс):
- Простые, конкретные формулировки
- Опора на наглядность и примеры из жизни
- Одношаговые задания для базового уровня
- Избегай абстрактных понятий`,
      exampleTask: '',
    }
  }

  if (grade <= 6) {
    return {
      grades: [5, 6],
      cognitiveContract: `УРОВЕНЬ 5-6 КЛАССА:
- Задания могут включать 1-2 шага решения
- Допустимы элементы анализа и сравнения
- Используй межпредметные связи где уместно
- Формулировки могут быть более развёрнутыми`,
      exampleTask: '',
    }
  }

  if (grade <= 8) {
    return {
      grades: [7, 8],
      cognitiveContract: `УРОВЕНЬ 7-8 КЛАССА:
- Задания требуют анализа и обоснования
- Многошаговые задания для среднего и повышенного уровня
- Используй задания на сравнение, классификацию, установление причинно-следственных связей
- Допустимы задания с несколькими подходами к решению`,
      exampleTask: '',
    }
  }

  // 9-11
  return {
    grades: [9, 11],
    cognitiveContract: `УРОВЕНЬ СТАРШЕЙ ШКОЛЫ (${grade} класс):
- Задания на синтез, оценку, аргументацию
- Многошаговые задания обязательны для среднего и повышенного уровня
- Связь с экзаменационными форматами (ОГЭ для 9 кл., ЕГЭ для 10-11 кл.)
- Задания на критическое мышление и обоснование позиции`,
    exampleTask: '',
    examContext: grade === 9
      ? 'Задания должны соответствовать уровню ОГЭ.'
      : grade >= 10
        ? 'Задания должны соответствовать уровню ЕГЭ.'
        : undefined,
  }
}
```

- [ ] **Step 2: Modify prompts.ts — add generic fallback in buildSystemPrompt and buildUserPrompt**

In `api/_lib/generation/prompts.ts`:

```typescript
// Add import at top (after existing imports):
import { buildGenericPromptConfig, buildGenericGradeTier } from './generic-prompt.js'
```

Modify `getSubjectPromptConfig` (around line 31-36 area) — add fallback:

```typescript
// OLD helper (find the function that returns promptConfig):
function getSubjectPromptConfig(subjectId: string): SubjectPromptConfig | undefined {
  return SUBJECT_PROMPT_CONFIGS[subjectId]
}

// NEW:
function getSubjectPromptConfig(subjectId: string): SubjectPromptConfig {
  return SUBJECT_PROMPT_CONFIGS[subjectId] || buildGenericPromptConfig(subjectId)
}
```

Modify `getGradeTierForGrade` similarly:

```typescript
// OLD:
function getGradeTierForGrade(subjectId: string, grade: number): GradeTierConfig | null {
  const getter = GRADE_TIER_GETTERS[subjectId]
  return getter ? getter(grade) : null
}

// NEW:
function getGradeTierForGrade(subjectId: string, grade: number): GradeTierConfig {
  const getter = GRADE_TIER_GETTERS[subjectId]
  return getter?.(grade) || buildGenericGradeTier(grade)
}
```

In `buildSystemPrompt` (line 644-674), the `if (promptConfig && tier)` check now always succeeds because both functions return non-null. Simplify:

```typescript
// OLD (line 648):
if (promptConfig && tier) {
  // NEW config-driven path
  ...
}
// FALLBACK: base role prompt only
return BASE_ROLE_PROMPT

// NEW:
// Config path always works — detailed for known subjects, generic for unknown
const parts = [
  BASE_ROLE_PROMPT,
  promptConfig.systemPrompt,
]

if (tier.cognitiveContract) {
  parts.push(`... cognitive contract ...`)
}
// ... rest of the function unchanged, just remove the fallback branch
```

Similarly for `getDifficultyBlock` — if the subject has no specific difficulty getter, return a generic block:

Find the `getDifficultyBlock` function and add a fallback at the end:

```typescript
// In getDifficultyBlock, where it looks up SUBJECT_DIFFICULTY_GETTERS[subject]:
// If no specific getter exists, return generic difficulty text:
const getter = SUBJECT_DIFFICULTY_GETTERS[subject]
if (getter) {
  const subjectDifficulty = getter(grade, level)
  // ... existing code
} else {
  // Generic difficulty for unknown subjects
  const levelNames = { easy: 'БАЗОВЫЙ', medium: 'СРЕДНИЙ', hard: 'ПОВЫШЕННЫЙ' }
  return `УРОВЕНЬ СЛОЖНОСТИ: ${levelNames[level]} (${grade} класс)

${level === 'easy' ? 'Задания на воспроизведение знаний, простые формулировки, одношаговые решения.' :
  level === 'medium' ? 'Задания на применение знаний, требуют 2-3 шага, элементы анализа.' :
  'Задания на анализ и синтез, многошаговые, нестандартные формулировки, требуют обоснования.'}`
}
```

- [ ] **Step 3: Run tests**

Run: `npm run test:run`
Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add api/_lib/generation/generic-prompt.ts api/_lib/generation/prompts.ts
git commit -m "feat: generic prompt system for unknown subjects with grade-tier fallbacks"
```

---

## Task 5: Backend API — accept prompt, parse, resolve, generate

**Files:**
- Modify: `server/routes/generate.ts:29-42,147-161,376-383,430-441`
- Modify: `api/_lib/ai-models.ts:26-29` (isStemSubject stays, unknown = non-STEM)

- [ ] **Step 1: Update POST /api/generate to accept and parse prompt**

In `server/routes/generate.ts`, add import and modify the handler:

```typescript
// Add import at top:
import { parsePrompt } from '../../api/_lib/generation/parse-prompt.js'
import type { ResolvedGeneratePayload } from '../../shared/types.js'
```

After `GenerateSchema.safeParse(req.body)` succeeds (line 42), add prompt resolution:

```typescript
// OLD (line 42):
const input: Input = parse.data

// NEW — resolve prompt into structured fields:
const raw = parse.data

let resolved: ResolvedGeneratePayload

if (raw.prompt && (!raw.subject || !raw.grade || !raw.topic)) {
  // Free-text mode: parse the prompt
  const parsed = await parsePrompt(raw.prompt)
  resolved = {
    subject: raw.subject || parsed.subject,
    grade: raw.grade || parsed.grade,
    topic: raw.topic || parsed.topic,
    folderId: raw.folderId,
    taskTypes: raw.taskTypes,
    difficulty: raw.difficulty,
    format: raw.format,
    variantIndex: raw.variantIndex,
  }
} else if (raw.subject && raw.grade && raw.topic) {
  // Structured mode (legacy or explicit)
  resolved = {
    subject: raw.subject,
    grade: raw.grade,
    topic: raw.topic,
    folderId: raw.folderId,
    taskTypes: raw.taskTypes,
    difficulty: raw.difficulty,
    format: raw.format,
    variantIndex: raw.variantIndex,
  }
} else {
  return res.status(400).json({
    status: 'error',
    code: 'VALIDATION_ERROR',
    message: 'Введите запрос или укажите предмет, класс и тему.',
  })
}
```

Then replace all `input.subject`, `input.grade`, `input.topic` references in the handler with `resolved.subject`, `resolved.grade`, `resolved.topic` (and similarly for other fields). The rest of the handler stays the same — the generation pipeline already accepts string subjects.

Key places to update (search-replace `input.` -> `resolved.` within the handler):
- Line ~46: `calculateGenerationCost(resolved.format ?? ...)`
- Line ~147-158: `subject: resolved.subject` in generations insert
- Line ~178-181: WorksheetJobData fields
- Line ~224-231: generateParams fields
- Line ~307-318: worksheet save to DB
- Line ~379-383: error logging

- [ ] **Step 2: Update RegenerateInputSchema (line 430-441)**

```typescript
// OLD:
const RegenerateInputSchema = z.object({
  taskIndex: z.number().int().min(0),
  taskType: TaskTypeIdSchema,
  isTest: z.boolean(),
  context: z.object({
    subject: z.enum(['math', 'algebra', 'geometry', 'russian']),
    grade: z.number().int().min(1).max(11),
    topic: z.string().min(3).max(200),
    difficulty: DifficultyLevelSchema,
  }),
})

// NEW:
const RegenerateInputSchema = z.object({
  taskIndex: z.number().int().min(0),
  taskType: TaskTypeIdSchema,
  isTest: z.boolean(),
  context: z.object({
    subject: z.string().min(1).max(100),
    grade: z.number().int().min(1).max(11),
    topic: z.string().min(3).max(200),
    difficulty: DifficultyLevelSchema,
  }),
})
```

- [ ] **Step 3: Update presentations route InputSchema**

In `server/routes/presentations.ts` line 30:

```typescript
// OLD:
subject: z.enum(['math', 'algebra', 'geometry', 'russian']),
// NEW:
subject: z.string().min(1).max(100),
```

- [ ] **Step 4: Update admin generations filter**

In `server/routes/admin/generations.ts` line 23:

```typescript
// OLD:
subject: z.enum(['all', 'math', 'algebra', 'geometry', 'russian']).optional().default('all'),
// NEW:
subject: z.string().optional().default('all'),
```

- [ ] **Step 5: Run smoke tests to verify existing subjects still work**

Run: `npm run smoke`
Expected: Pass (DummyProvider, no API calls).

- [ ] **Step 6: Commit**

```bash
git add server/routes/generate.ts server/routes/presentations.ts server/routes/admin/generations.ts
git commit -m "feat: API accepts free-text prompt, resolves to subject/grade/topic"
```

---

## Task 6: Frontend — free-text input replacing dropdowns

**Files:**
- Modify: `src/constants/generation.ts:23-28,92-103`
- Modify: `src/pages/GeneratePage.tsx`
- Modify: `src/components/generation/WorksheetGenerateForm.tsx`
- Modify: `src/lib/api.ts` (minor — payload type)
- Modify: `src/lib/dashboard-api.ts:223-231` (formatSubjectName)

- [ ] **Step 1: Update generation constants — remove SUBJECTS dependency from form schema**

In `src/constants/generation.ts`:

```typescript
// Keep SUBJECTS array for display purposes (list pages, etc) but don't use in form validation:
// OLD line 92-103:
export const GenerateFormSchema = z.object({
  subject: z.enum(['math', 'algebra', 'geometry', 'russian'], { ... }),
  grade: z.number({ ... }).int().min(1).max(11),
  topic: z.string().min(3).max(200),
  ...
})

// NEW:
export const GenerateFormSchema = z.object({
  prompt: z.string().min(3, 'Минимум 3 символа').max(500, 'Максимум 500 символов'),
  folderId: z.string().uuid().nullable().optional(),
  format: z.enum(['open_only', 'test_only', 'test_and_open']),
  variantIndex: z.number().int().min(0).max(2),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  taskTypes: z.array(z.enum(['single_choice', 'multiple_choice', 'open_question', 'matching', 'fill_blank'])).min(1),
})

export type GenerateFormValues = z.infer<typeof GenerateFormSchema>
```

Also add example prompts for the UI:

```typescript
export const EXAMPLE_PROMPTS = [
  'Математика 3 класс, сложение и вычитание в пределах 1000',
  'Алгебра 8 класс, квадратные уравнения',
  'Русский язык 5 класс, части речи',
  'Физика 8 класс, сила трения',
  'История 9 класс, Великая Отечественная война',
  'Биология 7 класс, строение клетки',
  'Геометрия 7 класс, признаки равенства треугольников',
  'Окружающий мир 2 класс, времена года',
]
```

- [ ] **Step 2: Update WorksheetGenerateForm.tsx — replace subject/grade dropdowns with text input**

Replace the subject `<Controller>` + grade `<Controller>` blocks (lines ~68-101) with a single text input:

```tsx
{/* Prompt input */}
<div>
  <label className="block text-sm font-semibold text-slate-700 text-left mb-2">
    Что сгенерировать?
  </label>
  <input
    type="text"
    className="h-14 w-full rounded-xl border border-slate-200 bg-white px-5 text-lg text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-[#8C52FF] focus:ring-4 focus:ring-[#8C52FF]/10"
    placeholder="Например: Математика 3 класс, сложение двузначных чисел"
    {...form.register('prompt')}
    autoFocus
  />
  {form.formState.errors.prompt && (
    <p className="mt-1 text-sm text-red-500">{form.formState.errors.prompt.message}</p>
  )}
</div>

{/* Example chips */}
<div className="flex flex-wrap gap-2">
  {EXAMPLE_PROMPTS.slice(0, 4).map((example) => (
    <button
      key={example}
      type="button"
      onClick={() => form.setValue('prompt', example, { shouldValidate: true })}
      className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:border-[#8C52FF] hover:bg-purple-50 text-slate-600 hover:text-slate-800 transition-all"
    >
      {example}
    </button>
  ))}
</div>
```

Remove the old topic `<input>` (lines ~105-116) — the prompt field now replaces it.

- [ ] **Step 3: Update GeneratePage.tsx — form defaults and submission**

```typescript
// Update form defaults:
const form = useForm<GenerateFormValues>({
  resolver: zodResolver(GenerateFormSchema),
  defaultValues: {
    prompt: '',
    folderId: null,
    format: 'test_and_open',
    variantIndex: 0,
    difficulty: 'medium',
    taskTypes: ['single_choice', 'open_question'],
  }
})
```

Update `formValuesToPayload`:

```typescript
// OLD:
function formValuesToPayload(v: GenerateFormValues): GeneratePayload {
  return { subject: v.subject, grade: v.grade, topic: v.topic, ... }
}

// NEW:
function formValuesToPayload(v: GenerateFormValues): GeneratePayload {
  return {
    prompt: v.prompt,
    folderId: v.folderId,
    taskTypes: v.taskTypes,
    difficulty: v.difficulty,
    format: v.format,
    variantIndex: v.variantIndex,
  }
}
```

Remove `watchSubject`, `availableGrades`, `handleSubjectChange` state/memos — no longer needed.

Remove the subject-dependent grade reset logic.

- [ ] **Step 4: Update formatSubjectName for unknown subjects**

In `src/lib/dashboard-api.ts`:

```typescript
// OLD:
export function formatSubjectName(subject: string): string {
  const names: Record<string, string> = {
    math: 'Математика',
    algebra: 'Алгебра',
    geometry: 'Геометрия',
    russian: 'Русский язык',
  }
  return names[subject] || subject
}

// NEW — add all known subjects:
export function formatSubjectName(subject: string): string {
  const names: Record<string, string> = {
    math: 'Математика',
    algebra: 'Алгебра',
    geometry: 'Геометрия',
    russian: 'Русский язык',
    physics: 'Физика',
    chemistry: 'Химия',
    biology: 'Биология',
    history: 'История',
    social_studies: 'Обществознание',
    geography: 'География',
    literature: 'Литература',
    informatics: 'Информатика',
    english: 'Английский язык',
    world_around: 'Окружающий мир',
    obzh: 'ОБЖ',
    music: 'Музыка',
    technology: 'Технология',
  }
  return names[subject] || subject
}
```

- [ ] **Step 5: Update api.ts generateWorksheet if needed**

The `generateWorksheet` function in `src/lib/api.ts` sends `payload` as-is to `POST /api/generate`. Since `GeneratePayload` type is already updated (Task 2), no code change needed — just verify the type import.

- [ ] **Step 6: Run dev server and test manually**

Run: `npm run dev`

Test:
1. Type "Математика 3 класс, сложение" -> should work (known subject, uses detailed config)
2. Type "Физика 8 класс, сила трения" -> should work (unknown subject, uses generic prompt)
3. Click example chips -> should fill input
4. Existing worksheets in "Мои листы" should display correctly

- [ ] **Step 7: Commit**

```bash
git add src/constants/generation.ts src/pages/GeneratePage.tsx src/components/generation/WorksheetGenerateForm.tsx src/lib/dashboard-api.ts
git commit -m "feat: free-text input UI replacing subject/grade dropdowns"
```

---

## Task 7: AI Provider — ensure generateWorksheet handles string subjects

**Files:**
- Modify: `api/_lib/providers/openai-provider.ts` (verify GenerateParams type)

- [ ] **Step 1: Verify openai-provider.ts accepts string subject**

Check the `GenerateParams` interface used by `generateWorksheet`. It should already accept `string` for subject since `prompts.ts` `PromptParams` uses `subject: string`.

If `GenerateParams` has a specific Subject enum type, change it:

```typescript
// If GenerateParams.subject is typed as Subject (the old enum):
// Change to string
subject: string
```

The `buildSystemPrompt` and `buildUserPrompt` functions already accept `string` — verified in prompts.ts line 644 and 687.

- [ ] **Step 2: Verify validation agents handle string subjects**

Check `api/_lib/generation/validation/agents/index.ts` line 106:
```typescript
params: { subject: string; grade: number; topic: string; difficulty: DifficultyLevel }
```
Already typed as `string` — no change needed.

Check `isStemSubject` in `api/_lib/ai-models.ts`:
```typescript
const STEM_SUBJECTS = new Set(['math', 'algebra', 'geometry'])
export function isStemSubject(subject: string): boolean {
  return STEM_SUBJECTS.has(subject)
}
```
Unknown subjects will return `false` (non-STEM), which means they'll use the humanities verifier model (gemini-2.5-flash-lite). This is correct — for unknown subjects, the lighter model with fewer false positives is safer.

No changes needed.

- [ ] **Step 3: Run full test suite**

Run: `npm run test:run`
Expected: All pass.

- [ ] **Step 4: Commit (only if changes were needed)**

```bash
git add api/_lib/providers/openai-provider.ts
git commit -m "fix: ensure AI provider accepts string subjects"
```

---

## Task 8: Presentation form — same free-text approach

**Files:**
- Modify: `src/components/generation/PresentationGenerateForm.tsx`
- Modify: `src/constants/generation.ts` (presentation form schema)

- [ ] **Step 1: Update PresentationGenerateForm similar to WorksheetGenerateForm**

The presentation form also has subject/grade dropdowns. Apply the same pattern:
- Replace subject+grade+topic with single `prompt` text input
- Update form schema and default values
- Add example prompts for presentations

```typescript
// In PresentationGenerateForm, replace:
// - Subject <Controller>
// - Grade <Controller>  
// - Topic <input>
// With single prompt input (same pattern as WorksheetGenerateForm, Task 6 Step 2)
```

- [ ] **Step 2: Update presentation generation route to parse prompt**

The presentation route (`server/routes/presentations.ts`) already had its InputSchema updated in Task 5 Step 3. But it also needs prompt parsing like the worksheet route:

```typescript
// In server/routes/presentations.ts, after validation:
// Add same prompt resolution logic as generate.ts (Task 5 Step 1)
```

- [ ] **Step 3: Test presentation generation**

Run: `npm run dev`
Test: Type "Биология 7 класс, строение клетки" in presentation tab.

- [ ] **Step 4: Commit**

```bash
git add src/components/generation/PresentationGenerateForm.tsx src/constants/generation.ts server/routes/presentations.ts
git commit -m "feat: free-text input for presentation generation"
```

---

## Task 9: Backward Compatibility & Edge Cases

**Files:**
- Modify: `server/routes/worksheets.ts` (verify subject field returned as string)
- Modify: `src/pages/WorksheetPage.tsx` (verify context uses string subject)
- Modify: `src/pages/SavedWorksheetPage.tsx` (verify)
- Modify: `src/hooks/useWorksheetEditor.ts` (verify regeneration sends string subject)

- [ ] **Step 1: Verify worksheet list pages handle string subjects**

In `src/pages/WorksheetsListPage.tsx` and `src/components/WorksheetManager.tsx`, the `getDisplayTitle` function calls `formatSubjectName(ws.subject)`. Since we updated `formatSubjectName` in Task 6, unknown subjects will pass through as-is. This is acceptable.

No code change needed — just verify.

- [ ] **Step 2: Verify regeneration sends correct subject type**

In `src/hooks/useWorksheetEditor.ts`, find where `handleRegenerateTask` builds the `context` object:

```typescript
context: {
  subject: worksheet.subject,  // Now a string, matches new RegenerateInputSchema
  grade: ...,
  topic: ...,
  difficulty: ...,
}
```

Since `worksheet.subject` is now `string` (via updated WorksheetSchema), and RegenerateInputSchema now accepts `z.string()` (Task 5 Step 2), this works without changes.

- [ ] **Step 3: Verify WorksheetPage session storage**

In `src/pages/GeneratePage.tsx`, the session is saved with:
```typescript
saveSession(sessionId, {
  payload: { ... },
  worksheet,
  pdfBase64: worksheet.pdfBase64
})
```

The `payload` used to include `subject: form.getValues('subject')`. Now the form doesn't have a `subject` field. Update this to extract subject from the returned worksheet:

```typescript
// In GeneratePage.tsx onSuccess:
saveSession(sessionId, {
  payload: {
    subject: worksheet.subject,
    grade: parseInt(worksheet.grade) || 0,
    topic: worksheet.topic,
    difficulty: form.getValues('difficulty'),
  },
  worksheet,
  pdfBase64: worksheet.pdfBase64,
})
```

- [ ] **Step 4: Run full test suite and build**

Run: `npm run test:run && npm run build`
Expected: All tests pass, build succeeds with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/GeneratePage.tsx src/hooks/useWorksheetEditor.ts
git commit -m "fix: backward compatibility for string subjects in session storage and regeneration"
```

---

## Task 10: Smoke Test with New Subjects

- [ ] **Step 1: Run dev server with DummyProvider**

```bash
AI_PROVIDER=dummy npm run dev
```

- [ ] **Step 2: Test existing subjects work (regression)**

Open browser, type:
- "Математика 3 класс, сложение двузначных чисел" -> Generate -> Should produce worksheet
- "Алгебра 7 класс, линейные уравнения" -> Generate -> Should produce worksheet

Verify: PDF downloads, task types display correctly, regeneration works.

- [ ] **Step 3: Test new subjects (DummyProvider returns mock data)**

Type:
- "Физика 8 класс, сила трения" -> Generate
- "История 9 класс, Великая Отечественная война" -> Generate

Verify: Generation completes, worksheet displays, PDF downloads.

- [ ] **Step 4: Test edge cases**

- Empty input -> Validation error message
- Just "физика" (no grade) -> LLM fallback should determine grade, or error
- "3 класс" (no subject) -> LLM fallback should determine subject
- Very long input (500 chars) -> Should work
- Cyrillic + numbers mixed -> Should parse correctly

- [ ] **Step 5: Test saved worksheets list**

Open "Мои листы" page. Verify:
- Old worksheets (math, algebra etc.) display correctly
- New subject worksheets display correctly with subject name
- Regeneration works on saved worksheets

- [ ] **Step 6: Final commit**

If any fixes were needed during testing, commit them.

```bash
git add -A
git commit -m "test: verify free-input generation for existing and new subjects"
```
