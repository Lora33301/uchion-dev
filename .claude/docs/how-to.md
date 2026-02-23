# How-To Guide

## Adding a New Subject

1. Create directory `api/_lib/generation/config/subjects/newsubject/` with files: `index.ts`, `prompt.ts`, `grade-tiers.ts`, `difficulty.ts`
2. Register in `api/_lib/generation/config/subjects/index.ts`
3. Add to `api/_lib/generation/config/index.ts`
4. Add to `SubjectSchema` in `shared/worksheet.ts`
5. Add to `subjectEnum` in `db/schema.ts`
6. Create presentation config `api/_lib/generation/config/presentations/subjects/newsubject.ts`
7. Update frontend (subject selection in GeneratePage)
8. Add smoke tests

## Modifying Generation

1. Task types: `api/_lib/generation/config/task-types.ts`
2. Worksheet formats: `api/_lib/generation/config/worksheet-formats.ts`
3. Prompts: `api/_lib/generation/prompts.ts`
4. Worksheet conversion: `api/_lib/ai-provider.ts` (convertToWorksheet)
5. PDF layout: `api/_lib/pdf.ts` (HTML template)
6. Models: `api/_lib/ai-models.ts`
7. Validation: `api/_lib/generation/validation/`

## Modifying Presentations

1. Subject configs: `api/_lib/generation/config/presentations/subjects/`
2. Slide templates: `api/_lib/generation/config/presentations/templates/`
3. Theme generators: `api/_lib/presentations/` (kids-generator, school-generator, minimalism-generator)
4. Presentation PDF: `api/_lib/presentations/pdf-generator.ts`

## Deployment (Dokploy)

1. Build: `npm run build`
2. Start: `npm run start` (runs `node dist-server/server.js`)
3. Port: `3000` (configurable via `PORT` env var)
4. Health check: `GET /api/health`

Deploy via Dokploy on VPS. Same env vars as development, different secrets for prod.
