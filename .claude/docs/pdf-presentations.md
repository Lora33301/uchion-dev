# PDF & Presentations

## Worksheet PDF (`api/_lib/pdf.ts`)

Server-side generation via **Puppeteer** + `@sparticuz/chromium`.

### Process
- HTML template -> PDF via `page.pdf()`
- Inter font embedded as base64 TTF
- LaTeX -> Unicode conversion (100+ math commands, Greek letters)
- Multi-page: assignments, test, grading/notes, answers

### Layout details
- Matching tasks: two-column HTML layout
- Fields for answers, grades, notes
- `pdfBase64` stored on Worksheet object

### Critical rule
`pdfBase64` **must be cleared** (`''`) whenever worksheet content changes (edits, regeneration), otherwise stale PDF is downloaded. Cleared in: `saveChanges()`, `replaceAssignment()`, `replaceTestQuestion()`, `handleRegenerateTask()`.

### Client-side fallback
`src/lib/pdf-client.ts` -- uses `pdf-lib` if server PDF is empty.

### PDF Template Styles
3 styles available via `PdfTemplateModal`: `standard`, `rainbow`, `academic`.
- Free plan: only `standard` (others show lock icon + upgrade prompt)
- Paid plans (starter/teacher/expert): all styles available
- Controlled by `pdfTemplateStyles` field in `PlanConfig` (`shared/plans.ts`)

### Download flow
`handleDownloadPdf` checks `pdfBase64` first; falls back to client-side `pdf-lib` if empty.

## Presentations (`api/_lib/presentations/`)

### Generation
- AI model: `claude-sonnet-4.5` (via ClaudeProvider)
- SSE progress streaming
- Max 15 presentations per user

### Themes (3 active on site)
- `professional` -- minimalism-generator.ts
- `kids` -- kids-generator.ts
- `school` -- school-generator.ts

DB enum has 6 values: professional, educational, minimal, scientific, kids, school.

### Slide Types (10)
title, content, twoColumn, table, example, formula, diagram, chart, practice, conclusion

### Output Formats
- **PPTX**: via `pptxgenjs` library
- **PDF**: via Puppeteer (same approach as worksheets)

### Configuration
- Subject configs: `api/_lib/generation/config/presentations/subjects/`
- Slide templates: `api/_lib/generation/config/presentations/templates/`
- Template types: minimalism, kids, school

## Key Files

- `api/_lib/pdf.ts` -- worksheet PDF generation (Puppeteer)
- `api/_lib/presentations/generator.ts` -- main presentation generator
- `api/_lib/presentations/minimalism-generator.ts` -- professional theme
- `api/_lib/presentations/kids-generator.ts` -- kids theme
- `api/_lib/presentations/school-generator.ts` -- school theme
- `api/_lib/presentations/pdf-generator.ts` -- presentation PDF
- `api/_lib/presentations/sanitize.ts` -- HTML sanitization
- `src/lib/pdf-client.ts` -- client-side PDF fallback (pdf-lib)
- `src/components/presentations/SlidePreview.tsx` -- slide HTML preview
- `src/pages/GeneratePresentationPage.tsx` -- presentation generation form
- `src/pages/SavedPresentationPage.tsx` -- saved presentation view
