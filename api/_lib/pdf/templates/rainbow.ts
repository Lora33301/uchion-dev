// api/_lib/pdf/templates/rainbow.ts
import type { Worksheet } from '../../../../shared/types'
import { loadFontAsBase64 } from '../fonts.js'
import { escapeHtml, processText } from '../text-processing.js'
import { shouldShowAnswerField, parseMatchingData, WATERMARK_CSS, WATERMARK_HTML, type MatchingData } from '../shared.js'

// Render matching task for Rainbow template
export function renderRainbowMatchingHtml(data: MatchingData): string {
  const leftItems = data.leftColumn.map((item, i) =>
    `<div class="rb-matching-item"><span class="rb-matching-number">${i + 1}.</span> ${processText(item)}</div>`
  ).join('')

  const rightItems = data.rightColumn.map((item, i) =>
    `<div class="rb-matching-item"><span class="rb-matching-letter">${String.fromCharCode(1072 + i)})</span> ${processText(item)}</div>`
  ).join('')

  return `
    <div class="rb-matching-instruction">${processText(data.instruction)}</div>
    <div class="rb-matching-columns">
      <div class="rb-matching-column">${leftItems}</div>
      <div class="rb-matching-column">${rightItems}</div>
    </div>
  `
}

// Rainbow (Радуга) template — colorful, child-friendly style
export function generateRainbowHtml(worksheet: Worksheet, addWatermark = false): string {
  const fonts = loadFontAsBase64()

  const fontFaceCSS = fonts ? `
    @font-face {
      font-family: 'Inter';
      src: url(data:font/truetype;base64,${fonts.regular}) format('truetype');
      font-weight: 400;
      font-style: normal;
    }
    @font-face {
      font-family: 'Inter';
      src: url(data:font/truetype;base64,${fonts.bold}) format('truetype');
      font-weight: 700;
      font-style: normal;
    }
  ` : ''

  const taskColors = ['#22c55e', '#f97316', '#3b82f6', '#a855f7', '#ec4899', '#eab308']
  const optionColors = ['#22c55e', '#f97316', '#3b82f6', '#a855f7', '#ec4899']
  const optionLetters = ['А', 'Б', 'В', 'Г', 'Д']
  const dotColors = ['#fda4af', '#fcd34d', '#93c5fd', '#86efac', '#c4b5fd', '#fdba74', '#f9a8d4', '#67e8f9', '#a7f3d0', '#fde047', '#d8b4fe', '#6ee7b7', '#fca5a5', '#bfdbfe', '#fcd34d', '#a5f3fc', '#fdba74', '#d9f99d', '#93c5fd', '#c4b5fd']

  const assignmentsHtml = worksheet.assignments.map((task, i) => {
    const color = taskColors[i % taskColors.length]
    const matchingData = parseMatchingData(task.text)

    if (matchingData) {
      return `
        <div class="task-block">
          <div class="task-header">
            <div class="task-circle" style="background:${color};color:white">${i + 1}</div>
            <div class="task-text">${renderRainbowMatchingHtml(matchingData)}</div>
          </div>
        </div>
      `
    }

    return `
      <div class="task-block">
        <div class="task-header">
          <div class="task-circle" style="background:${color};color:white">${i + 1}</div>
          <div class="task-text">${processText(task.text)}</div>
        </div>
        ${shouldShowAnswerField(task.text) ? '<div class="rb-answer-field"></div>' : ''}
      </div>
    `
  }).join('')

  const testHtml = worksheet.test.map((q, i) => {
    const color = taskColors[i % taskColors.length]
    const isMultiple = q.options.length > 0 && (q.question.toLowerCase().includes('несколько') || q.question.toLowerCase().includes('множественный'))
    return `
    <div class="test-question">
      <div class="question-header">
        <div class="task-circle" style="background:${color};color:white">${i + 1}</div>
        <div class="question-text">${processText(q.question)}</div>
      </div>
      <div class="options">
        ${q.options.map((opt, idx) => `
          <div class="option">
            <div class="option-marker ${isMultiple ? 'option-checkbox' : 'option-radio'}" style="border-color:${optionColors[idx % optionColors.length]}">
              ${isMultiple ? '' : ''}
            </div>
            <span class="option-letter" style="color:${optionColors[idx % optionColors.length]}">${optionLetters[idx] || String.fromCharCode(1040 + idx)}</span>
            <span class="option-text">${processText(opt)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `}).join('')

  const assignmentAnswersHtml = worksheet.answers.assignments.map((ans, i) => `
    <li class="answer-item">
      <span class="answer-number" style="color:${taskColors[i % taskColors.length]}">${i + 1}.</span>
      ${processText(ans)}
    </li>
  `).join('')

  const testAnswersHtml = worksheet.answers.test.map((ans, i) => `
    <li class="answer-item">
      <span class="answer-number" style="color:${taskColors[i % taskColors.length]}">${i + 1}.</span>
      ${processText(ans)}
    </li>
  `).join('')

  const dotsHtml = dotColors.map(c => `<span class="dot" style="background:${c}"></span>`).join('')
  const notesLinesHtml = Array.from({ length: 10 }).map(() => '<div class="note-line"></div>').join('')

  const hasAssignments = worksheet.assignments.length > 0
  const hasTest = worksheet.test.length > 0

  const headerHtml = `
    <div class="rb-header">
      <div class="rb-header-left">
        <div class="circle-yellow"></div>
        <div class="circle-white"></div>
        <span class="rb-logo">УчиОн</span>
      </div>
      <div class="rb-header-right">
        <div class="meta-field"><span>Имя:</span><div class="meta-line"></div></div>
        <div class="meta-field"><span>Дата:</span><div class="meta-line"></div><div class="circle-small-gray"></div></div>
      </div>
      <div class="circle-blue"></div>
    </div>
  `

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(worksheet.topic)}</title>
  <style>
    ${fontFaceCSS}

    @page { size: A4; margin: 0; }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11pt;
      line-height: 1.45;
      color: #1f2937;
      background: white;
    }

    .page {
      position: relative;
      padding: 0 28px 20px 28px;
      page-break-after: always;
      min-height: 100vh;
    }
    .page:last-child { page-break-after: auto; }

    /* ===== Header ===== */
    .rb-header {
      background: #f9a8d4;
      padding: 14px 28px;
      display: flex;
      align-items: center;
      position: relative;
      margin: 0 -28px 20px -28px;
      min-height: 64px;
    }
    .rb-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .circle-yellow {
      width: 40px; height: 40px; border-radius: 50%;
      background: #fde047;
    }
    .circle-white {
      width: 20px; height: 20px; border-radius: 50%;
      background: #fbcfe8;
    }
    .rb-logo {
      font-size: 22px; font-weight: 700; color: #1f2937;
      margin-left: 4px;
    }
    .rb-header-right {
      margin-left: auto;
      margin-right: 60px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .meta-field {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 10px;
      color: #6b7280;
    }
    .meta-line {
      min-width: 120px;
      border-bottom: 1px solid #9ca3af;
    }
    .circle-small-gray {
      width: 12px; height: 12px; border-radius: 50%;
      background: #d1d5db;
    }
    .circle-blue {
      position: absolute;
      right: 16px;
      top: 6px;
      width: 52px; height: 52px; border-radius: 50%;
      background: #38bdf8;
    }

    /* ===== Topic banner ===== */
    .topic-banner {
      text-align: center;
      margin: 0 auto 18px;
      max-width: 80%;
    }
    .topic-banner h1 {
      display: inline-block;
      background: #fde047;
      color: #1f2937;
      font-size: 17px;
      font-weight: 700;
      padding: 8px 28px;
      border-radius: 24px;
    }

    /* ===== Section ribbon ===== */
    .section-ribbon {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #4ade80;
      color: white;
      font-weight: 700;
      font-size: 15px;
      padding: 6px 20px 6px 14px;
      border-radius: 4px 20px 20px 4px;
      margin-bottom: 14px;
      position: relative;
    }
    .section-ribbon::before {
      content: '';
      position: absolute;
      left: -6px; top: 2px;
      width: 12px; height: calc(100% - 4px);
      background: #a855f7;
      border-radius: 3px;
      transform: rotate(-3deg);
    }
    .section-ribbon-icon {
      font-size: 14px;
    }

    /* ===== Task blocks ===== */
    .task-block {
      margin-bottom: 16px;
      break-inside: avoid;
    }
    .task-header {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 4px;
    }
    .task-circle {
      width: 28px; height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .task-text {
      font-size: 12px;
      font-weight: 500;
      line-height: 1.5;
      padding-top: 4px;
      flex: 1;
    }
    .rb-answer-field {
      margin-left: 38px;
      margin-top: 6px;
      height: 56px;
      border: 1.5px dashed #d1d5db;
      border-radius: 8px;
      background: rgba(249, 250, 251, 0.3);
    }

    /* ===== Matching (rainbow) ===== */
    .rb-matching-instruction {
      font-size: 12px;
      color: #374151;
      margin-bottom: 8px;
    }
    .rb-matching-columns {
      display: flex;
      gap: 16px;
    }
    .rb-matching-column { flex: 1; }
    .rb-matching-item {
      padding: 6px 12px;
      margin-bottom: 6px;
      background: white;
      border: 1.5px solid #e5e7eb;
      border-radius: 20px;
      font-size: 11px;
      color: #374151;
    }
    .rb-matching-number, .rb-matching-letter {
      font-weight: 700;
      color: #6366f1;
      margin-right: 6px;
    }

    /* ===== Test questions ===== */
    .test-question {
      border: 1.5px solid #e5e7eb;
      border-radius: 12px;
      padding: 12px 16px;
      margin-bottom: 12px;
      background: white;
      break-inside: avoid;
    }
    .question-header {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 8px;
    }
    .question-text {
      font-size: 12px;
      font-weight: 600;
      color: #1f2937;
      padding-top: 4px;
    }
    .options {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-left: 38px;
    }
    .option {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .option-radio {
      width: 18px; height: 18px;
      border: 2px solid;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .option-checkbox {
      width: 18px; height: 18px;
      border: 2px solid;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .option-letter {
      font-weight: 700;
      font-size: 12px;
      min-width: 14px;
    }
    .option-text {
      font-size: 11px;
      color: #374151;
    }

    /* ===== Dots decoration ===== */
    .dots-row {
      display: flex;
      justify-content: center;
      gap: 10px;
      padding: 16px 0 4px;
      flex-wrap: wrap;
    }
    .dot {
      width: 14px; height: 14px;
      border-radius: 50%;
      display: inline-block;
    }

    /* ===== Notes ===== */
    .notes-section {
      background: #f9fafb;
      border-radius: 10px;
      padding: 20px;
      margin-top: 12px;
    }
    .note-line {
      border-bottom: 1px solid #d1d5db;
      height: 28px;
    }

    /* ===== Answers ===== */
    .answers-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 8px;
    }
    .answers-grid.single-column {
      grid-template-columns: 1fr;
    }
    .answers-column h3 {
      font-size: 14px;
      font-weight: 700;
      color: #4f46e5;
      margin-bottom: 12px;
    }
    .answers-list {
      list-style: none;
    }
    .answer-item {
      background: #f9fafb;
      border: 1px solid #f3f4f6;
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 8px;
      font-size: 11px;
      color: #374151;
      break-inside: avoid;
    }
    .answer-number {
      font-weight: 700;
      margin-right: 4px;
    }

    ${addWatermark ? WATERMARK_CSS : ''}

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  ${addWatermark ? WATERMARK_HTML : ''}
  ${hasAssignments ? `
  <div class="page">
    ${headerHtml}
    <div class="topic-banner"><h1>${escapeHtml(worksheet.topic)}</h1></div>
    <div class="section-ribbon"><span class="section-ribbon-icon">&#9999;&#65039;</span> Задания</div>
    <div class="assignments">${assignmentsHtml}</div>
    <div class="dots-row">${dotsHtml}</div>
  </div>
  ` : ''}

  ${hasTest ? `
  <div class="page">
    ${headerHtml}
    ${!hasAssignments ? `<div class="topic-banner"><h1>${escapeHtml(worksheet.topic)}</h1></div>` : ''}
    <div class="section-ribbon"><span class="section-ribbon-icon">&#128203;</span> Мини-тест</div>
    <div class="test-questions">${testHtml}</div>
    <div class="dots-row">${dotsHtml}</div>
  </div>
  ` : ''}

  <div class="page">
    <div class="section-ribbon"><span class="section-ribbon-icon">&#128203;</span> Заметки</div>
    <div class="notes-section">${notesLinesHtml}</div>
    <div class="dots-row">${dotsHtml}</div>
  </div>

  <div class="page">
    ${headerHtml}
    <div class="section-ribbon"><span class="section-ribbon-icon">&#128203;</span> Ответы</div>
    <div class="answers-grid${!hasAssignments || !hasTest ? ' single-column' : ''}">
      ${hasAssignments ? `
      <div class="answers-column">
        <h3>Задания</h3>
        <ul class="answers-list">${assignmentAnswersHtml}</ul>
      </div>
      ` : ''}
      ${hasTest ? `
      <div class="answers-column">
        <h3>Мини-тест</h3>
        <ul class="answers-list">${testAnswersHtml}</ul>
      </div>
      ` : ''}
    </div>
  </div>
</body>
</html>`
}
