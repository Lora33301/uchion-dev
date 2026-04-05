import { describe, it, expect } from 'vitest'
import { KnownSubjectSchema, SubjectSchema, GenerateSchema } from '../../shared/worksheet'

describe('Shared Schemas', () => {
  describe('KnownSubjectSchema', () => {
    it('should accept known subjects', () => {
      expect(() => KnownSubjectSchema.parse('math')).not.toThrow()
      expect(() => KnownSubjectSchema.parse('russian')).not.toThrow()
    })

    it('should reject unknown subjects', () => {
      expect(() => KnownSubjectSchema.parse('english')).toThrow()
      expect(() => KnownSubjectSchema.parse('')).toThrow()
    })
  })

  describe('SubjectSchema', () => {
    it('should accept any non-empty string', () => {
      expect(() => SubjectSchema.parse('math')).not.toThrow()
      expect(() => SubjectSchema.parse('english')).not.toThrow()
      expect(() => SubjectSchema.parse('physics')).not.toThrow()
    })

    it('should reject empty string', () => {
      expect(() => SubjectSchema.parse('')).toThrow()
    })
  })

  describe('GenerateSchema', () => {
    it('should accept prompt-based input', () => {
      const payload = { prompt: 'Физика 8 класс, сила трения' }
      expect(() => GenerateSchema.parse(payload)).not.toThrow()
    })

    it('should accept structured input', () => {
      const payload = { subject: 'math', grade: 3, topic: 'Сложение' }
      expect(() => GenerateSchema.parse(payload)).not.toThrow()
    })

    it('should accept any subject string in structured input', () => {
      const payload = { subject: 'english', grade: 2, topic: 'Present Simple' }
      expect(() => GenerateSchema.parse(payload)).not.toThrow()
    })

    it('should reject empty input (no prompt and no structured fields)', () => {
      expect(() => GenerateSchema.parse({})).toThrow()
      expect(() => GenerateSchema.parse({ difficulty: 'easy' })).toThrow()
    })

    it('should reject incomplete structured input', () => {
      expect(() => GenerateSchema.parse({ subject: 'math', grade: 2 })).toThrow()
    })

    it('should accept valid grades (1-11)', () => {
      expect(() => GenerateSchema.parse({ subject: 'math', grade: 1, topic: 'Счёт' })).not.toThrow()
      expect(() => GenerateSchema.parse({ subject: 'algebra', grade: 11, topic: 'Логарифмы' })).not.toThrow()
    })

    it('should reject invalid grades', () => {
      expect(() => GenerateSchema.parse({ subject: 'math', grade: 0, topic: 'Тема' })).toThrow()
      expect(() => GenerateSchema.parse({ subject: 'math', grade: 12, topic: 'Тема' })).toThrow()
    })
  })
})
