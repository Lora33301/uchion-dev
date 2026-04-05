# Landing Sections + About Page — Design Spec

## Summary

Add landing/marketing sections below the generator on the main page (`/`) and create a new `/about` page with detailed service information. Goal: convert visitors into users by showcasing value, real stats, and examples.

## Scope

### In Scope
- Landing sections on GeneratePage (below generator, visible to all users)
- New `/about` route and page
- Public stats API endpoint
- Footer update (add "О сервисе" link)
- Mobile-responsive design

### Out of Scope
- Loading tips during generation (separate task)
- Header navigation changes (no "О нас" link in header)
- Changes to the generator itself

---

## Architecture

**Approach: Component-based with isolated landing module (Option C)**

```
src/components/landing/
  LandingSections.tsx          — wrapper: StatsSection + ServicePitch + ShowcaseCarousel
  StatsSection.tsx             — live counters from API
  ServicePitch.tsx             — "Время учить" text + CTAs
  ShowcaseCarousel.tsx         — auto-scrolling screenshot carousel
  SubjectsMarquee.tsx          — infinite scrolling chips (shared, used on both pages)
  FeaturesGrid.tsx             — 6 feature cards with SVG icons
  ComparisonSection.tsx        — "Вручную vs УчиОн" cards (4 blocks)
  PdfStylesShowcase.tsx        — 3 PDF style cards with hover→"Открыть PDF"
  AudienceSection.tsx          — 4 "Кому подходит" cards
  InteractiveSteps.tsx         — horizontal 01→02→03 clickable steps
  PricingPreview.tsx           — 4 plan cards (data from shared/plans.ts)
  SectionDivider.tsx           — thin gradient vertical line
src/pages/AboutPage.tsx        — full about page
server/routes/public.ts        — GET /api/public/stats
```

GeneratePage.tsx change: add `<LandingSections />` after `</main>`, before Footer. One import, one line.

---

## Main Page (`/`) — Landing Sections

Below the existing generator (after "Проверяйте материалы перед печатью"), add 3 sections:

### Section 1: StatsSection

**Heading:** "Ваши коллеги уже экономят время"

**3 counters in a row:**
| Counter | Source | Calculation |
|---------|--------|-------------|
| `N` педагогов доверяют УчиОн | `totalUsers` from API | Direct count |
| `N` материалов создано | `totalMaterials` from API | worksheets + presentations count |
| `N` часов на жизнь вне работы | `hoursSaved` from API | totalMaterials × 3 |

**Visual style:**
- Numbers: ~32px, font-weight 800, color `#8C52FF`
- Labels: 14px, color `#64748b`
- Large padding (80px vertical), centered, no borders/cards
- Heading: 15px, font-weight 500, color `#94a3b8`

**Data source:** `GET /api/public/stats` (new endpoint), cached 5 minutes server-side. Frontend: `useQuery(['public-stats'], { staleTime: 5 * 60 * 1000 })`.

### Section 2: ServicePitch

**Content:**
- Title: "Время учить, оставьте подготовку **УчиОн**" (УчиОн in `#8C52FF`)
- Description: "Российский ИИ-помощник, который создаёт материалы к урокам за 3 минуты, бережёт ваше время и возвращает любовь к профессии."
- Subtitle: "Что может УчиОн?"
- Sub-description: "Делегируйте своему персональному ИИ-агенту ежедневную рутину"

**2 CTA buttons:**
- "Сгенерировать лист" (primary, purple) → smooth scroll to generator top
- "Узнать подробнее →" (secondary, outline) → navigate to `/about`

### Section 3: ShowcaseCarousel

**Auto-scrolling horizontal carousel** (CSS animation or requestAnimationFrame):
- Cards: 260×340px, rounded corners, soft purple background `#faf8ff`
- Each card: screenshot image (top) + label (type + title at bottom)
- Infinite loop, ~30s full cycle, pauses on hover
- Cards duplicate for seamless wrapping

**Content (6 cards from docs/screens/):**
1. Рабочий лист — Отечественная война 1812 (standard)
2. Рабочий лист — Хозяйственная деятельность (rainbow)
3. Рабочий лист — Past Perfect (standard)
4. Презентация — Функция квадратного корня (title slide)
5. Презентация — Определение кв. корня (content slide)
6. Рабочий лист — Русский язык тест (academic)

