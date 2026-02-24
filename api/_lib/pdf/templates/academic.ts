// api/_lib/pdf/templates/academic.ts
import type { Worksheet } from '../../../../shared/types'
import { loadFontAsBase64 } from '../fonts.js'
import { escapeHtml, processText } from '../text-processing.js'
import { shouldShowAnswerField, parseMatchingData, WATERMARK_CSS, WATERMARK_HTML, type MatchingData } from '../shared.js'

// Render matching task for Academic template
export function renderAcademicMatchingHtml(data: MatchingData): string {
  const leftItems = data.leftColumn.map((item, i) =>
    `<div class="ac-match-item"><span class="ac-match-num">${i + 1}.</span> ${processText(item)}</div>`
  ).join('')

  const rightItems = data.rightColumn.map((item, i) =>
    `<div class="ac-match-item"><span class="ac-match-letter">${String.fromCharCode(1072 + i)})</span> ${processText(item)}</div>`
  ).join('')

  return `
    <div class="ac-match-instruction">${processText(data.instruction)}</div>
    <div class="ac-match-columns">
      <div class="ac-match-col">${leftItems}</div>
      <div class="ac-match-col">${rightItems}</div>
    </div>
  `
}

// Academic (Академичный) template — elegant warm-toned style for middle/high school
export function generateAcademicHtml(worksheet: Worksheet, addWatermark = false): string {
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

  const optionLetters = ['А', 'Б', 'В', 'Г', 'Д']

  const assignmentsHtml = worksheet.assignments.map((task, i) => {
    const matchingData = parseMatchingData(task.text)

    if (matchingData) {
      return `
        <div class="ac-task">
          <div class="ac-task-header">
            <div class="ac-task-num">${i + 1}</div>
            <div class="ac-task-text">${renderAcademicMatchingHtml(matchingData)}</div>
          </div>
        </div>
      `
    }

    return `
      <div class="ac-task">
        <div class="ac-task-header">
          <div class="ac-task-num">${i + 1}</div>
          <div class="ac-task-text">${processText(task.text)}</div>
        </div>
        ${shouldShowAnswerField(task.text) ? '<div class="ac-answer-field"></div>' : ''}
      </div>
    `
  }).join('')

  const testHtml = worksheet.test.map((q, i) => {
    const isMultiple = q.options.length > 0 && (q.question.toLowerCase().includes('несколько') || q.question.toLowerCase().includes('множественный') || q.question.toLowerCase().includes('выберите верные'))
    return `
    <div class="ac-test-q">
      <div class="ac-test-header">
        <div class="ac-task-num">${i + 1}</div>
        <div class="ac-test-text">${processText(q.question)}</div>
      </div>
      <div class="ac-options">
        ${q.options.map((opt, idx) => `
          <div class="ac-option">
            <div class="ac-option-marker ${isMultiple ? 'ac-checkbox' : 'ac-radio'}"></div>
            <span class="ac-option-letter">${optionLetters[idx] || String.fromCharCode(1040 + idx)}</span>
            <span class="ac-option-text">${processText(opt)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `}).join('')

  const assignmentAnswersHtml = worksheet.answers.assignments.map((ans, i) => `
    <li class="ac-ans-item">${i + 1}. &nbsp;${processText(ans)}</li>
  `).join('')

  const testAnswersHtml = worksheet.answers.test.map((ans, i) => `
    <li class="ac-ans-item">${i + 1}. ${processText(ans)}</li>
  `).join('')

  const notesLinesHtml = Array.from({ length: 10 }).map(() => '<div class="ac-note-line"></div>').join('')

  const hasAssignments = worksheet.assignments.length > 0
  const hasTest = worksheet.test.length > 0

  const totalPages = 1 + (hasAssignments && hasTest ? 1 : 0) + 1 + 1

  const headerHtml = `
    <div class="ac-header">
      <div class="ac-logo">УчиОн</div>
      <div class="ac-meta">
        <div class="ac-meta-field"><span>Имя:</span><div class="ac-meta-line"></div></div>
        <div class="ac-meta-field"><span>Дата:</span><div class="ac-meta-line"></div></div>
      </div>
    </div>
    <div class="ac-header-line"></div>
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
      font-family: 'Inter', 'Georgia', 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1a1a1a;
      background: white;
    }

    .ac-page {
      position: relative;
      padding: 32px 40px 40px;
      page-break-after: always;
      min-height: 100vh;
    }
    .ac-page:last-child { page-break-after: auto; }

    /* ===== Header ===== */
    .ac-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 10px;
    }
    .ac-logo {
      font-size: 24px;
      font-weight: 700;
      color: #2d2d2d;
      letter-spacing: -0.5px;
    }
    .ac-meta {
      display: flex;
      flex-direction: column;
      gap: 5px;
      align-items: flex-end;
    }
    .ac-meta-field {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 10px;
      color: #6b7280;
    }
    .ac-meta-line {
      width: 140px;
      border-bottom: 1px solid #b8a080;
    }
    .ac-header-line {
      height: 2px;
      background: linear-gradient(90deg, #c4a882, #d4bc9a);
      border-radius: 1px;
      margin-bottom: 24px;
    }

    /* ===== Topic ===== */
    .ac-topic {
      text-align: center;
      margin-bottom: 24px;
    }
    .ac-topic h1 {
      display: inline-block;
      font-size: 22px;
      font-weight: 700;
      color: #1a1a1a;
      padding-bottom: 8px;
      border-bottom: 3px solid #c4a882;
    }

    /* ===== Section badge ===== */
    .ac-section-badge {
      display: inline-block;
      background: #c4a882;
      color: #fff;
      font-weight: 700;
      font-size: 13px;
      padding: 5px 20px;
      border-radius: 4px;
      margin-bottom: 18px;
      letter-spacing: 0.3px;
    }

    /* ===== Task blocks ===== */
    .ac-task {
      margin-bottom: 20px;
      break-inside: avoid;
    }
    .ac-task-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .ac-task-num {
      width: 28px;
      height: 28px;
      background: #2d2d2d;
      color: white;
      border-radius: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .ac-task-text {
      font-size: 12px;
      font-weight: 500;
      line-height: 1.6;
      padding-top: 4px;
      flex: 1;
    }
    .ac-answer-field {
      margin-left: 40px;
      margin-top: 8px;
      height: 56px;
      border: 1.5px dashed #c4a882;
      border-radius: 6px;
      background: rgba(196, 168, 130, 0.05);
    }

    /* ===== Matching (academic) ===== */
    .ac-match-instruction {
      font-size: 12px;
      color: #374151;
      margin-bottom: 10px;
    }
    .ac-match-columns {
      display: flex;
      gap: 20px;
    }
    .ac-match-col { flex: 1; }
    .ac-match-item {
      padding: 7px 12px;
      margin-bottom: 6px;
      background: #f5efe8;
      border: 1px solid #e5ddd2;
      border-radius: 4px;
      font-size: 11px;
      color: #374151;
    }
    .ac-match-num, .ac-match-letter {
      font-weight: 700;
      color: #8b7355;
      margin-right: 6px;
    }

    /* ===== Test ===== */
    .ac-test-q {
      margin-bottom: 20px;
      break-inside: avoid;
    }
    .ac-test-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 8px;
    }
    .ac-test-text {
      font-size: 12px;
      font-weight: 600;
      color: #1a1a1a;
      padding-top: 4px;
    }
    .ac-options {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-left: 40px;
    }
    .ac-option {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ac-radio {
      width: 16px; height: 16px;
      border: 1.5px solid #9ca3af;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .ac-checkbox {
      width: 16px; height: 16px;
      border: 1.5px solid #9ca3af;
      border-radius: 3px;
      flex-shrink: 0;
    }
    .ac-option-letter {
      font-weight: 700;
      font-size: 12px;
      color: #4b5563;
      min-width: 14px;
    }
    .ac-option-text {
      font-size: 11px;
      color: #374151;
    }

    /* ===== Notes ===== */
    .ac-notes-area {
      background: rgba(196, 168, 130, 0.08);
      border-radius: 10px;
      padding: 20px;
      margin-top: 8px;
    }
    .ac-note-line {
      border-bottom: 1px solid #c4a882;
      height: 28px;
    }

    /* ===== Page number ===== */
    .ac-page-num {
      position: absolute;
      bottom: 20px;
      right: 40px;
      background: #2d2d2d;
      color: white;
      font-size: 9px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 4px;
    }

    /* ===== Answers page ===== */
    .ac-answers-header {
      background: linear-gradient(135deg, #c4a882, #d4bc9a);
      padding: 24px 40px;
      margin: 0 -40px 24px;
    }
    .ac-answers-header .ac-logo {
      color: #1a1a1a;
      font-size: 24px;
    }
    .ac-answers-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 8px;
    }
    .ac-answers-grid.single-column {
      grid-template-columns: 1fr;
    }
    .ac-ans-section h3 {
      font-size: 14px;
      font-weight: 700;
      color: #8b7355;
      margin-bottom: 12px;
    }
    .ac-ans-list {
      list-style: none;
      margin-bottom: 20px;
    }
    .ac-ans-item {
      background: rgba(196, 168, 130, 0.08);
      border: 1px solid rgba(196, 168, 130, 0.2);
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 8px;
      font-size: 11px;
      color: #374151;
      break-inside: avoid;
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
  <div class="ac-page">
    ${headerHtml}
    <div class="ac-topic"><h1>${escapeHtml(worksheet.topic)}</h1></div>
    <div class="ac-section-badge">Задания</div>
    <div class="ac-assignments">${assignmentsHtml}</div>
    <div class="ac-page-num">Page 1 / ${totalPages}</div>
  </div>
  ` : ''}

  ${hasTest ? `
  <div class="ac-page">
    ${headerHtml}
    ${!hasAssignments ? `<div class="ac-topic"><h1>${escapeHtml(worksheet.topic)}</h1></div>` : ''}
    <div class="ac-section-badge">Мини-тест</div>
    <div class="ac-test">${testHtml}</div>
    <div class="ac-page-num">Page ${hasAssignments ? 2 : 1} / ${totalPages}</div>
  </div>
  ` : ''}

  <div class="ac-page">
    ${headerHtml}
    <div class="ac-section-badge">Заметки</div>
    <div class="ac-notes-area">${notesLinesHtml}</div>
    <div class="ac-page-num">Page ${totalPages - 1} / ${totalPages}</div>
  </div>

  <div class="ac-page">
    <div class="ac-answers-header">
      <div class="ac-logo">УчиОн</div>
    </div>
    <div class="ac-section-badge">Ответы</div>
    <div class="ac-answers-grid${!hasAssignments || !hasTest ? ' single-column' : ''}">
      ${hasAssignments ? `
      <div class="ac-ans-section">
        <h3>Задания</h3>
        <ol class="ac-ans-list">${assignmentAnswersHtml}</ol>
      </div>
      ` : ''}
      ${hasTest ? `
      <div class="ac-ans-section">
        <h3>Мини-тест</h3>
        <ol class="ac-ans-list">${testAnswersHtml}</ol>
      </div>
      ` : ''}
    </div>
    <div class="ac-page-num">Page ${totalPages} / ${totalPages}</div>
  </div>
</body>
</html>`
}
