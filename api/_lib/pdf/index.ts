// api/_lib/pdf/index.ts
export type PdfTemplateId = 'standard' | 'rainbow' | 'academic'

export { buildPdf } from './build-pdf.js'
export { generateWorksheetHtml } from './html-generator.js'
