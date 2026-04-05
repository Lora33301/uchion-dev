/**
 * Model selection for generation and agents.
 * Separated to avoid circular dependencies between ai-provider and agent modules.
 */

export function getGenerationModel(isPaid: boolean): string {
  if (isPaid) {
    return process.env.AI_MODEL_PAID || 'openai/gpt-4.1'
  }
  return process.env.AI_MODEL_FREE || 'openai/gpt-4.1'
}

export function getAgentsModel(): string {
  return process.env.AI_MODEL_AGENTS || 'openai/gpt-4.1-mini'
}

/**
 * Model for presentation generation.
 * Claude excels at structured content and creative writing.
 */
export function getPresentationModel(): string {
  return process.env.AI_MODEL_PRESENTATION || 'anthropic/claude-sonnet-4.5'
}

/** Subjects that require mathematical reasoning */
const STEM_SUBJECTS = new Set(['math', 'algebra', 'geometry'])

export function isStemSubject(subject: string): boolean {
  return STEM_SUBJECTS.has(subject)
}

/**
 * Subjects well-served by lightweight flash-lite verification (factual/recall-based).
 * For these: verifier = flash-lite (no reasoning), but fixer still runs via confirmation gate —
 * errors are re-verified by gemini-3-flash before fixing to filter out flash-lite false positives.
 * All other subjects (STEM, natural science, unknown) use gemini-3-flash with reasoning directly.
 */
const LIGHTWEIGHT_VERIFICATION_SUBJECTS = new Set([
  'russian', 'literature', 'history', 'social_studies',
  'english', 'music', 'obzh',
])

/**
 * Whether a subject uses lightweight (flash-lite) verification.
 * Returns true for humanities/language — these need a confirmation gate
 * (re-verify errors with gemini-3-flash) before the fixer runs.
 * Returns false for STEM, natural science, and unknown subjects — they get
 * gemini-3-flash directly, no confirmation needed.
 *
 * Design: unknown subjects default to stronger verification (safer).
 */
export function usesLightweightVerification(subject: string): boolean {
  return LIGHTWEIGHT_VERIFICATION_SUBJECTS.has(subject)
}

export interface VerifierModelConfig {
  model: string
  reasoning: { effort: 'low' | 'minimal' } | { enabled: false }
}

/**
 * Model config for answer-verifier agent.
 * - Humanities/language subjects: Gemini 2.5 Flash Lite with reasoning disabled
 * - STEM, natural science, and unknown subjects: Gemini 3 Flash with reasoning effort=low
 * All grades (1-11) use the same Gemini models for consistent verification quality.
 */
export function getVerifierModelConfig(subject: string, grade?: number): VerifierModelConfig {
  if (usesLightweightVerification(subject)) {
    const model = process.env.AI_MODEL_VERIFIER_HUMANITIES || 'google/gemini-2.5-flash-lite'
    return { model, reasoning: { enabled: false } }
  }
  // STEM, natural science, and unknown subjects → stronger model with reasoning
  const model = process.env.AI_MODEL_VERIFIER_STEM || 'google/gemini-3-flash-preview'
  return { model, reasoning: { effort: 'low' } }
}

/**
 * Model config for task-fixer agent (cheaper than verifier).
 * - Humanities/language: flash-lite, no reasoning
 * - STEM, natural science, and unknown: same model as verifier but reasoning effort=minimal
 */
export function getFixerModelConfig(subject: string, grade?: number): VerifierModelConfig {
  if (usesLightweightVerification(subject)) {
    const model = process.env.AI_MODEL_VERIFIER_HUMANITIES || 'google/gemini-2.5-flash-lite'
    return { model, reasoning: { enabled: false } }
  }
  const model = process.env.AI_MODEL_VERIFIER_STEM || 'google/gemini-3-flash-preview'
  return { model, reasoning: { effort: 'minimal' } }
}
