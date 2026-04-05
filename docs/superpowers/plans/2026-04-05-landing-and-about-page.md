# Landing Sections + About Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add marketing/landing sections below the generator on the main page and a new `/about` page with service info, comparisons, PDF showcase, interactive steps, and pricing.

**Architecture:** Isolated `src/components/landing/` module with one wrapper component (`LandingSections`) imported into GeneratePage. Separate `AboutPage` reuses some landing components. One new public API endpoint for live stats. Static assets (screenshots, PDFs) in `public/`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, React Query, React Router, Express.js, Drizzle ORM

**Spec:** `docs/superpowers/specs/2026-04-05-landing-and-about-page-design.md`

**Branch:** `staging`

---

## File Structure

```
# New files
server/routes/public.ts                    — GET /api/public/stats endpoint
src/components/landing/SectionDivider.tsx   — reusable thin gradient divider
src/components/landing/StatsSection.tsx     — live counters (users/materials/hours)
src/components/landing/ServicePitch.tsx     — "Время учить" + CTAs
src/components/landing/ShowcaseCarousel.tsx — auto-scrolling screenshot carousel
src/components/landing/LandingSections.tsx  — wrapper: Stats + Pitch + Carousel
src/components/landing/SubjectsMarquee.tsx  — infinite scrolling chips
src/components/landing/FeaturesGrid.tsx     — 6 feature cards with SVG icons
src/components/landing/ComparisonSection.tsx — "Вручную vs УчиОн" (4 blocks)
src/components/landing/PdfStylesShowcase.tsx — 3 PDF style cards with hover overlay
src/components/landing/AudienceSection.tsx  — "Кому подходит" (4 cards)
src/components/landing/InteractiveSteps.tsx — horizontal 01→02→03 clickable steps
src/components/landing/PricingPreview.tsx   — 4 plan cards from shared/plans.ts
src/pages/AboutPage.tsx                    — full about page

# Modified files
server.ts                                  — register public routes
src/App.tsx                                — add /about route
src/pages/GeneratePage.tsx                 — add <LandingSections /> after </main>
src/components/Footer.tsx                  — add "О сервисе" link

# Static assets (copy from docs/screens/, optimize later)
public/images/showcase/                    — 6 carousel screenshots
public/images/pdf-styles/                  — 3 PDF style screenshots
public/docs/                               — 3 example PDFs
```

---

### Task 1: Backend — Public Stats Endpoint

**Files:**
- Create: `server/routes/public.ts`
- Modify: `server.ts:18-19` (add import), `server.ts:196` (register route)

- [ ] **Step 1: Create public stats route**

Create `server/routes/public.ts`:

```typescript
import { Router } from 'express'
import type { Request, Response } from 'express'
import { isNull, count, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { users, worksheets, generations, presentations } from '../../db/schema.js'
import { requireRateLimit } from '../middleware/rate-limit.js'

const router = Router()

// In-memory cache (5 min TTL)
let cachedStats: { data: object; expiresAt: number } | null = null

router.get('/stats', async (req: Request, res: Response) => {
  await requireRateLimit(req, {
    maxRequests: 30,
    windowSeconds: 60,
    identifier: `public:stats:${req.ip}`,
  })

  const now = Date.now()
  if (cachedStats && cachedStats.expiresAt > now) {
    return res.status(200).json(cachedStats.data)
  }

  const [usersResult] = await db
    .select({ count: count() })
    .from(users)
    .where(isNull(users.deletedAt))

  const [worksheetsResult] = await db
    .select({ count: count() })
    .from(worksheets)
    .where(isNull(worksheets.deletedAt))

  const [generationsResult] = await db
    .select({ count: count() })
    .from(generations)

  const [presentationsResult] = await db
    .select({ count: count() })
    .from(presentations)

  const materials = Math.max(worksheetsResult.count, generationsResult.count) + presentationsResult.count

  const data = {
    stats: {
      users: usersResult.count,
      materials,
      hoursSaved: materials * 3,
    }
  }

  cachedStats = { data, expiresAt: now + 5 * 60 * 1000 }
  return res.status(200).json(data)
})

export default router
```

- [ ] **Step 2: Register route in server.ts**

In `server.ts`, add import after line 20 (after billing import):

```typescript
import publicRoutes from './server/routes/public.js'
```

Add route registration after line 196 (after `app.use('/api', healthRoutes)`):

```typescript
app.use('/api/public', publicRoutes)
```

- [ ] **Step 3: Verify endpoint works**

