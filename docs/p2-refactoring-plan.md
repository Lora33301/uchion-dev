# P2 Refactoring Plan — Tasks #20, #21, #23, #24

Date: 2026-04-04

## Overview

4 remaining P2 tasks, ordered from safest to most risky.
All changes on `staging` branch.

---

## Task #20: WorksheetsListPage + PresentationsListPage dedup

**Problem**: 94% code duplication (~690 lines each). Identical modals, state, mutations, pagination, folder logic.

**Strategy**: Config-driven generic ListPage

1. **Create `src/components/list-page/ListPageModals.tsx`** — extract RenameModal, MoveToFolderModal, CreateFolderModal (200 lines saved)
2. **Create `src/components/list-page/Pagination.tsx`** — identical in both files (50 lines)
3. **Create `src/hooks/useListPage.ts`** — all useState + useEffect + mutations + handlers, parameterized by `{ queryKey, fetchFn, deleteFn, updateFn }` (150 lines/file saved)
4. **Create `src/components/list-page/FolderSidebar.tsx`** — folder filter section
5. **Simplify both pages to ~100-120 lines** — only define title, icons, card renderer

**Key diffs to parameterize**:
- `queryKey`: `['worksheets', folderId]` vs `['presentations', 'list', folderId]`
- `folderCountKey`: `worksheetCount` vs `presentationCount`
- `getDisplayTitle()`: worksheets has subject+grade fallback
- Card metadata: worksheets show topic, presentations show subject+grade+slideCount
- Icons: DocumentIcon vs PresentationIcon
- Paths: `/worksheets/:id` vs `/presentations/:id`

**Expected**: 1382 -> ~450 lines (-67%). Risk: Low.

---

## Task #21: AdminPaymentsPage refactor

**Problem**: 1045 lines, 4 tabs. SearchBar 3x, StatusFilter 3x, state+handlers 3x.

**Strategy**: Extract admin shared components + hook

1. **Create `src/components/admin/SearchBar.tsx`** — from lines 257-285 (duplicated 3x)
2. **Create `src/components/admin/StatusFilterTabs.tsx`** — from lines 240-254 (duplicated 3x)
3. **Create `src/hooks/useSearchableTable.ts`** — page/search/statusFilter state + handlers + useQuery
4. **Create `src/components/admin/TableContainer.tsx`** — loading/empty/content wrapper
5. **Simplify each tab** — keep only unique columns and actions
6. **Also apply to** AdminUsersPage, AdminGenerationsPage (same patterns)

**Expected**: 1045 -> ~650 lines (-38%). Risk: Low (admin only).

---

## Task #24: Presentation generators — base class

**Problem**: 3 generators (770-865 lines each, ~2478 total). Identical: `contentElementsToRows()`, `getSectionNumber()`, main generation loop, `addWatermark()`, `addFooter()`.

**Strategy**: Abstract base class

1. **Create `api/_lib/presentations/base-slide-generator.ts`**:
   - Shared: `contentElementsToRows()` (parameterize colors/fonts via `this.COLORS`/`this.getFontSizes()`)
   - Shared: `getSectionNumber()` (byte-for-byte identical)
   - Shared: main generation loop (10 slide type switch — identical)
   - Shared: `addWatermark()`, `addFooter()`
   - Abstract: 10 slide type methods, COLORS, FONTS

2. **Refactor 3 generators** to extend base class:
   - Remove duplicated infrastructure (~142 lines each)
   - Keep: color definitions, decorative helpers, 10 slide handler implementations

3. **Update `api/_lib/presentations/generator.ts`** — use class instances

**Gotcha**: `contentElementsToRows()` has minor font size/color diffs per theme. Parameterize via base class properties (COLORS + font config).

**Expected**: 2478 -> ~1200 lines (-52%). Risk: Medium.
**Verify**: Generate presentation with each theme, compare output.

---

## Task #23: openai-provider.ts — god object

**Problem**: 940 lines. `generateWorksheet()` = 314 lines with 7+ responsibilities. JSON repair = 3-level try-catch.

**Strategy**: Extract focused modules, keep provider as orchestrator

1. **Extract `api/_lib/providers/json-repair.ts`** (~80 lines):
   - `repairTruncatedJSON(rawText)` — 3 levels: cut at boundary, close brackets, regex extraction
   - From lines 151-224. **Preserve exact behavior**.

2. **Extract `api/_lib/providers/task-retry.ts`** (~60 lines):
   - `retryMissingTasks(params)` — exponential backoff + circuit breaker
   - From lines 245-299.

3. **Extract `api/_lib/providers/worksheet-converter.ts`** (~120 lines):
   - `convertToWorksheet()` (lines 405-521) + `convertSingleTask()` (lines 526-585)

4. **Slim `generateWorksheet()` to ~80 line orchestrator**:
   - parse params -> build prompts -> call LLM -> repair JSON -> filter tasks -> retry missing -> validate -> convert

**Do NOT touch**: `regenerateTask()`, `generatePresentation()`, validation pipeline calls.

**Expected**: 940 -> ~600 lines in provider (-36%). Risk: HIGH.
**Verify**: `npm run smoke` + manual generation with `AI_PROVIDER=polza`.

---

## Execution Order

| # | Task | Risk | Hours |
|---|------|------|-------|
| 1 | #21 AdminPaymentsPage | Low (admin) | 2-3h |
| 2 | #20 Lists dedup | Low (frontend) | 3-4h |
| 3 | #24 Presentation generators | Medium | 3-4h |
| 4 | #23 openai-provider | High (core) | 2-3h |

## Verification

- `npx tsc --noEmit` after every change
- `npm run smoke` after #23, #24
- `npm run build` at the end
- Manual: check all affected pages/features render correctly
