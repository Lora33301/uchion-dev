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
5. **Multi-agent validation** (answer-verifier, task-fixer, quality-checker, unified-checker)
6. Convert to `Worksheet` format (assignments + test + answers)
7. PDF generation via Puppeteer (HTML -> PDF)
8. **AI usage tracking** -- log tokens and cost to `ai_usage` table

## Models (`api/_lib/ai-models.ts`)

| Purpose | Model | Env var |
|---------|-------|---------|
| Generation (paid) | `openai/gpt-4.1` (~0.7 rub/sheet) | `AI_MODEL_PAID` |
| Generation (free) | `deepseek/deepseek-v3.2` | `AI_MODEL_FREE` |

**Paid model selection logic** (`isPaid` in generate/presentations routes):
- Active subscription with `paidModel: true` (starter/teacher/expert) → gpt-4.1
- User bought a generation pack (`users.hasPaidAccess = true`) → gpt-4.1
- Admin role → gpt-4.1
- Otherwise → deepseek (free model)

When subscription expires, user goes back to deepseek. `hasPaidAccess` is set only for one-time generation pack purchases (NOT subscriptions), so it persists independently.
| Validation agents | `openai/gpt-4.1-mini` | `AI_MODEL_AGENTS` |
| Verifier (STEM 7-11) | `google/gemini-3-flash-preview` (reasoning: low) | `AI_MODEL_VERIFIER_STEM` |
| Verifier (humanities 7-11) | `google/gemini-2.5-flash-lite` (reasoning: off) | `AI_MODEL_VERIFIER_HUMANITIES` |
| Verifier (grades 1-6) | `openai/gpt-4.1-mini` (reasoning: off, cheap) | -- |
| Fixer (STEM 7-11) | `google/gemini-3-flash-preview` (reasoning: minimal) | -- |
| Fixer (other) | same as verifier for that tier | -- |
| Presentations | `anthropic/claude-sonnet-4.5` | `AI_MODEL_PRESENTATION` |

**Grade-tiered verification**: Grades 1-6 (all subjects) use cheap gpt-4.1-mini instead of Gemini -- basic arithmetic and grammar don't need reasoning.

**STEM subjects**: math, algebra, geometry.

**Do NOT use** reasoning models (5-10x more expensive): `openai/gpt-5-mini`, `openai/o1`, `openai/o3` -- they generate unnecessary reasoning tokens.

## Token Limits

- Generation: `max_tokens: 16000`, `temperature: 0.5`
- Agents: determined by agent type

## Provider Selection (`api/_lib/ai-provider.ts`)

- `OpenAIProvider` if: `AI_PROVIDER=polza` or `=openai` (prod) or `=neuroapi`
- `ClaudeProvider` for presentations (preferred)
- Otherwise `DummyProvider` (hardcoded response for dev)

## Validation Agents (`api/_lib/generation/validation/agents/`)

- `answer-verifier.ts` -- verifies answer correctness
- `task-fixer.ts` -- fixes incorrect tasks
- `quality-checker.ts` -- checks task quality
- `content-checker.ts` -- checks content appropriateness
- `unified-checker.ts` -- combined check
- `deterministic.ts` -- deterministic validation (counts, formats)

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