Run: `npm run dev:server`

Then: `curl http://localhost:3000/api/public/stats`

Expected: JSON with `{ stats: { users: N, materials: N, hoursSaved: N } }`

- [ ] **Step 4: Commit**

```bash
git add server/routes/public.ts server.ts
git commit -m "feat: add GET /api/public/stats endpoint for landing page"
```

---

### Task 2: Static Assets — Screenshots and PDFs

**Files:**
- Create: `public/images/showcase/` (6 files), `public/images/pdf-styles/` (3 files), `public/docs/` (3 files)

- [ ] **Step 1: Create directories**

```bash
mkdir -p public/images/showcase public/images/pdf-styles public/docs
```

- [ ] **Step 2: Copy and rename showcase screenshots**

```bash
cp "docs/screens/Снимок экрана 2026-04-05 185137.png" public/images/showcase/worksheet-standard.png
cp "docs/screens/Снимок экрана 2026-04-05 185204.png" public/images/showcase/worksheet-rainbow.png
cp "docs/screens/Снимок экрана 2026-04-05 185147.png" public/images/showcase/worksheet-english.png
cp "docs/screens/Снимок экрана 2026-04-05 185219.png" public/images/showcase/presentation-title.png
cp "docs/screens/Снимок экрана 2026-04-05 185230.png" public/images/showcase/presentation-slide.png
cp "docs/screens/Снимок экрана 2026-04-05 185326.png" public/images/showcase/worksheet-academic.png
```

- [ ] **Step 3: Copy PDF style screenshots and example PDFs**

```bash
cp public/images/showcase/worksheet-standard.png public/images/pdf-styles/standard.png
cp public/images/showcase/worksheet-rainbow.png public/images/pdf-styles/rainbow.png
cp public/images/showcase/worksheet-academic.png public/images/pdf-styles/academic.png

cp "docs/screens/Отечественная-война-1812.pdf" public/docs/standard.pdf
cp "docs/screens/Хозяйственная-деятельность-населения-мира.pdf" public/docs/rainbow.pdf
cp "docs/screens/Функция-квадратного-корня-y-=-√x,-её-свойства-и-график.pdf" public/docs/academic.pdf
```

- [ ] **Step 4: Commit**

```bash
git add public/images public/docs
git commit -m "assets: add showcase screenshots and example PDFs for landing"
```

---

### Task 3: SectionDivider + StatsSection Components

**Files:**
- Create: `src/components/landing/SectionDivider.tsx`, `src/components/landing/StatsSection.tsx`

- [ ] **Step 1: Create SectionDivider**

Create `src/components/landing/SectionDivider.tsx`:

```tsx
export default function SectionDivider() {
  return (
    <div
      className="w-px h-12 mx-auto"
      style={{ background: 'linear-gradient(to bottom, transparent, #e8deff, transparent)' }}
    />
  )
}
```

- [ ] **Step 2: Create StatsSection**

Create `src/components/landing/StatsSection.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query'

async function fetchPublicStats(): Promise<{ stats: { users: number; materials: number; hoursSaved: number } }> {
  const res = await fetch('/api/public/stats')
  if (!res.ok) throw new Error('Failed to fetch stats')
  return res.json()
}

function formatNumber(n: number): string {
  return n.toLocaleString('ru-RU')
}

export default function StatsSection() {
  const { data } = useQuery({
    queryKey: ['public-stats'],
    queryFn: fetchPublicStats,
    staleTime: 5 * 60 * 1000,
  })

  const stats = data?.stats

  return (
    <section className="py-20 text-center">
      <p className="text-[15px] font-medium text-[#94a3b8] mb-10">
        Ваши коллеги уже экономят время
      </p>
      <div className="flex justify-center gap-20 flex-wrap px-4">
        <div className="text-center">
          <div className="text-[32px] font-extrabold text-[#8C52FF] leading-none tracking-tight">
            {stats ? formatNumber(stats.users) : '—'}
          </div>
          <div className="text-sm text-[#64748b] mt-2">педагогов доверяют УчиОн</div>
        </div>
        <div className="text-center">
          <div className="text-[32px] font-extrabold text-[#8C52FF] leading-none tracking-tight">
            {stats ? formatNumber(stats.materials) : '—'}
          </div>
          <div className="text-sm text-[#64748b] mt-2">материалов создано</div>
        </div>
        <div className="text-center">
          <div className="text-[32px] font-extrabold text-[#8C52FF] leading-none tracking-tight">
            {stats ? formatNumber(stats.hoursSaved) : '—'}
          </div>
          <div className="text-sm text-[#64748b] mt-2">часов на жизнь вне работы</div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/SectionDivider.tsx src/components/landing/StatsSection.tsx
git commit -m "feat: add SectionDivider and StatsSection landing components"
```

