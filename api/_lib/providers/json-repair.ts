import type { GeneratedTask, GeneratedWorksheetJson } from '../ai-provider.js'

/**
 * Parse AI response text into GeneratedWorksheetJson.
 * Handles truncated JSON via 3 progressive repair strategies:
 *   1. Cut at last complete task object boundary
 *   2. Close unclosed brackets/braces
 *   3. Extract individual task objects via regex
 */
export function parseGeneratedJson(content: string): GeneratedWorksheetJson {
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error('[УчиОн] No JSON found in response')
    throw new Error('AI_ERROR')
  }
  const jsonStr = jsonMatch[0]

  // Happy path: valid JSON
  try {
    return JSON.parse(jsonStr)
  } catch {
    // fall through to repair
  }

  console.warn('[УчиОн] JSON parse failed, attempting to fix truncated JSON...')
  return repairTruncatedJson(jsonStr)
}

/**
 * Attempt to repair truncated JSON using 3 progressive strategies.
 */
function repairTruncatedJson(jsonStr: string): GeneratedWorksheetJson {
  // Strategy 1: Cut at last complete task object boundary
  const lastCompleteObj = jsonStr.lastIndexOf('},')
  const lastCompleteArr = jsonStr.lastIndexOf('}]')
  const lastComplete = Math.max(lastCompleteObj, lastCompleteArr)
  if (lastComplete > 0) {
    const cut = jsonStr.substring(0, lastComplete + 1) + ']}'
    try {
      const result = JSON.parse(cut)
      console.log('[УчиОн] Fixed by cutting at last complete task (char', lastComplete, ')')
      return result
    } catch { /* try next strategy */ }
  }

  // Strategy 2: Close unclosed brackets/braces
  let fixed = jsonStr.replace(/,\s*$/, '')
  const openBrackets = (fixed.match(/\[/g) || []).length
  const closeBrackets = (fixed.match(/\]/g) || []).length
  const openBraces = (fixed.match(/\{/g) || []).length
  const closeBraces = (fixed.match(/\}/g) || []).length

  for (let i = 0; i < openBrackets - closeBrackets; i++) fixed += ']'
  for (let i = 0; i < openBraces - closeBraces; i++) fixed += '}'

  try {
    const result = JSON.parse(fixed)
    console.log('[УчиОн] Fixed by closing brackets')
    return result
  } catch { /* try next strategy */ }

  // Strategy 3: Extract individual task objects via regex
  console.warn('[УчиОн] Bracket fix failed, extracting tasks via regex...')
  const taskRegex = /\{[^{}]*"type"\s*:\s*"[^"]+?"[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g
  const taskMatches = jsonStr.match(taskRegex) || []
  if (taskMatches.length > 0) {
    const tasks: GeneratedTask[] = []
    for (const m of taskMatches) {
      try { tasks.push(JSON.parse(m)) } catch { /* skip broken */ }
    }
    if (tasks.length > 0) {
      console.log(`[УчиОн] Extracted ${tasks.length} tasks via regex`)
      return { tasks }
    }
  }

  throw new Error('Could not parse or fix JSON')
}
