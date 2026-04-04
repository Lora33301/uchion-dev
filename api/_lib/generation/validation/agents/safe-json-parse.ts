/**
 * Safe JSON parsing for LLM responses.
 * Gemini sometimes produces invalid escape sequences like \^, \(, \) in JSON strings.
 * This sanitizer fixes them before parsing.
 */

/**
 * Remove invalid JSON escape sequences by walking the string sequentially.
 * Valid JSON escapes: \" \\ \/ \b \f \n \r \t \uXXXX
 *
 * Unlike a simple regex, this correctly handles already-escaped backslashes:
 *   \\sqrt  →  \\sqrt  (preserved: literal backslash + sqrt)
 *   \sqrt   →  sqrt    (fixed: removed invalid \s)
 */
function sanitizeJsonString(raw: string): string {
  const result: string[] = []
  let i = 0

  while (i < raw.length) {
    if (raw[i] === '\\') {
      const next = raw[i + 1]
      if (next === undefined) {
        // Trailing backslash — drop it
        i++
      } else if ('"\\bfnrt/'.includes(next)) {
        // Valid 2-char escape sequence — keep both
        result.push('\\', next)
        i += 2
      } else if (next === 'u') {
        // \uXXXX — need exactly 4 hex digits
        const hex = raw.slice(i + 2, i + 6)
        if (/^[0-9a-fA-F]{4}$/.test(hex)) {
          result.push(raw.slice(i, i + 6))
          i += 6
        } else {
          // Invalid \u without proper hex — drop the backslash
          i++
        }
      } else {
        // Invalid escape (\s, \^, \(, etc.) — drop the backslash, keep the char
        i++
      }
    } else {
      result.push(raw[i])
      i++
    }
  }

  return result.join('')
}

/**
 * Attempt to repair JSON truncated by max_tokens cutoff.
 * Finds the last position where a complete object ends, then closes
 * any remaining open brackets/braces to produce valid JSON.
 *
 * Example: {"tasks":[{"index":0,"status":"ok"},{"index":1,"st
 *       → {"tasks":[{"index":0,"status":"ok"}]}
 */
function tryRepairTruncatedJson(raw: string): string | null {
  // Find all '}' positions from end — each is a candidate cut point
  const closeBracePositions: number[] = []
  for (let i = raw.length - 1; i >= 0; i--) {
    if (raw[i] === '}') closeBracePositions.push(i)
  }

  for (const pos of closeBracePositions) {
    const candidate = raw.slice(0, pos + 1)

    // Track open brackets to determine what closing chars are needed
    const stack: string[] = []
    let inString = false
    let escaped = false

    for (const ch of candidate) {
      if (escaped) { escaped = false; continue }
      if (ch === '\\' && inString) { escaped = true; continue }
      if (ch === '"') { inString = !inString; continue }
      if (inString) continue
      if (ch === '{') stack.push('}')
      else if (ch === '[') stack.push(']')
      else if ((ch === '}' || ch === ']') && stack.length > 0 && stack[stack.length - 1] === ch) {
        stack.pop()
      }
    }

    // Close remaining open brackets in reverse order (innermost first)
    const closing = stack.reverse().join('')
    const repaired = candidate + closing

    try {
      JSON.parse(repaired) // validate
      return repaired
    } catch {
      continue
    }
  }

  return null
}

/**
 * Parse JSON from an LLM response with sanitization and truncation repair.
 * 1. Try raw JSON.parse
 * 2. If it fails — sanitize invalid escapes and retry
 * 3. If still fails — try repairing truncated JSON (max_tokens cutoff)
 * 4. If all fail — return null (don't crash the pipeline)
 */
export function safeJsonParse<T>(raw: string, agentName: string): T | null {
  // Attempt 1: parse as-is
  try {
    return JSON.parse(raw) as T
  } catch {
    // expected for Gemini responses with bad escapes — fall through
  }

  // Attempt 2: sanitize invalid escape sequences and retry
  const sanitized = sanitizeJsonString(raw)
  try {
    const result = JSON.parse(sanitized) as T
    console.warn(`[${agentName}] Sanitized invalid escape sequences in JSON`)
    return result
  } catch {
    // fall through to truncation repair
  }

  // Attempt 3: repair truncated JSON (e.g. from max_tokens cutoff)
  const repaired = tryRepairTruncatedJson(sanitized)
  if (repaired) {
    try {
      const result = JSON.parse(repaired) as T
      console.warn(`[${agentName}] Repaired truncated JSON (${raw.length} → ${repaired.length} chars)`)
      return result
    } catch {
      // fall through
    }
  }

  console.error(
    `[${agentName}] JSON parse failed after sanitization and truncation repair. Raw (first 500 chars):`,
    raw.slice(0, 500),
  )
  return null
}
