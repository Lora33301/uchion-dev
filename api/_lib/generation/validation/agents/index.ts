import { verifyAnswers } from './answer-verifier.js'
import { checkQualityAndContent } from './unified-checker.js'
import { checkDifficulty } from './difficulty-checker.js'
import { fixTask, MAX_FIXES_PER_GENERATION, type FixResult } from './task-fixer.js'
import { usesLightweightVerification, getVerifierModelConfig, type VerifierModelConfig } from '../../../ai-models.js'
import type { TaskTypeId } from '../../config/task-types.js'
import type { DifficultyLevel } from '../../config/difficulty.js'

// =============================================================================
// Shared agent types
// =============================================================================

export interface AgentIssue {
  code: string
  message: string
  suggestion?: string
}

export interface AgentTaskResult {
  taskIndex: number
  status: 'ok' | 'error' | 'warning'
  issues: AgentIssue[]
}

export interface AgentResult {
  agentName: string
  tasks: AgentTaskResult[]
  totalErrors: number
  totalWarnings: number
}

// =============================================================================
// Orchestrator types
// =============================================================================

export interface MultiAgentValidationResult {
  valid: boolean
  agents: AgentResult[]
  problemTasks: number[]
  allIssues: Array<{ taskIndex: number; agent: string; issue: AgentIssue }>
  fixedTasks: GeneratedTask[]
  fixResults: FixResult[]
}

// Same shape as in ai-provider.ts
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

// =============================================================================
// Helpers
// =============================================================================

interface TaskWithErrors {
  taskIndex: number
  issues: AgentIssue[]
}

function collectTasksWithErrors(
  ...agentResults: AgentResult[]
): TaskWithErrors[] {
  const errorMap = new Map<number, AgentIssue[]>()

  for (const agentResult of agentResults) {
    // Skip difficulty-checker — it only logs warnings, does not trigger fixer
    if (agentResult.agentName === 'difficulty-checker') continue

    for (const taskResult of agentResult.tasks) {
      if (taskResult.taskIndex < 0) continue

      // Only include errors for fixing (no more DIFFICULTY_MISMATCH warnings from unified-checker)
      if (taskResult.status !== 'error') continue

      for (const issue of taskResult.issues) {
        const existing = errorMap.get(taskResult.taskIndex) || []
        existing.push(issue)
        errorMap.set(taskResult.taskIndex, existing)
      }
    }
  }

  return Array.from(errorMap.entries())
    .map(([taskIndex, issues]) => ({ taskIndex, issues }))
    .sort((a, b) => a.taskIndex - b.taskIndex)
}

/** Model config for confirmation gate — always uses reasoning model.
 *  Delegates to getVerifierModelConfig with a non-lightweight key to get gemini-3-flash. */
function getConfirmationModelConfig(): VerifierModelConfig {
  return getVerifierModelConfig('_confirmation_gate')
}

// =============================================================================
// Orchestrator
// =============================================================================

