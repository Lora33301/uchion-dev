// api/_lib/pdf/shared.ts
import { processText } from './text-processing.js'

// Helper to determine if answer field should be shown
export function shouldShowAnswerField(text: string): boolean {
  // Don't show answer field for matching tasks
  if (text.startsWith('<!--MATCHING:')) return false
  const lower = text.toLowerCase()
  const hiddenKeywords = ['подчеркни', 'обведи', 'зачеркни', 'раскрась', 'соедини']
  return !hiddenKeywords.some(k => lower.includes(k))
}

// Parse matching task data from text
export interface MatchingData {
  type: 'matching'
  instruction: string
  leftColumn: string[]
  rightColumn: string[]
}

export function parseMatchingData(text: string): MatchingData | null {
  const match = text.match(/<!--MATCHING:(.*?)-->/)
  if (!match) return null
  try {
    return JSON.parse(match[1]) as MatchingData
  } catch {
    return null
  }
}

// Render matching task as HTML (standard template)
export function renderMatchingHtml(data: MatchingData): string {
  const leftItems = data.leftColumn.map((item, i) =>
    `<div class="matching-item matching-left"><span class="matching-number">${i + 1}.</span> ${processText(item)}</div>`
  ).join('')

  const rightItems = data.rightColumn.map((item, i) =>
    `<div class="matching-item matching-right"><span class="matching-letter">${String.fromCharCode(1072 + i)})</span> ${processText(item)}</div>`
  ).join('')

  return `
    <div class="matching-instruction">${processText(data.instruction)}</div>
    <div class="matching-columns">
      <div class="matching-column">${leftItems}</div>
      <div class="matching-column">${rightItems}</div>
    </div>
  `
}

// Watermark CSS + HTML for free-plan PDFs
export const WATERMARK_CSS = `
.wm { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  display: flex; align-items: center; justify-content: center;
  pointer-events: none; z-index: 9999; }
.wm-text { font-size: 80pt; font-weight: 900; color: rgba(0,0,0,0.07);
  transform: rotate(-35deg); font-family: 'Inter', sans-serif; }
`
export const WATERMARK_HTML = '<div class="wm"><span class="wm-text">УчиОН</span></div>'
