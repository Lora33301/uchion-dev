# AI Generation System

## Overview

Worksheet generation is fully config-driven (`api/_lib/generation/`).

## Subject Configuration (`api/_lib/generation/config/subjects/`)

Each subject has a directory with files:
- `index.ts` -- main config
- `prompt.ts` -- system prompt
- `grade-tiers.ts` -- topics by grade (from FGOS curriculum)
- `difficulty.ts` -- difficulty settings

Grade ranges: math: 1-6, algebra: 7-11, geometry: 7-11, russian: 1-11.

## Task Types (`api/_lib/generation/config/task-types.ts`)

5 types with Zod validation:
- `single_choice` -- single answer (3-5 options)
- `multiple_choice` -- multiple answers (5 options, 2-3 correct)
- `open_question` -- short text answer
- `matching` -- match two columns (3-6 pairs)
- `fill_blank` -- fill gaps (1-4 blanks)

## Worksheet Formats (`api/_lib/generation/config/worksheet-formats.ts`)

- `open_only` -- assignments only (5/10/15)
- `test_only` -- test only (10/15/20 questions)
- `test_and_open` -- test + assignments (default: 5 assignments + 10 tests)

Each format has 3 variants (basic / pro / pro+), costing 1/2/3 generations.

## Generation Flow (`api/_lib/ai-provider.ts`)

1. Build prompts from subject config + user parameters
2. LLM generates JSON with `tasks` array (each task has a type)
3. Tasks split into test (single/multiple_choice) and open (rest)
4. If not enough tasks -- **retry** (generate missing ones)
5. **Multi-agent validation** (3 agents in parallel + task-fixer, see below)
6. Convert to `Worksheet` format (assignments + test + answers)
7. PDF generation via Puppeteer (HTML -> PDF)
8. **AI usage tracking** -- log tokens and cost to `ai_usage` table

## Models (`api/_lib/ai-models.ts`)

| Purpose | Model | Env var |
|---------|-------|---------|
| Generation (paid) | `openai/gpt-4.1` (~0.7 rub/sheet) | `AI_MODEL_PAID` |
| Generation (free) | `openai/gpt-4.1` | `AI_MODEL_FREE` |

**Paid model selection logic** (`isPaid` in generate/presentations routes):
- Active subscription with `paidModel: true` (starter/teacher/expert) → gpt-4.1
- User bought a generation pack (`users.hasPaidAccess = true`) → gpt-4.1
- Admin role → gpt-4.1
- Otherwise → gpt-4.1 (free model, same as paid)

When subscription expires, user goes back to free model. `hasPaidAccess` is set only for one-time generation pack purchases (NOT subscriptions), so it persists independently.
| Validation agents (unified-checker, difficulty-checker) | `openai/gpt-4.1-mini` | `AI_MODEL_AGENTS` |
| Verifier (reasoning subjects) | `google/gemini-3-flash-preview` (reasoning: low) | `AI_MODEL_VERIFIER_STEM` |
| Verifier (humanities/language) | `google/gemini-2.5-flash-lite` (reasoning: off) | `AI_MODEL_VERIFIER_HUMANITIES` |
| Fixer (reasoning subjects) | `google/gemini-3-flash-preview` (reasoning: minimal) | -- |
| Fixer (humanities/language) | same as verifier (flash-lite, no reasoning) | -- |
| Presentations | `anthropic/claude-sonnet-4.5` | `AI_MODEL_PRESENTATION` |

**Subject classification for verification:**
- **Reasoning subjects** (STEM + natural science + unknown): math, algebra, geometry, physics, chemistry, biology, informatics, geography, and any unknown subject → gemini-3-flash with reasoning
- **Lightweight subjects** (humanities/language): russian, literature, history, social_studies, english, music, obzh → gemini-2.5-flash-lite + confirmation gate

**STEM subjects** (for `isStemSubject()`): math, algebra, geometry — kept for backward compat.

Unknown/new subjects default to reasoning model (safer — better to over-verify than miss errors).

**Do NOT use** reasoning models (5-10x more expensive): `openai/gpt-5-mini`, `openai/o1`, `openai/o3` -- they generate unnecessary reasoning tokens.

## Token Limits

- Generation: `max_tokens: 16000`, `temperature: 0.5`
- Agents: determined by agent type

## Provider Selection (`api/_lib/ai-provider.ts`)

- `OpenAIProvider` if: `AI_PROVIDER=polza` or `=openai` (prod) or `=neuroapi`
- `ClaudeProvider` for presentations (preferred)
- Otherwise `DummyProvider` (hardcoded response for dev)

