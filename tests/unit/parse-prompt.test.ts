import { describe, it, expect } from 'vitest'
import { parsePromptLocal } from '../../api/_lib/generation/parse-prompt'

describe('parsePromptLocal', () => {
  it('should parse "Математика 3 класс, сложение двузначных чисел"', () => {
    const result = parsePromptLocal('Математика 3 класс, сложение двузначных чисел')
    expect(result).toEqual({ subject: 'math', grade: 3, topic: 'сложение двузначных чисел' })
  })

  it('should parse "Задания по физике, 8 класс, тема сила трения"', () => {
    const result = parsePromptLocal('Задания по физике, 8 класс, тема сила трения')
    expect(result).toEqual({ subject: 'physics', grade: 8, topic: 'сила трения' })
  })

  it('should parse "Алгебра 7 класс линейные уравнения"', () => {
    const result = parsePromptLocal('Алгебра 7 класс линейные уравнения')
    expect(result).toEqual({ subject: 'algebra', grade: 7, topic: 'линейные уравнения' })
  })

  it('should parse "русский язык 5 кл. части речи"', () => {
    const result = parsePromptLocal('русский язык 5 кл. части речи')
    expect(result).toEqual({ subject: 'russian', grade: 5, topic: 'части речи' })
  })

  it('should parse "история 9 класс, Великая Отечественная война"', () => {
    const result = parsePromptLocal('история 9 класс, Великая Отечественная война')
    expect(result).toEqual({ subject: 'history', grade: 9, topic: 'Великая Отечественная война' })
  })

  it('should parse "геометрия 8 класс теорема Пифагора"', () => {
    const result = parsePromptLocal('геометрия 8 класс теорема Пифагора')
    expect(result).toEqual({ subject: 'geometry', grade: 8, topic: 'теорема Пифагора' })
  })

  it('should parse "окружающий мир 2 класс, времена года"', () => {
    const result = parsePromptLocal('окружающий мир 2 класс, времена года')
    expect(result).toEqual({ subject: 'world_around', grade: 2, topic: 'времена года' })
  })

  it('should return null for unparseable input', () => {
    expect(parsePromptLocal('что-то непонятное')).toBeNull()
    expect(parsePromptLocal('')).toBeNull()
  })

  it('should return null if only subject without grade', () => {
    expect(parsePromptLocal('физика')).toBeNull()
  })

  it('should use subject name as topic when topic is missing', () => {
    const result = parsePromptLocal('химия 9 класс')
    expect(result).toEqual({ subject: 'chemistry', grade: 9, topic: 'Химия' })
  })
})
