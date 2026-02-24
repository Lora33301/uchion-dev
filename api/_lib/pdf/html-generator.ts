// api/_lib/pdf/html-generator.ts
import type { Worksheet } from '../../../shared/types'
import { generateStandardHtml } from './templates/standard.js'
import { generateRainbowHtml } from './templates/rainbow.js'
import { generateAcademicHtml } from './templates/academic.js'

type PdfTemplateId = 'standard' | 'rainbow' | 'academic'

// Dispatch to the correct template
export function generateWorksheetHtml(worksheet: Worksheet, templateId: PdfTemplateId = 'standard', addWatermark = false): string {
  if (templateId === 'rainbow') return generateRainbowHtml(worksheet, addWatermark)
  if (templateId === 'academic') return generateAcademicHtml(worksheet, addWatermark)
  return generateStandardHtml(worksheet, addWatermark)
}