---

### Task 4: ServicePitch + ShowcaseCarousel Components

**Files:**
- Create: `src/components/landing/ServicePitch.tsx`, `src/components/landing/ShowcaseCarousel.tsx`

- [ ] **Step 1: Create ServicePitch**

Create `src/components/landing/ServicePitch.tsx`:

```tsx
import { useNavigate } from 'react-router-dom'

export default function ServicePitch() {
  const navigate = useNavigate()

  return (
    <section className="py-16 text-center max-w-[600px] mx-auto px-6">
      <h2 className="text-4xl font-extrabold text-[#1e293b] leading-tight tracking-tight mb-4">
        Время учить,{'\n'}оставьте подготовку{' '}
        <span className="text-[#8C52FF]">УчиОн</span>
      </h2>
      <p className="text-base text-[#64748b] leading-relaxed mb-8">
        Российский ИИ-помощник, который создаёт материалы к урокам за 3 минуты,
        бережёт ваше время и возвращает любовь к профессии.
      </p>
      <h3 className="text-xl font-bold text-[#1e293b] mb-2">Что может УчиОн?</h3>
      <p className="text-sm text-[#94a3b8] mb-7">
        Делегируйте своему персональному ИИ-агенту ежедневную рутину
      </p>
      <div className="flex gap-3 justify-center flex-wrap">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="px-7 py-3 bg-[#8C52FF] text-white rounded-xl text-sm font-semibold shadow-[0_4px_16px_rgba(140,82,255,0.25)] hover:bg-[#7B3FEE] transition-all"
        >
          Сгенерировать лист
        </button>
        <button
          onClick={() => navigate('/about')}
          className="px-7 py-3 bg-transparent text-[#8C52FF] border-[1.5px] border-[#e8deff] rounded-xl text-sm font-semibold hover:bg-[#faf8ff] transition-all"
        >
          Узнать подробнее &rarr;
        </button>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Create ShowcaseCarousel**

Create `src/components/landing/ShowcaseCarousel.tsx`:

```tsx
import { useRef, useEffect } from 'react'

const ITEMS = [
  { type: 'Рабочий лист', title: 'Отечественная война 1812', img: '/images/showcase/worksheet-standard.png' },
  { type: 'Рабочий лист · Радуга', title: 'Хозяйственная деятельность', img: '/images/showcase/worksheet-rainbow.png' },
  { type: 'Рабочий лист', title: 'Past Perfect Continuous', img: '/images/showcase/worksheet-english.png' },
  { type: 'Презентация', title: 'Функция квадратного корня', img: '/images/showcase/presentation-title.png' },
  { type: 'Презентация · слайд', title: 'Определение кв. корня', img: '/images/showcase/presentation-slide.png' },
  { type: 'Рабочий лист · Академичный', title: 'Русский язык, 4 класс', img: '/images/showcase/worksheet-academic.png' },
]

// 4 copies for seamless infinite scroll
const CARDS = [...ITEMS, ...ITEMS, ...ITEMS, ...ITEMS]

