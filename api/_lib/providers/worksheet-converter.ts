import type { Worksheet, TestQuestion, Assignment } from '../../../shared/types.js'
import type { GenerateParams, RegenerateTaskResult, GeneratedTask } from '../ai-provider.js'

// =============================================================================
// Helpers
// =============================================================================

/**
 * Shuffle the right column of a matching task so answers aren't in order.
 * Updates correctPairs to reflect the new positions.
 */
function shuffleMatchingRightColumn(task: GeneratedTask): void {
  if (task.type !== 'matching') return
  const right = task.rightColumn
  const pairs = task.correctPairs
  if (!right || !pairs || right.length <= 1) return

  // Fisher-Yates shuffle on index array
  const indices = right.map((_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }

  // If shuffle produced identity permutation, swap first two
  if (indices.every((val, idx) => val === idx)) {
    ;[indices[0], indices[1]] = [indices[1], indices[0]]
  }

  // Build oldIndex -> newIndex mapping
  const newPosition = new Map<number, number>()
  indices.forEach((oldIdx, newIdx) => {
    newPosition.set(oldIdx, newIdx)
  })

  // Apply shuffle to right column
  task.rightColumn = indices.map(oldIdx => right[oldIdx])

  // Update correctPairs with new right indices
  task.correctPairs = pairs.map(([l, r]) => [l, newPosition.get(r)!] as [number, number])
}

/** Format matching answer using Cyrillic letters (а, б, в, г) matching the display */
function formatMatchingAnswer(pairs: [number, number][]): string {
  return pairs.map(([l, r]) => `${l + 1} — ${String.fromCharCode(1072 + r)}`).join(', ')
}

// =============================================================================
// Converters
// =============================================================================

/**
 * Convert generated tasks to Worksheet format.
 */
export function convertToWorksheet(
  params: GenerateParams,
  testTasks: GeneratedTask[],
  openTasksList: GeneratedTask[],
  targetTestCount: number,
  targetOpenCount: number
): Worksheet {
  const test: TestQuestion[] = testTasks.slice(0, targetTestCount).map(task => {
    if (task.type === 'single_choice') {
      const options = task.options || []
      const correctIdx = task.correctIndex ?? 0
      return {
        question: task.question || '',
        options,
        answer: options[correctIdx] || options[0] || ''
      }
    } else if (task.type === 'multiple_choice') {
      const options = task.options || []
      const correctIdxs = task.correctIndices || [0]
      const answers = correctIdxs.map(i => options[i]).filter(Boolean)
      return {
        question: task.question || '',
        options,
        answer: answers.join(', ')
      }
    }
    return { question: '', options: [], answer: '' }
  })

  const assignments: Assignment[] = openTasksList.slice(0, targetOpenCount).map((task, i) => {
    let text = ''

    if (task.type === 'open_question') {
      text = task.question || ''
    } else if (task.type === 'matching') {
      shuffleMatchingRightColumn(task)
      const matchingData = {
        type: 'matching',
        instruction: task.instruction || 'Соотнеси элементы',
        leftColumn: task.leftColumn || [],
        rightColumn: task.rightColumn || [],
      }
      text = `<!--MATCHING:${JSON.stringify(matchingData)}-->`
    } else if (task.type === 'fill_blank') {
      text = task.textWithBlanks || ''
    }

    return {
      title: `Задание ${i + 1}`,
      text
    }
  })

  const answersAssignments: string[] = openTasksList.slice(0, targetOpenCount).map((task, i) => {
    let answer = ''
    if (task.type === 'open_question') {
      answer = task.correctAnswer || ''
    } else if (task.type === 'matching') {
      const pairs = task.correctPairs || []
      answer = formatMatchingAnswer(pairs)
    } else if (task.type === 'fill_blank') {
      const blanks = task.blanks || []
      answer = blanks.map(b => `(${b.position}) ${b.correctAnswer}`).join('; ')
    }
    if (!answer) {
      console.warn(`[УчиОн] Empty answer for open task ${i} (type: ${task.type})`, {
        hasCorrectAnswer: !!task.correctAnswer,
        hasCorrectPairs: !!(task.correctPairs?.length),
        hasBlanks: !!(task.blanks?.length),
      })
    }
    return answer
  })

  const answersTest: string[] = testTasks.slice(0, targetTestCount).map((task, i) => {
    let answer = ''
    if (task.type === 'single_choice') {
      const options = task.options || []
      const idx = task.correctIndex ?? 0
      if (idx >= options.length) {
        console.warn(`[УчиОн] single_choice task ${i}: correctIndex ${idx} out of bounds (options: ${options.length})`)
      }
      answer = options[idx] || options[0] || ''
    } else if (task.type === 'multiple_choice') {
      const options = task.options || []
      const idxs = task.correctIndices || [0]
      const outOfBounds = idxs.filter(idx => idx >= options.length)
      if (outOfBounds.length > 0) {
        console.warn(`[УчиОн] multiple_choice task ${i}: correctIndices ${outOfBounds.join(',')} out of bounds (options: ${options.length})`)
      }
      answer = idxs.map(idx => options[idx]).filter(Boolean).join(', ')
    }
    if (!answer) {
      console.warn(`[УчиОн] Empty answer for test task ${i} (type: ${task.type})`, {
        hasOptions: !!(task.options?.length),
        correctIndex: task.correctIndex,
        correctIndices: task.correctIndices,
      })
    }
    return answer
  })

  return {
    id: '',
    subject: params.subject,
    grade: `${params.grade} класс`,
    topic: params.topic,
    assignments,
    test,
    answers: {
      assignments: answersAssignments,
      test: answersTest
    },
    pdfBase64: ''
  }
}

/**
 * Convert a single GeneratedTask to assignment/testQuestion + answer.
 * Used by regenerateTask.
 */
export function convertSingleTask(task: GeneratedTask, isTest: boolean): RegenerateTaskResult {
  if (isTest) {
    if (task.type === 'single_choice') {
      const options = task.options || []
      const correctIdx = task.correctIndex ?? 0
      const answer = options[correctIdx] || options[0] || ''
      return {
        testQuestion: {
          question: task.question || '',
          options,
          answer
        },
        answer
      }
    } else if (task.type === 'multiple_choice') {
      const options = task.options || []
      const correctIdxs = task.correctIndices || [0]
      const answers = correctIdxs.map(i => options[i]).filter(Boolean)
      const answer = answers.join(', ')
      return {
        testQuestion: {
          question: task.question || '',
          options,
          answer
        },
        answer
      }
    }
    return { testQuestion: { question: '', options: [], answer: '' }, answer: '' }
  }

  let text = ''
  let answer = ''

  if (task.type === 'open_question') {
    text = task.question || ''
    answer = task.correctAnswer || ''
  } else if (task.type === 'matching') {
    shuffleMatchingRightColumn(task)
    const matchingData = {
      type: 'matching',
      instruction: task.instruction || 'Соотнеси элементы',
      leftColumn: task.leftColumn || [],
      rightColumn: task.rightColumn || [],
    }
    text = `<!--MATCHING:${JSON.stringify(matchingData)}-->`
    const pairs = task.correctPairs || []
    answer = formatMatchingAnswer(pairs)
  } else if (task.type === 'fill_blank') {
    text = task.textWithBlanks || ''
    const blanks = task.blanks || []
    answer = blanks.map(b => `(${b.position}) ${b.correctAnswer}`).join('; ')
  }

  return {
    assignment: { title: 'Задание', text },
    answer
  }
}
