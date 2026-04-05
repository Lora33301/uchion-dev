/**
 * Generic prompt config for subjects without detailed per-subject configs.
 * Provides universal grade-tier and difficulty prompts based on ФГОС levels.
 */
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
