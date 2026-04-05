import { describe, it, expect } from 'vitest'
import { KNOWN_SUBJECT_NAMES } from '../../api/_lib/generation/parse-prompt.js'
import { usesLightweightVerification, getVerifierModelConfig, getFixerModelConfig } from '../../api/_lib/ai-models.js'

describe('generic subject validation chain', () => {
  const genericSubjects = ['physics', 'chemistry', 'biology', 'geography', 'informatics']
  const humanitiesSubjects = ['russian', 'literature', 'history', 'social_studies', 'english']

  describe('display names available for all known generic subjects', () => {
    it.each(genericSubjects)('%s has a Russian display name', (subject) => {
      expect(KNOWN_SUBJECT_NAMES[subject]).toBeTruthy()
      // Name should be Cyrillic
      expect(KNOWN_SUBJECT_NAMES[subject]).toMatch(/[А-Яа-яЁё]/)
    })
  })

  describe('generic subjects use reasoning model (not flash-lite)', () => {
    it.each(genericSubjects)('%s uses gemini-3-flash for verification', (subject) => {
      const config = getVerifierModelConfig(subject)
      expect(config.model).toContain('gemini-3-flash')
    })

    it.each(genericSubjects)('%s uses gemini-3-flash for fixing', (subject) => {
      const config = getFixerModelConfig(subject)
      expect(config.model).toContain('gemini-3-flash')
    })

    it.each(genericSubjects)('%s does NOT skip fixer', (subject) => {
      expect(usesLightweightVerification(subject)).toBe(false)
    })
  })

  describe('humanities subjects use flash-lite with confirmation gate', () => {
    it.each(humanitiesSubjects)('%s uses flash-lite for initial verification', (subject) => {
      const config = getVerifierModelConfig(subject)
      expect(config.model).toContain('flash-lite')
    })

    it.each(humanitiesSubjects)('%s is lightweight (needs confirmation gate before fixer)', (subject) => {
      expect(usesLightweightVerification(subject)).toBe(true)
    })
  })

  describe('unknown subjects get safe defaults', () => {
    const unknowns = ['astronomy', 'ecology', 'economics', 'programming']

    it.each(unknowns)('%s uses reasoning model (safe default)', (subject) => {
      const config = getVerifierModelConfig(subject)
      expect(config.model).toContain('gemini-3-flash')
    })

    it.each(unknowns)('%s enables fixer (safe default)', (subject) => {
      expect(usesLightweightVerification(subject)).toBe(false)
    })
  })
})
