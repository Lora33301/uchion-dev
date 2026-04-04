import type { GeneratedTask } from '../ai-provider.js'
import { getCircuitBreaker } from './circuit-breaker.js'

// =============================================================================
// Types
// =============================================================================

export interface TaskSplit {
  testTasks: GeneratedTask[]
  openTasksList: GeneratedTask[]
}

/** Callback that generates N missing open + N missing test tasks */
type GenerateMissingFn = (missingOpen: number, missingTest: number) => Promise<GeneratedTask[]>

// =============================================================================
// Split helpers
// =============================================================================

/** Split flat task array into test (single/multiple choice) and open tasks */
export function splitTasks(tasks: GeneratedTask[]): TaskSplit {
  const testTasks: GeneratedTask[] = []
  const openTasksList: GeneratedTask[] = []
  for (const task of tasks) {
    if (task.type === 'single_choice' || task.type === 'multiple_choice') {
      testTasks.push(task)
    } else {
      openTasksList.push(task)
    }
  }
  return { testTasks, openTasksList }
}

function appendTasks(split: TaskSplit, newTasks: GeneratedTask[]): void {
  for (const task of newTasks) {
    if (task.type === 'single_choice' || task.type === 'multiple_choice') {
      split.testTasks.push(task)
    } else {
      split.openTasksList.push(task)
    }
  }
}

// =============================================================================
// Retry loop
// =============================================================================

const MAX_RETRIES = 3

/**
 * Retry generating missing tasks with exponential backoff.
 * Circuit breaker prevents retries if AI provider is systematically failing.
 * Mutates `split` in place.
 */
export async function retryMissingTasks(
  split: TaskSplit,
  targetTest: number,
  targetOpen: number,
  generateMissing: GenerateMissingFn
): Promise<void> {
  const circuitBreaker = getCircuitBreaker()

  if (circuitBreaker.isOpen()) {
    console.warn('[УчиОн] Circuit breaker is OPEN - skipping retry loop due to systematic AI failures')
    return
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const missingOpen = targetOpen - split.openTasksList.length
    const missingTest = targetTest - split.testTasks.length
    if (missingOpen <= 0 && missingTest <= 0) break

    console.log(`[УчиОн] Task count mismatch: got ${split.openTasksList.length} open (expected ${targetOpen}), ${split.testTasks.length} test (expected ${targetTest}). Retrying... (attempt ${attempt}/${MAX_RETRIES})`)

    // Exponential backoff: 1s, 2s, 4s
    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)))

    const retryOpen = Math.max(0, missingOpen)
    const retryTest = Math.max(0, missingTest)
    if (retryOpen === 0 && retryTest === 0) break

    try {
      const retryTasks = await generateMissing(retryOpen, retryTest)
      appendTasks(split, retryTasks)
      console.log(`[УчиОн] After retry ${attempt}: testTasks=${split.testTasks.length}, openTasksList=${split.openTasksList.length}`)
      circuitBreaker.recordSuccess()
    } catch (retryError) {
      console.error(`[УчиОн] Retry ${attempt} failed:`, retryError)
      circuitBreaker.recordFailure()
    }
  }

  const finalMissingOpen = targetOpen - split.openTasksList.length
  const finalMissingTest = targetTest - split.testTasks.length
  if (finalMissingOpen > 0 || finalMissingTest > 0) {
    console.warn(`[УчиОн] After ${MAX_RETRIES} retries still missing: ${Math.max(0, finalMissingOpen)} open, ${Math.max(0, finalMissingTest)} test`)
  }
}

// =============================================================================
// Post-validation backfill
// =============================================================================

/**
 * Single retry attempt to fill gaps left after validation removed tasks.
 * Mutates `split` in place.
 */
export async function backfillTasks(
  split: TaskSplit,
  targetTest: number,
  targetOpen: number,
  generateMissing: GenerateMissingFn
): Promise<void> {
  const circuitBreaker = getCircuitBreaker()
  const missingOpen = targetOpen - split.openTasksList.length
  const missingTest = targetTest - split.testTasks.length

  if ((missingOpen <= 0 && missingTest <= 0) || circuitBreaker.isOpen()) return

  console.log(`[УчиОн] Post-validation backfill: need ${missingOpen} open + ${missingTest} test`)
  try {
    const tasks = await generateMissing(Math.max(0, missingOpen), Math.max(0, missingTest))
    appendTasks(split, tasks)
    console.log(`[УчиОн] After backfill: testTasks=${split.testTasks.length}, openTasksList=${split.openTasksList.length}`)
  } catch (e) {
    console.warn('[УчиОн] Post-validation backfill failed:', e)
  }
}
