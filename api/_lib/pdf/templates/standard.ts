// api/_lib/pdf/templates/standard.ts
import type { Worksheet } from '../../../../shared/types'
import { loadFontAsBase64 } from '../fonts.js'
import { escapeHtml, processText } from '../text-processing.js'
import { shouldShowAnswerField, parseMatchingData, renderMatchingHtml, WATERMARK_CSS, WATERMARK_HTML } from '../shared.js'

export function generateStandardHtml(worksheet: Worksheet, addWatermark = false): string {
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

  // Build individual task HTML items
  const assignmentsHtml = worksheet.assignments.map((task, i) => {
    const matchingData = parseMatchingData(task.text)

    if (matchingData) {
      return `
        <div class="task-block">
          <div class="task-text">
            <span class="task-number">${i + 1}.</span>
          </div>
          ${renderMatchingHtml(matchingData)}
        </div>
      `
    }

    return `
      <div class="task-block">
        <div class="task-text">
          <span class="task-number">${i + 1}.</span>
          ${processText(task.text)}
        </div>
        ${shouldShowAnswerField(task.text) ? '<div class="answer-field"></div>' : ''}
      </div>
    `
  }).join('')

  const testHtml = worksheet.test.map((q, i) => `
    <div class="test-question">
      <div class="question-text">
        <span class="question-number">${i + 1}.</span>
        ${processText(q.question)}
      </div>
      <div class="options">
        ${q.options.map((opt, idx) => `
          <div class="option">
            <div class="option-letter">${String.fromCharCode(65 + idx)}</div>
            <span class="option-text">${processText(opt)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('')

  const assignmentAnswersHtml = worksheet.answers.assignments.map((ans, i) => `
    <li class="answer-item">
      <span class="answer-number">${i + 1}.</span>
      ${processText(ans)}
    </li>
  `).join('')

  const testAnswersHtml = worksheet.answers.test.map((ans, i) => `
    <li class="answer-item-inline">
      <span class="answer-number">${i + 1}.</span>
      ${processText(ans)}
    </li>
  `).join('')

  const notesLinesHtml = Array.from({ length: 14 }).map(() => '<div class="note-line"></div>').join('')

  const hasAssignments = worksheet.assignments.length > 0
  const hasTest = worksheet.test.length > 0

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(worksheet.topic)}</title>
  <style>
    ${fontFaceCSS}

    @page {
      size: A4;
      margin: 12mm 14mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #111827;
      background: white;
    }

    /* Content section — each starts on a new page, content flows naturally */
    .content-section {
      page-break-before: always;
    }

    .content-section:first-child {
      page-break-before: auto;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #f3f4f6;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }

    .logo {
      font-size: 22px;
      font-weight: bold;
      color: #4f46e5;
    }

    .meta-fields {
      font-size: 10px;
      color: #6b7280;
    }

    .meta-field {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .meta-line {
      flex: 1;
      min-width: 160px;
      border-bottom: 1px solid #d1d5db;
    }

    /* Title */
    .title {
      text-align: center;
      font-size: 20px;
      font-weight: bold;
      color: #111827;
      margin-bottom: 16px;
    }

    /* Section titles */
    .section-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 16px;
      font-weight: bold;
      color: #111827;
      margin-bottom: 14px;
    }

    .section-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      background: #4f46e5;
      color: white;
      border-radius: 6px;
      font-size: 13px;
      font-weight: bold;
    }

    /* Tasks/Assignments */
    .task-block {
      margin-bottom: 14px;
      break-inside: avoid;
    }

    .task-text {
      font-size: 12px;
      font-weight: 500;
      color: #111827;
      line-height: 1.5;
      margin-bottom: 6px;
    }

    .task-number {
      color: #4f46e5;
      margin-right: 6px;
    }

    .answer-field {
      height: 56px;
      border: 1.5px dashed #d1d5db;
      border-radius: 6px;
      background: rgba(249, 250, 251, 0.3);
    }

    /* Matching task styles */
    .matching-instruction {
      font-size: 12px;
      color: #374151;
      margin-bottom: 10px;
      margin-left: 20px;
    }

    .matching-columns {
      display: flex;
      gap: 20px;
      margin-left: 20px;
    }

    .matching-column {
      flex: 1;
    }

    .matching-item {
      padding: 6px 10px;
      margin-bottom: 6px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      font-size: 11px;
      color: #374151;
    }

    .matching-number, .matching-letter {
      font-weight: bold;
      color: #4f46e5;
      margin-right: 6px;
    }

    /* Test questions */
    .test-question {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 10px;
      background: white;
      break-inside: avoid;
    }

    .question-text {
      font-size: 12px;
      font-weight: 500;
      color: #111827;
      margin-bottom: 8px;
    }

    .question-number {
      margin-right: 6px;
    }

    .options {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .option {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .option-letter {
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #e5e7eb;
      border-radius: 50%;
      font-size: 10px;
      font-weight: bold;
      color: #6b7280;
      flex-shrink: 0;
    }

    .option-text {
      font-size: 11px;
      color: #374151;
    }

    /* Evaluation */
    .evaluation-section {
      background: #f9fafb;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .evaluation-title {
      font-weight: bold;
      color: #111827;
      margin-bottom: 12px;
    }

    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }

    .checkbox {
      width: 18px;
      height: 18px;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      background: white;
      flex-shrink: 0;
    }

    /* Notes */
    .notes-section {
      background: #f9fafb;
      border-radius: 10px;
      padding: 20px;
      min-height: 360px;
    }

    .notes-title {
      font-weight: bold;
      color: #111827;
      margin-bottom: 14px;
    }

    .note-line {
      border-bottom: 1px solid #d1d5db;
      height: 28px;
    }

    /* Answers page */
    .answers-title {
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      color: #111827;
      margin-bottom: 24px;
    }

    .answers-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .answers-grid.single-column {
      grid-template-columns: 1fr;
    }

    .answers-column h3 {
      font-size: 14px;
      font-weight: bold;
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

    .answer-item-inline {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #f9fafb;
      border: 1px solid #f3f4f6;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 6px;
      font-size: 11px;
      font-weight: 500;
      color: #374151;
    }

    .answer-number {
      font-weight: bold;
      color: #6366f1;
      margin-right: 6px;
    }

    ${addWatermark ? WATERMARK_CSS : ''}

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  ${addWatermark ? WATERMARK_HTML : ''}
  ${hasAssignments ? `
  <!-- Assignments section -->
  <div class="content-section">
    <div class="header">
      <div class="logo">УчиОн</div>
      <div class="meta-fields">
        <div class="meta-field">
          <span>Имя и фамилия:</span>
          <div class="meta-line"></div>
        </div>
        <div class="meta-field">
          <span>Дата:</span>
          <div class="meta-line"></div>
        </div>
      </div>
    </div>

    <h1 class="title">${escapeHtml(worksheet.topic)}</h1>

    <div class="section-title">
      <div class="section-badge">E</div>
      Задания
    </div>

    <div class="assignments">
      ${assignmentsHtml}
    </div>
  </div>
  ` : ''}

  ${hasTest ? `
  <!-- Test section -->
  <div class="content-section">
    ${!hasAssignments ? `
    <div class="header">
      <div class="logo">УчиОн</div>
      <div class="meta-fields">
        <div class="meta-field">
          <span>Имя и фамилия:</span>
          <div class="meta-line"></div>
        </div>
        <div class="meta-field">
          <span>Дата:</span>
          <div class="meta-line"></div>
        </div>
      </div>
    </div>

    <h1 class="title">${escapeHtml(worksheet.topic)}</h1>
    ` : ''}

    <div class="section-title">
      <div class="section-badge">T</div>
      Мини-тест
    </div>

    <div class="test-questions">
      ${testHtml}
    </div>
  </div>
  ` : ''}

  <!-- Evaluation & Notes -->
  <div class="content-section">
    <div class="evaluation-section">
      <div class="evaluation-title">Оценка урока</div>
      <div class="checkbox-item">
        <div class="checkbox"></div>
        <span>Все понял</span>
      </div>
      <div class="checkbox-item">
        <div class="checkbox"></div>
        <span>Было немного сложно</span>
      </div>
      <div class="checkbox-item">
        <div class="checkbox"></div>
        <span>Нужна помощь</span>
      </div>
    </div>

    <div class="notes-section">
      <div class="notes-title">Заметки</div>
      ${notesLinesHtml}
    </div>
  </div>

  <!-- Answers -->
  <div class="content-section">
    <h2 class="answers-title">Ответы</h2>

    <div class="answers-grid${!hasAssignments || !hasTest ? ' single-column' : ''}">
      ${hasAssignments ? `
      <div class="answers-column">
        <h3>Задания</h3>
        <ul class="answers-list">
          ${assignmentAnswersHtml}
        </ul>
      </div>
      ` : ''}

      ${hasTest ? `
      <div class="answers-column">
        <h3>Мини-тест</h3>
        <ul class="answers-list">
          ${testAnswersHtml}
        </ul>
      </div>
      ` : ''}
    </div>
  </div>
</body>
</html>`
}
