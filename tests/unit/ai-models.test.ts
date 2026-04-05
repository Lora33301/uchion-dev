import { describe, it, expect } from 'vitest'
import {
  isStemSubject,
  usesLightweightVerification,
  getVerifierModelConfig,
  getFixerModelConfig,
} from '../../api/_lib/ai-models.js'

describe('subject classification', () => {
  describe('isStemSubject', () => {
    it('returns true for math, algebra, geometry', () => {
      expect(isStemSubject('math')).toBe(true)
      expect(isStemSubject('algebra')).toBe(true)
      expect(isStemSubject('geometry')).toBe(true)
    })

    it('returns false for non-STEM', () => {
      expect(isStemSubject('russian')).toBe(false)
      expect(isStemSubject('physics')).toBe(false)
      expect(isStemSubject('unknown_subject')).toBe(false)
    })
  })

  describe('usesLightweightVerification', () => {
    it('returns true for humanities/language subjects', () => {
      expect(usesLightweightVerification('russian')).toBe(true)
      expect(usesLightweightVerification('literature')).toBe(true)
      expect(usesLightweightVerification('history')).toBe(true)
      expect(usesLightweightVerification('social_studies')).toBe(true)
      expect(usesLightweightVerification('english')).toBe(true)
      expect(usesLightweightVerification('music')).toBe(true)
      expect(usesLightweightVerification('obzh')).toBe(true)
    })

    it('returns false for STEM subjects', () => {
      expect(usesLightweightVerification('math')).toBe(false)
      expect(usesLightweightVerification('algebra')).toBe(false)
      expect(usesLightweightVerification('geometry')).toBe(false)
    })

    it('returns false for natural science subjects (need reasoning)', () => {
      expect(usesLightweightVerification('physics')).toBe(false)
      expect(usesLightweightVerification('chemistry')).toBe(false)
      expect(usesLightweightVerification('biology')).toBe(false)
      expect(usesLightweightVerification('informatics')).toBe(false)
    })

    it('returns false for unknown subjects (safer default = stronger model)', () => {
      expect(usesLightweightVerification('astronomy')).toBe(false)
      expect(usesLightweightVerification('ecology')).toBe(false)
      expect(usesLightweightVerification('completely_unknown')).toBe(false)
    })
  })
})

describe('model selection', () => {
  describe('getVerifierModelConfig', () => {
    it('returns gemini-3-flash with reasoning for STEM', () => {
      const config = getVerifierModelConfig('math')
      expect(config.model).toContain('gemini-3-flash')
      expect(config.reasoning).toEqual({ effort: 'low' })
    })

    it('returns flash-lite without reasoning for humanities', () => {
      const config = getVerifierModelConfig('russian')
      expect(config.model).toContain('flash-lite')
      expect(config.reasoning).toEqual({ enabled: false })
    })

    it('returns gemini-3-flash for physics (natural science)', () => {
      const config = getVerifierModelConfig('physics')
      expect(config.model).toContain('gemini-3-flash')
      expect(config.reasoning).toEqual({ effort: 'low' })
    })

    it('returns gemini-3-flash for unknown subjects (safe default)', () => {
      const config = getVerifierModelConfig('astronomy')
      expect(config.model).toContain('gemini-3-flash')
      expect(config.reasoning).toEqual({ effort: 'low' })
    })

    it('returns flash-lite for history (humanities)', () => {
      const config = getVerifierModelConfig('history')
      expect(config.model).toContain('flash-lite')
      expect(config.reasoning).toEqual({ enabled: false })
    })
  })

  describe('getFixerModelConfig', () => {
    it('returns gemini-3-flash with reasoning:minimal for STEM', () => {
      const config = getFixerModelConfig('math')
      expect(config.model).toContain('gemini-3-flash')
      expect(config.reasoning).toEqual({ effort: 'minimal' })
    })

    it('returns flash-lite for humanities', () => {
      const config = getFixerModelConfig('russian')
      expect(config.model).toContain('flash-lite')
      expect(config.reasoning).toEqual({ enabled: false })
    })

    it('returns gemini-3-flash for chemistry (natural science)', () => {
      const config = getFixerModelConfig('chemistry')
      expect(config.model).toContain('gemini-3-flash')
      expect(config.reasoning).toEqual({ effort: 'minimal' })
    })

    it('returns gemini-3-flash for unknown subjects', () => {
      const config = getFixerModelConfig('unknown_subject')
      expect(config.model).toContain('gemini-3-flash')
      expect(config.reasoning).toEqual({ effort: 'minimal' })
    })
  })
})
