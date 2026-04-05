import type { GeneratedTask } from '../ai-provider.js'

/**
 * Shuffle answer options for single_choice and multiple_choice tasks
 * to eliminate positional bias (LLM tends to place correct answer at index 0 or 1).
 *
 * Updates correctIndex / correctIndices to match the new order.
 * Other task types are returned unchanged.
 */
export function shuffleTasksOptions(tasks: GeneratedTask[]): GeneratedTask[] {
  return tasks.map(shuffleSingleTaskOptions)
}

function shuffleSingleTaskOptions(task: GeneratedTask): GeneratedTask {
  if (task.type === 'single_choice') {
    return shuffleSingleChoice(task)
  }
  if (task.type === 'multiple_choice') {
    return shuffleMultipleChoice(task)
  }
  return task
}

function shuffleSingleChoice(task: GeneratedTask): GeneratedTask {
  const { options, correctIndex } = task
  if (!options || options.length < 2 || correctIndex == null || correctIndex >= options.length) {
    return task
  }

  const perm = fisherYatesShuffle(options.length)
  return {
    ...task,
    options: perm.map(oldIdx => options[oldIdx]),
    correctIndex: perm.indexOf(correctIndex),
  }
}

function shuffleMultipleChoice(task: GeneratedTask): GeneratedTask {
  const { options, correctIndices } = task
  if (!options || options.length < 2 || !correctIndices || correctIndices.length === 0) {
    return task
  }

  const perm = fisherYatesShuffle(options.length)
  return {
    ...task,
    options: perm.map(oldIdx => options[oldIdx]),
    correctIndices: correctIndices
      .map(oldIdx => perm.indexOf(oldIdx))
      .sort((a, b) => a - b),
  }
}

/** Returns a shuffled array of indices [0..n-1]. perm[newPos] = oldPos. */
function fisherYatesShuffle(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
