# GeneratePage UX/UI Redesign — Design Spec

> **Goal:** Replace the current free-text prompt input with a structured, minimalist form that minimizes typing for teachers. Remove visual clutter, adopt Apple HIG-inspired clean aesthetic with Uchion purple accents.

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Layout | Ultra-minimal structured bar | Combines search-bar compactness with structured fields |
| Subject field | Combo-box with autocomplete | Teachers type 2-3 chars, pick from list, or enter custom subject |
| Background | White (no purple gradient blob) | Purple accents move INTO the form card |
| Buttons | Compact, rounded, not oversized | "Minecraft blocks" complaint on mobile |
| Advanced settings toggle | Pill button with slider icon + chevron | Matches existing Uchion pattern |
| Advanced settings panel | Clean rows of labeled dropdowns, no container card | Maximum minimalism |
| Disabled mode chips | Removed ("План урока", "Картинка") | They add clutter with no function |

---

## Layout Structure

### Desktop (max-w-3xl centered)

```
┌─────────────────────────────────────────────────┐
│              Добрый день, Инга!                  │
│          Какой материал хотите создать?          │
│                                                 │
│  [Задания|Презентация]          [⚡ 145] [+]    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ ПРЕДМЕТ              │ КЛАСС            │    │
│  │ Математика ▾          │ 5 ▾             │    │
│  ├──────────────────────────────────────────┤    │
│  │ Тема: Сложение дробей    [✦ Создать ⚡2] │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│          ☰ Параметры задания ▾                   │
│                                                 │
│  (expanded:)                                    │
│  Кол-во заданий    Сложность      Формат        │
│  [10 заданий ▾]    [Средняя ▾]    [Тест+зад ▾] │
│                                                 │
│  Типы заданий                                   │
│  [Единств.выбор] [Множ.выбор] [Открытый] ...    │
│                                                 │
│  Пожелания (необязательно)                      │
│  [____________________________________]         │
│                                                 │
│  ┌─────────┐ ┌──────────┐ ┌──────────────┐     │
│  │Рус, 3кл │ │Геом, 8кл │ │Англ, 5кл     │     │
│  │сущ-ное  │ │Пифагор   │ │Present Simple│     │
│  └─────────┘ └──────────┘ └──────────────┘     │
│                                                 │
│        Проверяйте материалы перед печатью        │
└─────────────────────────────────────────────────┘
```

### Mobile (375px)

- Предмет + Класс stay in one row (fit at any width)
- "Создать" button: icon + cost only, no text label
- "Параметры" pill: shortened text
- Example cards: vertical stack (each card = horizontal: `subject, grade | topic`)
- Advanced settings dropdowns: stack 1 per row on small screens

---

## Component Breakdown

### 1. Input Bar (`GenerateInputBar`)

A single rounded card (`border-radius: 14px`, `border: 1.5px solid #e8deff`) split into two rows:

**Top row** (divided by vertical separator):
- **Subject** (flex:2) — combo-box component
  - Label: `ПРЕДМЕТ` (9px uppercase, `#a5a0c0`)
  - Value: selected subject name + `▾`
  - Click opens dropdown with search input
  - Predefined list: Математика, Алгебра, Геометрия, Русский язык, Физика, Химия, Биология, История, Обществознание, Английский язык, Литература, География, Информатика, Окружающий мир
  - Last item: `+ Свой предмет...` — allows any text
  - Search filters list, highlights matching chars
  - Bottom option: `+ Использовать "typed text"` for custom input
- **Grade** (flex:0 0 72px) — simple dropdown 1-11
  - Label: `КЛАСС` (9px uppercase)
  - Value: number + `▾`

**Bottom row**:
- **Topic** (flex:1) — text input
  - Placeholder: `Тема: Сложение двузначных чисел`
  - No explicit label (placeholder serves as label)
- **Submit button** (right-aligned inside the bar)
  - `padding: 8px 16px`, `border-radius: 10px`, `background: #8C52FF`
  - Content: `✦ Создать ⚡{cost}` (desktop) or `✦ ⚡{cost}` (mobile)
  - Loading state: spinner replaces sparkle icon

### 2. Mode Selector (pills)

Replaces current 4-chip row. Only 2 options:
- **Задания** (worksheet)
- **Презентация** (presentation)

Container: `background: #f8f5ff`, `border-radius: 10px`, `padding: 2px`
Active pill: `background: #8C52FF`, `color: white`, `border-radius: 8px`
Inactive: `color: #8C52FF`, no background

### 3. Generations Counter

Same as current but with updated styling:
- Container: `background: #f8f5ff`, `border: 1px solid #ede9fe`, `border-radius: 8px`
- `⚡ {count}` in `#7c3aed`
- `+` button: 24x24px square, same style, opens SubscriptionPlansModal

### 4. Advanced Settings Toggle

Pill button centered below the input bar:
- `border: 1.5px solid #8C52FF`, `border-radius: 20px`, `padding: 7px 18px`
- Icon: filter/slider SVG (3 horizontal lines with circles)
- Text: "Параметры задания" (worksheet) / "Параметры презентации" (presentation)
- Chevron: `▾` rotates 180deg when expanded
- Expanded state: `background: #f8f5ff`

### 5. Worksheet Settings Panel