## Validation Agents (`api/_lib/generation/validation/agents/`)

### Architecture

3 validation agents run **in parallel** via `Promise.all`, then task-fixer runs sequentially for errors:

```
┌─────────────────────┐  ┌──────────────────────┐  ┌─────────────────────┐
│   answer-verifier   │  │   unified-checker    │  │  difficulty-checker  │
│  (Gemini verifier)  │  │  (gpt-4.1-mini)      │  │  (gpt-4.1-mini)     │
│                     │  │                      │  │                     │
│ Solves each task,   │  │ Checks formulations, │  │ Checks difficulty   │
│ verifies answers,   │  │ distractors, topics, │  │ matches requested   │
│ checks distractors  │  │ grade level          │  │ level               │
└────────┬────────────┘  └──────────┬───────────┘  └──────────┬──────────┘
         │ errors                   │ errors                  │ warnings only
         └──────────┬───────────────┘                         │
                    ▼                                         ▼
            ┌──────────────┐                          (logged for analytics,
            │  task-fixer  │                           NOT sent to fixer)
            │ (Gemini)     │
            └──────┬───────┘
                   ▼
          batch re-verification
```

### Agents

- **`answer-verifier.ts`** -- Solves each task independently and compares with the given answer. Uses Gemini (STEM: gemini-3-flash with reasoning, humanities: gemini-2.5-flash-lite). Error codes:
  - `WRONG_ANSWER` -- answer is incorrect
  - `MULTIPLE_CORRECT` -- single_choice task has multiple valid answers
  - For test tasks, checks **every option** (not just the marked correct one) to ensure distractors are unambiguously wrong

- **`unified-checker.ts`** -- Quality + content checker (replaced separate quality-checker and content-checker). Uses gpt-4.1-mini. Receives full task data **including answers**. Error codes:
  - `BAD_FORMULATION` (error) -- bad formulation, unsolvable, ambiguous distractors, multiple correct answers
  - `OFF_TOPIC` (error) -- completely off-topic or wrong grade
  - `PARTIAL_MISMATCH` (warning) -- partially out of scope, advanced terminology
  - Includes critical checks: solvability, single correct answer for single_choice, all distractors unambiguously wrong, matching uniqueness, fill_blank single answer, open_question finite answer

- **`difficulty-checker.ts`** -- Validates difficulty matches requested level. Uses gpt-4.1-mini. **Logging only** -- produces `DIFFICULTY_MISMATCH` warnings that go into `allIssues` for analytics but do NOT trigger the fixer. Runs in parallel with the other 2 agents.

- **`task-fixer.ts`** -- Fixes tasks with errors from answer-verifier and unified-checker. Uses Gemini (same model as verifier, reasoning: minimal). After fixing, runs **batch re-verification** (single verifyAnswers call for all fixed tasks). Reverts fixes that fail re-verification. Max fixes per generation: configurable via `MAX_FIXES_PER_GENERATION`.

- **`deterministic.ts`** -- Deterministic validation (counts, formats, structure)

### Fixer behavior by subject category

- **Reasoning subjects** (math, algebra, geometry, physics, chemistry, biology, informatics, geography, unknown): Fixer enabled directly, uses gemini-3-flash with reasoning:minimal.
- **Lightweight subjects** (russian, literature, history, etc.): Fixer enabled **via confirmation gate** — flash-lite flags errors, then gemini-3-flash re-verifies only flagged tasks. Only confirmed errors go to fixer. If confirmation gate API fails, all flagged errors proceed to fixer (safe fallback). Re-verification after fix also uses gemini-3-flash.

### Legacy files (not used in orchestrator)

- `quality-checker.ts` -- replaced by unified-checker
- `content-checker.ts` -- replaced by unified-checker

## Key Files

- `api/_lib/ai-provider.ts` -- AI provider orchestrator, convertToWorksheet
- `api/_lib/ai-models.ts` -- model selection (per subject, per tier, per grade)
- `api/_lib/ai-usage.ts` -- token + cost tracking
- `api/_lib/generation/prompts.ts` -- prompt builder
- `api/_lib/generation/sanitize.ts` -- content sanitization
- `api/_lib/generation/config/task-types.ts` -- task type definitions
- `api/_lib/generation/config/worksheet-formats.ts` -- format definitions
- `api/_lib/providers/openai-provider.ts` -- OpenAI/polza provider
- `api/_lib/providers/claude-provider.ts` -- Claude provider
- `api/_lib/providers/dummy-provider.ts` -- dummy for dev
