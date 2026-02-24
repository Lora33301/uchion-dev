// api/_lib/pdf/build-pdf.ts
import type { Worksheet, GeneratePayload } from '../../../shared/types'
import { acquirePage, releasePage } from '../browser-pool.js'
import { generateWorksheetHtml } from './html-generator.js'

type PdfTemplateId = 'standard' | 'rainbow' | 'academic'

export async function buildPdf(worksheet: Worksheet, meta: GeneratePayload, templateId: PdfTemplateId = 'standard', addWatermark = false): Promise<string> {
  console.log('[PDF] Starting buildPdf...')

  const page = await acquirePage()

  try {
    const html = generateWorksheetHtml(worksheet, templateId, addWatermark)
    console.log('[PDF] HTML generated, template:', templateId, 'watermark:', addWatermark, 'length:', html.length)

    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    })

    const pdfMargins = (templateId === 'rainbow' || templateId === 'academic')
      ? { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
      : { top: '12mm', right: '14mm', bottom: '12mm', left: '14mm' }

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: pdfMargins,
    })
    console.log('[PDF] PDF generated, buffer size:', pdfBuffer.length)

    const base64 = Buffer.from(pdfBuffer).toString('base64')
    console.log('[PDF] Base64 encoded, length:', base64.length)

    return base64
  } catch (error) {
    console.error('[PDF] Error generating PDF:', error)
    throw error
  } finally {
    await releasePage(page)
  }
}
