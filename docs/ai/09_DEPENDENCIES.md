# 09. Dependencies

Source: `package.json`.

## Runtime dependencies

| Dependency | Why used |
|---|---|
| `@headlessui/react` | accessible UI primitives/modals/dropdowns |
| `@hookform/resolvers` | React Hook Form validation integration |
| `@pdf-lib/fontkit` | custom fonts for PDF generation |
| `@sparticuz/chromium` | Chromium binary for serverless PDF/rendering |
| `@tanstack/react-query` | frontend data fetching/cache |
| `bcrypt` | password/hash utility; verify current usage before changes |
| `bullmq` | optional background generation queues |
| `compression` | gzip/brotli HTTP compression in Express |
| `cookie-parser` | parse cookies in Express |
| `dotenv` | load env files locally |
| `drizzle-orm` | ORM/query builder for PostgreSQL |
| `express` | backend HTTP server and routes |
| `ioredis` | Redis client for BullMQ/Redis utilities |
| `katex` | math rendering in frontend/PDF content |
| `openai` | OpenAI/OpenAI-compatible API client |
| `p-limit` | concurrency limiting |
| `pdf-lib` | PDF creation/manipulation |
| `postgres` | PostgreSQL driver used by Drizzle |
| `pptxgenjs` | PPTX presentation generation |
| `puppeteer-core` | headless browser rendering without bundled Chromium |
| `rate-limiter-flexible` | rate limiting primitives |
| `react`, `react-dom` | frontend framework |
| `react-hook-form` | form state/validation |
| `react-router-dom` | SPA routing |
| `tailwindcss-animate` | Tailwind animation utilities |
| `zod` | runtime schema validation |
| `zustand` | lightweight frontend state |

## Dev dependencies

| Dependency | Why used |
|---|---|
| `@playwright/test` | end-to-end browser tests |
| `@types/*` | TypeScript typings for runtime libs |
| `@vitejs/plugin-react` | Vite React integration |
| `@vitest/ui` | Vitest UI |
| `autoprefixer`, `postcss`, `tailwindcss` | CSS build pipeline |
| `concurrently` | run frontend and backend dev servers together |
| `drizzle-kit` | generate/apply DB migrations and studio |
| `supertest` | API testing against Express |
| `tsx` | run TypeScript files/scripts directly |
| `typescript` | type checking/build |
| `vite` | frontend dev/build tool |
| `vitest` | unit/API test runner |

## Dependency groups by system

- React UI: `react`, `react-dom`, `react-router-dom`, `@headlessui/react`, `zustand`, `@tanstack/react-query`.
- Forms/validation: `react-hook-form`, `@hookform/resolvers`, `zod`.
- Backend/API: `express`, `compression`, `cookie-parser`.
- Database: `drizzle-orm`, `postgres`, `drizzle-kit`.
- Redis/jobs: `bullmq`, `ioredis`.
- AI: `openai`, `p-limit`.
- PDF/PPTX: `pdf-lib`, `@pdf-lib/fontkit`, `puppeteer-core`, `@sparticuz/chromium`, `pptxgenjs`, `katex`.
- Testing: `vitest`, `supertest`, `@playwright/test`.