export async function runMultiAgentValidation(
  tasks: GeneratedTask[],
  params: { subject: string; grade: number; topic: string; difficulty: DifficultyLevel },
  options: { autoFix: boolean } = { autoFix: true }
): Promise<MultiAgentValidationResult> {
  const start = Date.now()
  console.log(`[УчиОн] Multi-agent validation started for ${tasks.length} tasks`)

  // 1. Run answer-verifier + unified quality/content checker + difficulty checker in parallel
  const [answerResult, unifiedResult, difficultyResult] = await Promise.all([
    verifyAnswers(tasks, params.subject, params.grade),
    checkQualityAndContent(tasks, params.subject, params.grade, params.topic, params.difficulty),
    checkDifficulty(tasks, params.subject, params.grade, params.difficulty),
  ])

  const agents = [answerResult, unifiedResult, difficultyResult]

  // 2. Collect all issues
  const allIssues: Array<{ taskIndex: number; agent: string; issue: AgentIssue }> = []
  const errorTaskIndices = new Set<number>()

  for (const agentResult of agents) {
    for (const taskResult of agentResult.tasks) {
      if (taskResult.taskIndex < 0) continue // Skip agent-level warnings

      for (const issue of taskResult.issues) {
        allIssues.push({
          taskIndex: taskResult.taskIndex,
          agent: agentResult.agentName,
          issue,
        })
      }

      if (taskResult.status === 'error') {
        errorTaskIndices.add(taskResult.taskIndex)
      }
    }
  }

  const problemTasks = Array.from(errorTaskIndices).sort((a, b) => a - b)

  // 3. Auto-fix tasks with errors
  let fixedTasks = [...tasks]
  const fixResults: FixResult[] = []

  // Collect tasks with errors for fixing (difficulty warnings excluded)
  const tasksWithErrors = collectTasksWithErrors(answerResult, unifiedResult)

  const lightweight = usesLightweightVerification(params.subject)

  if (options.autoFix && tasksWithErrors.length > 0) {
    let confirmedErrors = tasksWithErrors

    // Confirmation gate for lightweight subjects:
    // Re-verify errors with gemini-3-flash to filter flash-lite false positives
    if (lightweight) {
      console.log(`[УчиОн] Confirmation gate for "${params.subject}": re-verifying ${tasksWithErrors.length} flagged tasks with reasoning model`)

      const errorTasksList = tasksWithErrors.map(({ taskIndex }) => tasks[taskIndex])
      const confirmationModel = getConfirmationModelConfig()
      const confirmation = await verifyAnswers(errorTasksList, params.subject, params.grade, confirmationModel)

      // If confirmation agent failed (no real task results), skip the gate and fix all flagged errors
      const hasRealResults = confirmation.tasks.some(t => t.taskIndex >= 0)
      if (!hasRealResults) {
        console.log(`[УчиОн] Confirmation gate returned no task results (agent may have failed), proceeding with all ${tasksWithErrors.length} flagged errors`)
      } else {
        confirmedErrors = []
        for (let i = 0; i < tasksWithErrors.length; i++) {
          const confirmResult = confirmation.tasks.find(t => t.taskIndex === i)
          if (confirmResult?.status === 'error') {
            confirmedErrors.push(tasksWithErrors[i])
          } else {
            console.log(`[УчиОн] Task ${tasksWithErrors[i].taskIndex} error not confirmed (false positive), skipping fix`)
          }
        }
      }

      console.log(`[УчиОн] Confirmation: ${confirmedErrors.length}/${tasksWithErrors.length} errors confirmed`)
    }

    if (confirmedErrors.length > 0) {
      const toFix = confirmedErrors.slice(0, MAX_FIXES_PER_GENERATION)

      if (confirmedErrors.length > MAX_FIXES_PER_GENERATION) {
        console.log(`[УчиОн] Fixing ${toFix.length} of ${confirmedErrors.length} tasks (limit: ${MAX_FIXES_PER_GENERATION})`)
      } else {
        console.log(`[УчиОн] Fixing ${toFix.length} tasks with errors...`)
      }

      // Fix sequentially to avoid overloading the API
      const fixedTasksForReVerify: { originalIndex: number; task: GeneratedTask; fixResultIndex: number }[] = []

      for (const { taskIndex, issues } of toFix) {
        const result = await fixTask(
          tasks[taskIndex],
          issues[0], // Use the first (most critical) issue
          params
        )

        fixResults.push(result)

        if (result.success && result.fixedTask) {
          fixedTasksForReVerify.push({
            originalIndex: taskIndex,
            task: result.fixedTask,
            fixResultIndex: fixResults.length - 1,
          })
        } else {
          console.log(`[УчиОн] Task ${taskIndex} fix failed: ${result.error}`)
        }
      }

      // Batch re-verification of fixed tasks
      // For lightweight subjects, use reasoning model (consistent with confirmation gate)
      if (fixedTasksForReVerify.length > 0) {
        console.log(`[task-fixer] Batch re-verifying ${fixedTasksForReVerify.length} fixed tasks...`)

        const tasksToVerify = fixedTasksForReVerify.map(f => f.task)
        const reVerifyModel = lightweight ? getConfirmationModelConfig() : undefined
        const reVerification = await verifyAnswers(tasksToVerify, params.subject, params.grade, reVerifyModel)

        let reVerifyPassed = 0
        let reVerifyReverted = 0

        for (let i = 0; i < fixedTasksForReVerify.length; i++) {
          const { originalIndex, task, fixResultIndex } = fixedTasksForReVerify[i]
          const taskReVerify = reVerification.tasks.find(t => t.taskIndex === i)
          const hasErrors = taskReVerify?.status === 'error'

          if (hasErrors) {
            fixResults[fixResultIndex].success = false
            fixResults[fixResultIndex].error = 're-verification failed, reverted to original'
            reVerifyReverted++
            console.log(`[task-fixer] Task ${originalIndex} re-verification FAILED, reverted`)
          } else {
            fixedTasks[originalIndex] = task
            reVerifyPassed++
            console.log(`[УчиОн] Task ${originalIndex} fixed: ${fixResults[fixResultIndex].fixDescription}`)
          }
        }

        console.log(`[task-fixer] Re-verification: ${reVerifyPassed}/${fixedTasksForReVerify.length} passed, ${reVerifyReverted} reverted`)
      }
    } else if (lightweight) {
      console.log(`[УчиОн] All ${tasksWithErrors.length} errors were false positives, no fixes needed`)
    }
  }

  const valid = problemTasks.length === 0
  const duration = Date.now() - start
  const fixedCount = fixResults.filter(r => r.success).length
  console.log(`[УчиОн] Multi-agent validation done in ${duration}ms: ${problemTasks.length} problem tasks, ${fixedCount} fixed, ${allIssues.length} total issues`)

  return { valid, agents, problemTasks, allIssues, fixedTasks, fixResults }
}

export { verifyAnswers } from './answer-verifier.js'
export { checkQualityAndContent } from './unified-checker.js'
export { checkDifficulty } from './difficulty-checker.js'
export { fixTask, type FixResult } from './task-fixer.js'

// Legacy re-exports for backward compatibility (if anything imports these directly)
export { checkQualityAndContent as checkContent } from './unified-checker.js'
export { checkQualityAndContent as checkQuality } from './unified-checker.js'