**Images:** Static files in `public/images/showcase/`. Optimized PNGs or WebP.

---

## About Page (`/about`)

Full marketing page with the following sections top-to-bottom:

### 1. Hero
- "Всё для подготовки к урокам — в **УчиОн**"
- "Создавайте рабочие листы, тесты и презентации с помощью ИИ. Больше не нужно тратить вечера на подготовку."

### 2. SubjectsMarquee
- Seamless infinite horizontal scroll (requestAnimationFrame, 4 copies of chips)
- Chips: "Математика · 1-6 класс", "Алгебра · 7-11 класс", "Геометрия · 7-11 класс", "Русский язык · 1-11 класс", "5 типов заданий", "3 уровня сложности", "3 стиля PDF", "Презентации PPTX"
- Fade-out edges (CSS `::before`/`::after` gradient masks)
- Pause on hover
- Speed: ~0.6px/frame

### 3. FeaturesGrid
- Label: "Возможности"
- Title: "Что умеет УчиОн"
- Subtitle: "Всё, что нужно для подготовки к урокам, в одном сервисе"
- 3×2 grid (1 column on mobile)
- Cards with SVG icons (stroke, `#8C52FF`), no emojis:

| Icon | Title | Description |
|------|-------|-------------|
| check-square | 5 типов заданий | Единственный и множественный выбор, открытые вопросы, соотнесение, вставка пропусков |
| monitor | Презентации к урокам | Готовые PPTX с 10 типами слайдов. 3 темы оформления, до 18 слайдов |
| bar-chart | Уровни сложности | Базовый, средний и повышенный — подбирайте под уровень каждого ученика |
| edit | Редактирование | Измените любой вопрос, вариант ответа или формулировку прямо на сайте |
| refresh | Перегенерация заданий | Не понравилось задание — замените его в 1 клик, выбрав другой тип |
| folder | Личный кабинет | Все материалы сохраняются. Папки, поиск и быстрый доступ к истории |

### 4. ComparisonSection
- Label: "Сравнение"
- Title: "Вручную или с УчиОн"
- 4 comparison blocks (2-column grid, 1-column on mobile):

**Создание урока:** 2-3 часа vs 1 минута
**Презентации:** 2-4 часа vs 2-3 минуты
**Задания и тесты:** ограничения vs гибкость
**Печать материала:** ручное форматирование vs сразу готово

Each block: gray card "Вручную" + purple-tinted card "С УчиОн". Time in large bold text + bullet list.

### 5. PdfStylesShowcase
- Label: "Оформление"
- Title: "3 стиля PDF"
- 3 cards side-by-side:
  - **Стандартный** — screenshot, "Классический строгий дизайн УчиОн"
  - **Радуга** — screenshot, "Яркий и красочный, для начальной школы"
  - **Академичный** — screenshot, "Элегантный стиль для старшей школы"
- **Hover behavior:** Purple overlay with "Открыть PDF" button → opens PDF in new browser tab
- PDF files stored in `public/docs/` as static assets
- Screenshots in `public/images/pdf-styles/`

### 6. AudienceSection
- Label: "Для кого"
- Title: "Кому подходит УчиОн"
- 4 cards (2×2 on mobile):

| SVG Icon | Title | Description |
|----------|-------|-------------|
| book-open | Учителя начальных классов | Математика и русский 1-4 класс. Яркие листы для малышей |
| graduation-cap | Учителя-предметники | Алгебра, геометрия, русский 5-11 класс |
| users | Репетиторы | Подбирайте сложность под каждого ученика |
| layers | Молодые специалисты | Быстрый старт без опыта подготовки |

### 7. InteractiveSteps
- Label: "Начало работы"
- Title: "От темы до готового листа — за минуту"
- Horizontal timeline: 3 circles (01, 02, 03) connected by arrows
- **Interactive:** Click circle → arrow "lights up" purple → panel with text appears below with fade-in animation
- Step 01 active by default

