import { mathPresentationConfig } from './math.js'
import { algebraPresentationConfig } from './algebra.js'
import { geometryPresentationConfig } from './geometry.js'
import { russianPresentationConfig } from './russian.js'

export { mathPresentationConfig } from './math.js'
export { algebraPresentationConfig } from './algebra.js'
export { geometryPresentationConfig } from './geometry.js'
export { russianPresentationConfig } from './russian.js'

export interface PresentationSubjectConfig {
  id: string
  name: string
  gradeRange: { from: number; to: number }
  systemPrompt: string
}

const configs: Record<string, PresentationSubjectConfig> = {
  math: mathPresentationConfig,
  algebra: algebraPresentationConfig,
  geometry: geometryPresentationConfig,
  russian: russianPresentationConfig,
}

export function getPresentationSubjectConfig(subject: string): PresentationSubjectConfig {
  const config = configs[subject]
  if (config) return config

  // Generic fallback for subjects without a dedicated config
  return {
    id: subject,
    name: subject,
    gradeRange: { from: 1, to: 11 },
    systemPrompt: `Ты опытный школьный учитель. Создавай информативные и структурированные презентации для школьников, адаптированные под их возраст и уровень подготовки.`,
  }
}
