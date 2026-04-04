# P2 Refactoring Plan — Tasks #20, #21, #23, #24

Date: 2026-04-04

## Overview

4 remaining P2 tasks, ordered from safest to most risky.
All changes on `staging` branch.

---

## ~~Task #20: WorksheetsListPage + PresentationsListPage dedup~~ DONE 04.04.2026

**Problem**: 94% code duplication (~690 lines each). Identical modals, state, mutations, pagination, folder logic.

**Strategy**: Config-driven generic ListPage

**Result**: Extracted `useListPage` hook + 5 shared components (`RenameModal`, `MoveToFolderModal`, `CreateFolderModal`, `ListPagePagination`, `FolderFilter`). Pages reduced from ~690 to ~210 lines each. 1382 -> 1009 lines total (-27%), 0 duplication.

---

## ~~Task #21: AdminPaymentsPage refactor~~ DONE 04.04.2026

**Problem**: 1045 lines, 4 tabs. SearchBar 3x, StatusFilter 3x, state+handlers 3x.

**Strategy**: Extract admin shared components + hook

**Result**: `AdminSearchBar`, `AdminStatusTabs`, `AdminPagination` components + `useSearchableTable` hook. 1045 -> 640 lines (-39%). Shared components ready for AdminUsersPage/AdminGenerationsPage.

---

## ~~Task #24: Presentation generators — base class~~ DONE 05.04.2026

**Problem**: 3 generators (770-865 lines each, ~2478 total). Identical: `contentElementsToRows()`, `getSectionNumber()`, main generation loop, `addWatermark()`, `addFooter()`.

**Strategy**: Abstract base class

**Result**: `BaseSlideGenerator` base class (212 lines) with shared `generate()` loop, `contentElementsToRows()` (parameterized via `contentFontSizes`/`contentSpacing`/color properties), `getSectionNumber()`, `addWatermark()`, `addFooter()`. 10 abstract slide-type methods. 3 subclasses: `MinimalismSlideGenerator`, `KidsSlideGenerator`, `SchoolSlideGenerator`. `generator.ts` uses class instances. 2478 -> 2213 lines (-11%), 0 duplicated infrastructure.

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