| Step | Title | Description |
|------|-------|-------------|
| 01 | Укажите предмет, класс и тему | Выберите из списка или напишите свою тему. Настройте тип заданий и уровень сложности — или оставьте по умолчанию. |
| 02 | ИИ создаёт материал | Генерация занимает меньше минуты. Каждое задание проходит многоагентную проверку — ошибки исправляются автоматически. |
| 03 | Скачайте PDF и ведите урок | Готовый рабочий лист можно сразу распечатать. Или отредактируйте любое задание, замените тип и скачайте заново. |

- **CTA button below steps:** "Попробовать бесплатно" → navigate to `/`
- **Mobile:** Same layout, smaller circles and shorter arrows

### 8. PricingPreview
- Label: "Тарифы"
- Title: "Выберите свой тариф"
- Subtitle: "5 бесплатных генераций для старта. Подписка — когда будете готовы."
- 4 cards in a row (2×2 on mobile, 1 column on ≤400px)
- Data from `shared/plans.ts` — NOT hardcoded
- **Cards use `display: flex; flex-direction: column`** with features list `flex: 1` so buttons align at the bottom
- Методист card: `border: 2px solid #8C52FF` + "Популярный выбор" badge
- Buttons: "Подключить" → opens SubscriptionPlansModal or navigates to `/pricing`
- Free plan button: "Начать" → navigate to `/`

### 9. Bottom CTA
- "Создайте первый рабочий лист прямо сейчас — это бесплатно"
- Button: "Создать рабочий лист" → navigate to `/`

---

## Backend: Public Stats API

### `GET /api/public/stats`

**No authentication required.** Rate-limited: 30 req/min per IP.

Response:
```json
{
  "stats": {
    "users": 127,
    "materials": 1204,
    "hoursSaved": 3612
  }
}
```

**Queries:**
- `users`: `SELECT COUNT(*) FROM users WHERE deleted_at IS NULL`
- `materials`: `MAX(COUNT worksheets WHERE deleted_at IS NULL, COUNT generations)` + `COUNT presentations` (presentations table has no soft delete)
- `hoursSaved`: `materials × 3`

**Caching:** In-memory cache with 5-minute TTL. Simple object `{ data, expiresAt }` — no Redis needed.

**File:** `server/routes/public.ts`, registered in server as `app.use('/api/public', publicRouter)`.

---

## Routing Changes

In `App.tsx`:
```tsx
import AboutPage from './pages/AboutPage'
// ...
<Route path="/about" element={<AboutPage />} />
```

## Footer Changes

In `Footer.tsx`, add to "Для учителей" section:
```tsx
<li>
  <Link to="/about">О сервисе</Link>
</li>
```

---

## Static Assets

New files to add to `public/`:
```
public/
  images/
    showcase/          — 6 carousel screenshots (optimized PNG/WebP)
    pdf-styles/        — 3 PDF style screenshots
  docs/
    standard.pdf       — example PDF (standard style)
    rainbow.pdf        — example PDF (rainbow style)
    academic.pdf       — example PDF (academic style)
```

Source images: `docs/screens/` (already uploaded). Need optimization before moving to `public/`.

---

## Visual Design Tokens

| Token | Value |
|-------|-------|
| Primary purple | `#8C52FF` |
| Purple hover | `#7B3FEE` |
| Light purple bg | `#faf8ff` |
| Purple border | `#e8deff` |
| Purple badge bg | `#ede9fe` |
| Section label | `#8C52FF`, 12px, uppercase, letter-spacing 1.5px |
| Section title | `#1e293b`, 28px, weight 800 |
| Section subtitle | `#64748b`, 15px |
| Body text | `#475569`, 13px |
| Muted text | `#94a3b8` |
| Card border | `#f1eef9` |
| Card hover border | `#e8deff` |
| Divider | 1px wide, 48px tall, gradient `transparent → #e8deff → transparent` |

---

## Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| ≥768px | Full desktop layout (3-col features, 4-col audience/pricing) |
| 641-767px | Tablet (2-col grids) |
| ≤640px | Mobile (1-col features, 2-col audience/pricing, 1-col comparisons) |
| ≤400px | Narrow mobile (1-col pricing) |

---

## Mockups

Interactive mockups created during brainstorming:
- Main page sections: `.superpowers/brainstorm/1589-1775404023/content/layout-v2.html`
- About page (final): `.superpowers/brainstorm/1589-1775404023/content/about-page-v5.html`