No container card — just clean fields directly on white background.

**Row 1** (3 dropdowns in a row, `gap: 16px`):
- Количество заданий: dropdown (5, 10, 15 — mapped from current FORMATS variants)
- Сложность: dropdown (Базовый, Средний, Повышенный)
- Формат: dropdown (Тест + задания, Только тест, Только задания)

**Row 2** — Типы заданий: toggle chips
- Selected: `background: #f3f0ff`, `color: #7c3aed`, `border: 1px solid #e8deff`
- Unselected: `background: white`, `color: #94a3b8`, `border: 1px solid #e2e8f0`
- At least 1 must remain selected
- Visibility controlled by format (test types only when format has test questions, open types only when format has open tasks)

**Row 3** — Пожелания (необязательно): text input
- `border: 1px solid #e2e8f0`, `border-radius: 10px`
- Placeholder: `Например: больше задач на логику`

### 6. Presentation Settings Panel

**Row 1** (2 dropdowns, `gap: 16px`):
- Стиль оформления (flex:2): Профессиональный, Для детей, Школьный
- Кол-во слайдов (flex:1): 12, 18, 24

**Row 2** — Пожелания: same as worksheet

### 7. Example Cards

3 cards in a horizontal row (desktop) / vertical stack (mobile):
- `border: 1px solid #f1f0f9`, `border-radius: 10px`, `padding: 10px 12px`
- Top line: subject + grade (10px, `#a5a0c0`)
- Bottom line: topic (12px, `#475569`, `font-weight: 500`)
- Click fills subject + grade + topic into the form fields (not free-text prompt)

---

## Data Flow

### Prompt Assembly

The frontend assembles a prompt string from structured fields before sending to backend:

```typescript
// In formValuesToPayload():
const prompt = `${subject} ${grade} класс, ${topic}${preferences ? '. ' + preferences : ''}`
```

The backend receives the same `prompt` field as before — **no backend changes needed**.

### Form → Payload Mapping

**Worksheet:**
```typescript
{
  prompt: assembled string,
  folderId: from folder selector (in advanced settings or hidden),
  taskTypes: from chips,
  difficulty: from dropdown,
  format: from dropdown,
  variantIndex: computed from task count + format
}
```

**Presentation:**
```typescript
{
  prompt: assembled string,
  themeType: 'preset',
  themePreset: from dropdown,
  slideCount: from dropdown
}
```

### Task Count ↔ Variant Mapping

Current system uses `format` + `variantIndex` to determine task count. The new "Количество заданий" dropdown maps back:

| Format | Count options | variantIndex mapping |
|--------|-------------|---------------------|
| test_and_open | 15 (5+10), 25 (10+15), 35 (15+20) | 0, 1, 2 |
| test_only | 10, 15, 20 | 0, 1, 2 |
| open_only | 5, 10, 15 | 0, 1, 2 |

Dropdown label shows total task count. When format changes, count options update.

---

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#8C52FF` | Active pills, submit button, selected chips, borders |
| Primary light | `#f8f5ff` / `#f3f0ff` | Pill backgrounds, chip selected bg |
| Primary border | `#e8deff` / `#ede9fe` | Card border, input focus |
| Text primary | `#1e293b` | Headings, filled values |
| Text secondary | `#475569` | Labels, dropdown values |
| Text muted | `#94a3b8` / `#a5a0c0` | Placeholders, micro-labels |
| Border default | `#e2e8f0` | Dropdown borders, unselected chips |
| Background | `#ffffff` | Page background (no gradient) |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/GeneratePage.tsx` | Remove purple bg gradient, remove disabled mode chips, restructure form layout, add subject/grade/topic fields, assemble prompt from fields |
| `src/components/generation/WorksheetGenerateForm.tsx` | Replace with clean dropdown rows (count, difficulty, format) + task type chips + preferences |
| `src/components/generation/PresentationGenerateForm.tsx` | Replace with dropdown rows (theme, slide count) + preferences |
| `src/constants/generation.ts` | Add SUBJECTS list for combo-box, add task count options |
| New: `src/components/ui/ComboBox.tsx` | Searchable combo-box component |

No backend changes. No API changes.

**Frontend schema change:** `GenerateFormSchema` in `constants/generation.ts` changes from `{ prompt }` to `{ subject, grade, topic, preferences? }`. The prompt is assembled in `formValuesToPayload()` before sending. `GeneratePresentationFormSchema` gets same treatment.

**Auto-generate after login:** The pending form data saved to `sessionStorage` changes shape (structured fields instead of prompt string). Old saved data is ignored gracefully.

---

## Folder Selector

For authenticated users with folders, a "Сохранить в папку" dropdown appears as the last row of the worksheet settings panel (only when expanded). Same `CustomSelect` component, same logic as current.

---

## Responsive Breakpoints

| Breakpoint | Behavior |
|-----------|----------|
| `>= 640px` (sm) | Full layout as designed, 3 example cards in row |
| `< 640px` | Submit button: icon+cost only. Settings dropdowns stack. Example cards vertical. "Параметры" shortened. |

---

## What's NOT Changing

- Header component
- Loading overlay
- Low generations warning modal
- SubscriptionPlansModal
- Error messages
- All backend logic
- All API endpoints
- Backend validation schemas (shared/worksheet.ts)