export default function ShowcaseCarousel() {
  const trackRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  const pausedRef = useRef(false)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const CARD_WIDTH = 260 + 20 // card width + gap
    const oneSetWidth = ITEMS.length * CARD_WIDTH
    let raf: number

    function tick() {
      if (!pausedRef.current) {
        offsetRef.current += 0.6
        if (offsetRef.current >= oneSetWidth) {
          offsetRef.current -= oneSetWidth
        }
        track!.style.transform = `translateX(-${offsetRef.current}px)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <section
      className="pb-20 overflow-hidden relative"
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
    >
      <div ref={trackRef} className="flex gap-5 will-change-transform" style={{ width: 'max-content' }}>
        {CARDS.map((item, i) => (
          <div
            key={i}
            className="w-[260px] h-[340px] bg-[#faf8ff] rounded-2xl border border-[#f1eef9] overflow-hidden flex-shrink-0 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(140,82,255,0.1)] transition-all flex flex-col"
          >
            <div className="flex-1 overflow-hidden">
              <img src={item.img} alt={item.title} className="w-full h-full object-cover object-top" loading="lazy" />
            </div>
            <div className="px-4 py-3 border-t border-[#f1eef9]">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-[#8C52FF] mb-0.5">{item.type}</div>
              <div className="text-[13px] font-medium text-[#475569] truncate">{item.title}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/ServicePitch.tsx src/components/landing/ShowcaseCarousel.tsx
git commit -m "feat: add ServicePitch and ShowcaseCarousel landing components"
```

---

### Task 5: LandingSections Wrapper + Wire into GeneratePage

**Files:**
- Create: `src/components/landing/LandingSections.tsx`
- Modify: `src/pages/GeneratePage.tsx`

- [ ] **Step 1: Create LandingSections wrapper**

Create `src/components/landing/LandingSections.tsx`:

```tsx
import StatsSection from './StatsSection'
import SectionDivider from './SectionDivider'
import ServicePitch from './ServicePitch'
import ShowcaseCarousel from './ShowcaseCarousel'

export default function LandingSections() {
  return (
    <div className="bg-white">
      <StatsSection />
      <SectionDivider />
      <ServicePitch />
      <ShowcaseCarousel />
    </div>
  )
}
```

- [ ] **Step 2: Add LandingSections to GeneratePage**

In `src/pages/GeneratePage.tsx`, add import at top (after other imports):

```tsx
import LandingSections from '../components/landing/LandingSections'
```

In the return JSX, add `<LandingSections />` after the closing `</main>` tag (line 669) and before the loading overlay (line 672). Find:

```tsx
      </main>

      {/* Loading Overlay */}
```

Replace with:

```tsx
      </main>

      <LandingSections />

      {/* Loading Overlay */}
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`

Open http://localhost:5173 — scroll down below the generator. Should see:
- Stats section with numbers from API (or "—" if no data)
- "Время учить" pitch with 2 buttons
- Auto-scrolling carousel with screenshots

- [ ] **Step 4: Commit**

```bash
git add src/components/landing/LandingSections.tsx src/pages/GeneratePage.tsx
git commit -m "feat: wire landing sections into GeneratePage"
```

---

### Task 6: SubjectsMarquee + FeaturesGrid Components (About Page)

**Files:**
- Create: `src/components/landing/SubjectsMarquee.tsx`, `src/components/landing/FeaturesGrid.tsx`

- [ ] **Step 1: Create SubjectsMarquee**

Create `src/components/landing/SubjectsMarquee.tsx`:

```tsx
import { useRef, useEffect } from 'react'

const CHIPS = [
  'Математика · 1-6 класс',
  'Алгебра · 7-11 класс',
  'Геометрия · 7-11 класс',
  'Русский язык · 1-11 класс',
  '5 типов заданий',
  '3 уровня сложности',
  '3 стиля PDF',
  'Презентации PPTX',
]

// 4 copies for seamless scroll
const ALL_CHIPS = [...CHIPS, ...CHIPS, ...CHIPS, ...CHIPS]

export default function SubjectsMarquee() {
  const trackRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  const oneSetWidthRef = useRef(0)
  const pausedRef = useRef(false)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    // Measure width of one set of chips
    const chipEls = track.children
    const gap = 12
    let w = 0
    for (let i = 0; i < CHIPS.length && i < chipEls.length; i++) {
      w += (chipEls[i] as HTMLElement).offsetWidth + gap
    }
    oneSetWidthRef.current = w

    let raf: number
    function tick() {
      if (!pausedRef.current) {
        offsetRef.current += 0.6
        if (offsetRef.current >= oneSetWidthRef.current) {
          offsetRef.current -= oneSetWidthRef.current
        }
        track!.style.transform = `translateX(-${offsetRef.current}px)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      className="py-8 overflow-hidden border-y border-[#f1eef9] relative"
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
    >
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-[60px] bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-[60px] bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

      <div ref={trackRef} className="flex gap-3 will-change-transform" style={{ width: 'max-content' }}>
        {ALL_CHIPS.map((text, i) => (
          <div
            key={i}
            className="px-[18px] py-2 rounded-[20px] text-[13px] font-medium whitespace-nowrap bg-[#faf8ff] border border-[#ede9fe] text-[#6d28d9]"
          >
            {text}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create FeaturesGrid**

Create `src/components/landing/FeaturesGrid.tsx`. This file contains 6 feature cards with inline SVG icons. See spec section "3. FeaturesGrid" for all icons and text. Use the same SVG icons from the approved mockup (`about-page-v3.html`) — stroke icons in `#8C52FF`.

```tsx
const FEATURES = [
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
    title: '5 типов заданий',
    desc: 'Единственный и множественный выбор, открытые вопросы, соотнесение, вставка пропусков',
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
    title: 'Презентации к урокам',
    desc: 'Готовые PPTX с 10 типами слайдов. 3 темы оформления, до 18 слайдов',
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 20V10M18 20V4M6 20v-4"/></svg>,
    title: 'Уровни сложности',
    desc: 'Базовый, средний и повышенный — подбирайте под уровень каждого ученика',
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    title: 'Редактирование',
    desc: 'Измените любой вопрос, вариант ответа или формулировку прямо на сайте',
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
    title: 'Перегенерация заданий',
    desc: 'Не понравилось задание — замените его в 1 клик, выбрав другой тип',
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>,
    title: 'Личный кабинет',
    desc: 'Все материалы сохраняются. Папки, поиск и быстрый доступ к истории',
  },
]

export default function FeaturesGrid() {
  return (
    <section className="py-[72px]">
      <div className="max-w-[760px] mx-auto px-5">
        <p className="text-xs font-semibold uppercase tracking-[1.5px] text-[#8C52FF] text-center mb-3">Возможности</p>
        <h2 className="text-[28px] font-extrabold text-center leading-tight tracking-tight mb-3">Что умеет УчиОн</h2>
        <p className="text-[15px] text-[#64748b] text-center max-w-[520px] mx-auto mb-9">
          Всё, что нужно для подготовки к урокам, в одном сервисе
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="p-5 rounded-[14px] border border-[#f1eef9] hover:border-[#e8deff] hover:bg-[#faf8ff] transition-all">
              <div className="w-10 h-10 rounded-[10px] bg-[#f3eeff] flex items-center justify-center text-[#8C52FF] mb-3">
                {f.icon}
              </div>
              <h3 className="text-sm font-bold mb-1">{f.title}</h3>
              <p className="text-xs text-[#64748b] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/SubjectsMarquee.tsx src/components/landing/FeaturesGrid.tsx
git commit -m "feat: add SubjectsMarquee and FeaturesGrid for about page"
```

---

### Task 7: ComparisonSection + PdfStylesShowcase Components

**Files:**
- Create: `src/components/landing/ComparisonSection.tsx`, `src/components/landing/PdfStylesShowcase.tsx`

- [ ] **Step 1: Create ComparisonSection**

Create `src/components/landing/ComparisonSection.tsx` with all 4 comparison blocks. Follow the exact text from the spec section "4. ComparisonSection". Each block has a gray "Вручную" card and purple-tinted "С УчиОн" card side-by-side (stacks on mobile). Use Tailwind grid: `grid-cols-1 sm:grid-cols-2`.

The component is ~120 lines — pure data + JSX, no logic. Use a `BLOCKS` array to avoid repetition:

```tsx
const BLOCKS = [
  {
    title: 'Создание урока',
    manual: { time: '2-3 часа', items: ['Ищешь материал в интернете', 'Используешь слабые версии ИИ', 'Делаешь тест с нуля', 'Вёрстка в Word'] },
    uchion: { time: '1 минута', items: ['Указываешь предмет, класс, тему', 'Получаешь готовые задания + тест', 'Выбираешь стиль оформления', 'Распечатываешь и ведёшь урок'] },
  },
  // ... remaining 3 blocks (Презентации, Задания и тесты, Печать материала)
  // Full text in spec section "4. ComparisonSection"
]
```

Render each block with the same card pattern from the mockup. Manual card: `bg-[#f9f8fa] border-[#eae8ed]`. УчиОн card: `bg-[#faf8ff] border-[#e8deff]`.

- [ ] **Step 2: Create PdfStylesShowcase**

Create `src/components/landing/PdfStylesShowcase.tsx`:

```tsx
const STYLES = [
  { name: 'Стандартный', desc: 'Классический строгий дизайн УчиОн', img: '/images/pdf-styles/standard.png', pdf: '/docs/standard.pdf' },
  { name: 'Радуга', desc: 'Яркий и красочный, для начальной школы', img: '/images/pdf-styles/rainbow.png', pdf: '/docs/rainbow.pdf' },
  { name: 'Академичный', desc: 'Элегантный стиль для старшей школы', img: '/images/pdf-styles/academic.png', pdf: '/docs/academic.pdf' },
]

export default function PdfStylesShowcase() {
  return (
    <section className="py-[72px]">
      <div className="max-w-[760px] mx-auto px-5">
        <p className="text-xs font-semibold uppercase tracking-[1.5px] text-[#8C52FF] text-center mb-3">Оформление</p>
        <h2 className="text-[28px] font-extrabold text-center leading-tight tracking-tight mb-3">3 стиля PDF</h2>
        <p className="text-[15px] text-[#64748b] text-center max-w-[520px] mx-auto mb-8">
          Выберите подходящий дизайн для рабочего листа
        </p>
        <div className="flex gap-5 justify-center flex-wrap">
          {STYLES.map((s) => (
            <div key={s.name} className="w-[220px] rounded-[14px] overflow-hidden border border-[#f1eef9] hover:border-[#e8deff] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(140,82,255,0.08)] transition-all text-center relative group">
              <div className="h-[280px] overflow-hidden">
                <img src={s.img} alt={s.name} className="w-full h-full object-cover object-top" loading="lazy" />
              </div>
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-[#8C52FF]/85 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-[14px]">
                <a
                  href={s.pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white text-sm font-semibold flex items-center gap-2 px-5 py-2.5 border-2 border-white/60 rounded-[10px] hover:border-white hover:bg-white/15 transition-all"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  Открыть PDF
                </a>
              </div>
              <div className="py-3 px-3">
                <div className="text-sm font-semibold">{s.name}</div>
                <div className="text-xs text-[#94a3b8]">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/ComparisonSection.tsx src/components/landing/PdfStylesShowcase.tsx
git commit -m "feat: add ComparisonSection and PdfStylesShowcase components"
```

---

### Task 8: AudienceSection + InteractiveSteps Components

**Files:**
- Create: `src/components/landing/AudienceSection.tsx`, `src/components/landing/InteractiveSteps.tsx`

- [ ] **Step 1: Create AudienceSection**

Create `src/components/landing/AudienceSection.tsx` with 4 cards. Same pattern as FeaturesGrid but 4-column layout (`grid-cols-2 sm:grid-cols-4`). SVG icons: book-open, graduation-cap, users, layers — all stroke style `#8C52FF`. Text from spec section "6. AudienceSection".

- [ ] **Step 2: Create InteractiveSteps**

Create `src/components/landing/InteractiveSteps.tsx`:

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const STEPS = [
  { num: '01', title: 'Укажите предмет, класс и тему', desc: 'Выберите из списка или напишите свою тему. Настройте тип заданий и уровень сложности — или оставьте по умолчанию.' },
  { num: '02', title: 'ИИ создаёт материал', desc: 'Генерация занимает меньше минуты. Каждое задание проходит многоагентную проверку — ошибки исправляются автоматически.' },
  { num: '03', title: 'Скачайте PDF и ведите урок', desc: 'Готовый рабочий лист можно сразу распечатать. Или отредактируйте любое задание, замените тип и скачайте заново.' },
]

export default function InteractiveSteps() {
  const [active, setActive] = useState(0)
  const navigate = useNavigate()

  return (
    <section className="py-[72px]">
      <div className="max-w-[760px] mx-auto px-5">
        <p className="text-xs font-semibold uppercase tracking-[1.5px] text-[#8C52FF] text-center mb-3">Начало работы</p>
        <h2 className="text-[28px] font-extrabold text-center leading-tight tracking-tight mb-10">
          От темы до готового листа — за минуту
        </h2>

        {/* Horizontal step nav */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {STEPS.map((step, i) => (
            <div key={step.num} className="flex items-center">
              <button
                onClick={() => setActive(i)}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold transition-all relative z-10 ${
                  i === active
                    ? 'bg-[#8C52FF] text-white border-2 border-[#8C52FF] shadow-[0_4px_16px_rgba(140,82,255,0.3)]'
                    : i < active
                      ? 'bg-[#ede9fe] text-[#8C52FF] border-2 border-[#ede9fe]'
                      : 'bg-white text-[#a5a0c0] border-2 border-[#ede9fe]'
                }`}
              >
                {step.num}
              </button>
              {i < STEPS.length - 1 && (
                <div className="w-20 sm:w-20 h-0.5 relative">
                  <div className="absolute inset-0 bg-[#ede9fe]" />
                  <div className={`absolute inset-y-0 left-0 bg-[#8C52FF] transition-all duration-300 ${i < active ? 'right-0' : 'right-full'}`} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="text-center min-h-[100px]">
          <h3 className="text-lg font-bold mb-2">{STEPS[active].title}</h3>
          <p className="text-sm text-[#64748b] leading-relaxed max-w-[420px] mx-auto">
            {STEPS[active].desc}
          </p>
        </div>

        {/* CTA */}
        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3.5 bg-[#8C52FF] text-white rounded-xl text-[15px] font-semibold shadow-[0_4px_16px_rgba(140,82,255,0.25)] hover:bg-[#7B3FEE] transition-all"
          >
            Попробовать бесплатно
          </button>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/AudienceSection.tsx src/components/landing/InteractiveSteps.tsx
git commit -m "feat: add AudienceSection and InteractiveSteps components"
```

---

### Task 9: PricingPreview Component

**Files:**
- Create: `src/components/landing/PricingPreview.tsx`

- [ ] **Step 1: Create PricingPreview**

Create `src/components/landing/PricingPreview.tsx`. Read plan data from `shared/plans.ts` — do NOT hardcode prices or limits:

```tsx
import { useNavigate } from 'react-router-dom'
import { SUBSCRIPTION_PLANS, type SubscriptionPlanId } from '../../../shared/plans'

const PLAN_ORDER: SubscriptionPlanId[] = ['free', 'starter', 'teacher', 'expert']
const POPULAR_PLAN: SubscriptionPlanId = 'teacher'

function getPlanFeatures(plan: typeof SUBSCRIPTION_PLANS[SubscriptionPlanId]): string[] {
  const features: string[] = []
  features.push(plan.isRecurring ? `${plan.generationsPerPeriod} генераций/мес` : `${plan.generationsPerPeriod} генераций`)
  features.push(plan.pdfTemplateStyles ? 'Все стили PDF' : 'Стандартный PDF')
  features.push(`${plan.folders} ${plan.folders <= 2 ? 'папки' : 'папок'}`)
  if (plan.dailyRegenLimit > 0) features.push(`Перегенерация ${plan.dailyRegenLimit}/день`)
  if (plan.allowedSlideCounts.length > 1) features.push(`Презентации ${plan.allowedSlideCounts.join('/')} сл.`)
  return features
}

export default function PricingPreview() {
  const navigate = useNavigate()

  return (
    <section className="py-[72px]">
      <div className="max-w-[760px] mx-auto px-5">
        <p className="text-xs font-semibold uppercase tracking-[1.5px] text-[#8C52FF] text-center mb-3">Тарифы</p>
        <h2 className="text-[28px] font-extrabold text-center leading-tight tracking-tight mb-3">Выберите свой тариф</h2>
        <p className="text-[15px] text-[#64748b] text-center max-w-[520px] mx-auto mb-8">
          5 бесплатных генераций для старта. Подписка — когда будете готовы.
        </p>
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-4 gap-3">
          {PLAN_ORDER.map((planId) => {
            const plan = SUBSCRIPTION_PLANS[planId]
            const isPopular = planId === POPULAR_PLAN
            const features = getPlanFeatures(plan)
            return (
              <div key={planId} className={`rounded-[14px] p-6 text-center flex flex-col relative ${isPopular ? 'border-2 border-[#8C52FF]' : 'border border-[#f1eef9]'}`}>
                {isPopular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#8C52FF] text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-md whitespace-nowrap">
                    Популярный выбор
                  </div>
                )}
                <div className="text-sm font-bold mb-1">{plan.name}</div>
                <div className="text-2xl font-extrabold text-[#8C52FF] mb-0.5">
                  {plan.price > 0 ? `${plan.price.toLocaleString('ru-RU')} ₽` : '0 ₽'}
                </div>
                <div className="text-[11px] text-[#94a3b8] mb-3">
                  {plan.price > 0 ? '/ месяц' : 'навсегда'}
                </div>
                <ul className="text-left flex-1">
                  {features.map((f) => (
                    <li key={f} className="text-[11px] text-[#475569] py-1 border-b border-[#f8f7fa] flex items-center gap-1.5">
                      <span className="text-[#8C52FF] font-bold text-[10px]">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate(planId === 'free' ? '/' : '/pricing')}
                  className={`mt-3.5 w-full py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    isPopular
                      ? 'bg-[#8C52FF] text-white hover:bg-[#7B3FEE]'
                      : 'bg-[#f3eeff] text-[#8C52FF] border border-[#e8deff] hover:bg-[#ede9fe]'
                  }`}
                >
                  {planId === 'free' ? 'Начать' : 'Подключить'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/landing/PricingPreview.tsx
git commit -m "feat: add PricingPreview component with data from shared/plans.ts"
```

---

### Task 10: AboutPage + Routing + Footer

**Files:**
- Create: `src/pages/AboutPage.tsx`
- Modify: `src/App.tsx`, `src/components/Footer.tsx`

- [ ] **Step 1: Create AboutPage**

Create `src/pages/AboutPage.tsx`:

```tsx
import Header from '../components/Header'
import SubjectsMarquee from '../components/landing/SubjectsMarquee'
import FeaturesGrid from '../components/landing/FeaturesGrid'
import SectionDivider from '../components/landing/SectionDivider'
import ComparisonSection from '../components/landing/ComparisonSection'
import PdfStylesShowcase from '../components/landing/PdfStylesShowcase'
import AudienceSection from '../components/landing/AudienceSection'
import InteractiveSteps from '../components/landing/InteractiveSteps'
import PricingPreview from '../components/landing/PricingPreview'
import { useNavigate } from 'react-router-dom'

export default function AboutPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <Header />

      {/* Hero */}
      <section className="text-center pt-20 pb-12 px-6">
        <h1 className="text-4xl sm:text-[36px] font-extrabold leading-tight tracking-tight mb-4">
          Всё для подготовки к урокам —<br />в <span className="text-[#8C52FF]">УчиОн</span>
        </h1>
        <p className="text-base text-[#64748b] leading-relaxed max-w-[540px] mx-auto">
          Создавайте рабочие листы, тесты и презентации с помощью ИИ. Больше не нужно тратить вечера на подготовку.
        </p>
      </section>

      <SubjectsMarquee />
      <FeaturesGrid />
      <SectionDivider />
      <ComparisonSection />
      <SectionDivider />
      <PdfStylesShowcase />
      <SectionDivider />
      <AudienceSection />
      <SectionDivider />
      <InteractiveSteps />
      <SectionDivider />
      <PricingPreview />

      {/* Bottom CTA */}
      <section className="text-center py-12 pb-20 px-6">
        <p className="text-base text-[#64748b] mb-5">
          Создайте первый рабочий лист прямо сейчас — это бесплатно
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-8 py-3.5 bg-[#8C52FF] text-white rounded-xl text-[15px] font-semibold shadow-[0_4px_16px_rgba(140,82,255,0.25)] hover:bg-[#7B3FEE] transition-all"
        >
          Создать рабочий лист
        </button>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Add route in App.tsx**

In `src/App.tsx`, add lazy import after line 19 (after PricingPage):

```tsx
const AboutPage = lazy(() => import('./pages/AboutPage'))
```

Add route after the `/pricing` route (after line 71):

```tsx
<Route path="/about" element={<Suspense fallback={<PageFallback />}><AboutPage /></Suspense>} />
```

- [ ] **Step 3: Add "О сервисе" link to Footer**

In `src/components/Footer.tsx`, add after the "Тарифы" link (after line 53):

```tsx
              <li>
                <Link to="/about" className="text-sm text-slate-500 hover:text-[#8C52FF] transition-colors">
                  О сервисе
                </Link>
              </li>
```

- [ ] **Step 4: Verify in browser**

Run: `npm run dev`

- Open http://localhost:5173/about — should see full about page with all sections
- Check footer for "О сервисе" link
- Click "Попробовать бесплатно" button → should navigate to `/`
- Click "Подключить" on pricing cards → should navigate to `/pricing`
- Click interactive steps 01 → 02 → 03 → arrows light up, content changes
- Hover over PDF style cards → purple overlay with "Открыть PDF"
- Resize browser to mobile width → all grids collapse properly

- [ ] **Step 5: Commit**

```bash
git add src/pages/AboutPage.tsx src/App.tsx src/components/Footer.tsx
git commit -m "feat: add /about page with routing and footer link"
```

---

### Task 11: Final Polish and Build Verification

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Fix any type errors.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Ensure no build errors. Check bundle size is reasonable.

- [ ] **Step 3: Manual smoke test**

Run `npm run dev` and verify:
1. Main page (`/`) — scroll down, see Stats → Pitch → Carousel
2. Stats show real numbers from API
3. Carousel auto-scrolls, pauses on hover
4. "Узнать подробнее" button → navigates to `/about`
5. `/about` — all sections render, marquee scrolls seamlessly
6. Interactive steps work (click 01 → 02 → 03)
7. PDF hover overlays work, PDF opens in new tab
8. Mobile responsive (resize browser to ~375px)
9. Footer "О сервисе" link works

- [ ] **Step 4: Final commit if any fixes**

```bash
git add -A
git commit -m "fix: polish landing sections and about page"
```
