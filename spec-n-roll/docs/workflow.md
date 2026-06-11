# Workflow

spec-n-roll drives specification-driven development through agent slash commands and deterministic MCP/CLI mutations. This document reflects **Phase 6 (US4)** shipped behavior for roll advancement, plan/tasks tier steps, analyze, and FR-009 living-spec-first tasks rules (plus Phase 5 specify/triage/clarify).

Toolkit docs live in the repository root `docs/` only — they are not installed into user projects.

## Task specs

Each workflow run creates a directory at `specs/{numeric-id}-{slug}/` containing at minimum:

- `spec.md` — task-focused specification (YAML frontmatter + prose body)
- `workflow-state.json` — operational progress (variant, last completed step, status)

Numeric ids are allocated from `.spec-n-roll/config/project-metadata.json` → `nextTaskSpecId`. Slugs are required; the toolkit derives kebab-case slugs from the feature description when omitted.

## Embedded triage (within specify)

Triage is **not** a separate workflow step. It runs at the start of `/spec-n-specify` before the interview.

Built-in heuristics (implementation: `src/specs/triage.ts`):

| Signal | Proposed tier | Tail steps |
| ------ | ------------- | ---------- |
| Single-file fix, copy, typo, trivial patch | `papercut` | specify → implement |
| New behavior without architecture change | `quick` | specify → tasks → implement |
| Cross-cutting, subsystem, multi-actor, architectural | `full` | specify → plan → tasks → implement |

The toolkit presents the matched tier with rationale. The developer confirms or overrides. When the description is empty or too ambiguous, all tiers are presented for manual selection with `defaultWorkflowId` from `workflow.config.json` pre-selected (default: `quick`).

`workflowVariantId` is persisted to `workflow-state.json` via the core library **before** the specify interview proceeds.

## /spec-n-specify

**Command**: `/spec-n-specify <description>`

**Orchestration**: `src/specs/specify.ts`

1. Allocate `taskSpecId` and derive `slug`
2. Run embedded triage; confirm tier
3. Write initial `workflow-state.json` with `workflowVariantId` and `currentStepId: specify`
4. **Instantiate** `spec.md` from the toolkit template via MCP `step_output_instantiate` (or CLI `spec-n-roll step instantiate`) **before** prose edits
5. Set `status: Active` via MCP `task_spec_status_set` (not direct frontmatter edits)
6. Conduct a one-question-at-a-time interview (`src/specs/interview.ts`) with recommended answers; explore the repo before asking
7. Edit `spec.md` prose directly; remove `<!-- FILL:` placeholders
8. Run spec quality checks (`src/specs/quality.ts`)
9. Write `workflow-state.json` with `lastCompletedStepId: specify`

Agent skill: `.agents/skills/spec-n-specify/SKILL.md` (generated at `init`).

## /spec-n-clarify

**Command**: `/spec-n-clarify [topic]`

**Orchestration**: `src/specs/clarify.ts`

Follow-up interview for an **existing** task spec — separate from the initial specify session.

- When new un-implemented requirements are added to a **Complete** spec, `status` reverts to **Active** via MCP `task_spec_status_set`
- One question at a time with recommended answers
- Clarifications appended to `spec.md` prose (not frontmatter)

Agent skill: `.agents/skills/spec-n-clarify/SKILL.md` (generated at `init`).

## MCP / CLI mutation boundaries

| Artifact | MCP / CLI required | Agent direct edit |
| -------- | ------------------ | ----------------- |
| `workflow-state.json` | Yes | No |
| `spec.md` frontmatter (`status`) | Yes | No |
| `spec.md` prose (after instantiate) | No | Yes |
| `project-metadata.json` | Yes | No |
| `living-specs/*.feature` | N/A | Yes (agent-managed) |

Step output templates (`spec.md`, `plan.md`, `tasks.md`) must be instantiated via MCP/CLI before prose edits.

## Spec quality checks

`src/specs/quality.ts` validates after specify/clarify:

- No unresolved `<!-- FILL:` placeholder markers in `spec.md`
- Critical interview questions resolved
- Non-empty spec body

## /spec-n-roll

**Command**: `/spec-n-roll [description]`

**Orchestration**: `src/workflow/engine.ts`

Zero-knowledge meta-command that detects intent and advances the next **tier** step automatically.

### Intent detection

| Input | Behavior |
| ----- | -------- |
| Description argument | Route to `/spec-n-specify` with that description |
| No description, zero Active specs, nothing resumable | Prompt for a feature description |
| No description, multiple Active specs | Numbered task-selection list (no silent default) |
| No description, paused/incomplete non-Active specs | "New or continue?" prompt |
| No description, exactly one Active spec | Advance that spec |

### Advancement

1. Read `workflow-state.json` via core (`workflow_state_read` / `workflow_state_write`)
2. Resolve next step from variant step list (`papercut`: specify → implement; `quick`: specify → tasks → implement; `full`: specify → plan → tasks → implement)
3. Skip on-demand `clarify` and `analyze` unless explicitly invoked
4. When state is missing, fall back to tier-aware artifact detection (`src/workflow/artifacts.ts`)
5. When parseable state conflicts with artifacts, **state wins** after a single confirmation prompt
6. When partial artifacts exist for the next step (per `src/workflow/step-manifest.ts`), present one three-choice Ink prompt (`src/cli/ink/partial-recovery-prompt.tsx`): **restart** (overwrite partials), **cancel** (leave artifacts, `status: paused`), **force-clean** (delete partials then restart)

Agent skill: `.agents/skills/spec-n-roll/SKILL.md` (generated at `init`).

## /spec-n-plan

**Command**: `/spec-n-plan`

**Orchestration**: `src/specs/plan.ts`

Full-tier step only (omitted on papercut/quick).

1. Instantiate `plan.md` via MCP `step_output_instantiate` **before** prose edits
2. Fill sections including **Living Spec Targets** (FR-008)
3. Write `workflow-state.json` with `lastCompletedStepId: plan`

Agent skill: `.agents/skills/spec-n-plan/SKILL.md`

## /spec-n-tasks

**Command**: `/spec-n-tasks`

**Orchestration**: `src/specs/tasks.ts`

Quick and full tiers (omitted on papercut).

1. Instantiate `tasks.md` via MCP `step_output_instantiate` **before** prose edits
2. **FR-009**: keep "Living Specification Updates" as the first implementation phase before test/code tasks (enforced in template and handler)
3. Write `workflow-state.json` with `lastCompletedStepId: tasks`

Agent skill: `.agents/skills/spec-n-tasks/SKILL.md`

## /spec-n-analyze

**Command**: `/spec-n-analyze`

**Orchestration**: `src/specs/quality.ts` → `runCrossArtifactAnalysis`

On-demand step (not in default tier advancement). Produces a **non-destructive** report of gaps, placeholder failures, FR-009 ordering issues, and state/artifact mismatches across `spec.md`, `plan.md`, `tasks.md`, and optionally `living-specs/`.

Agent skill: `.agents/skills/spec-n-analyze/SKILL.md`

## FR-009 living-spec-first tasks

The toolkit `tasks.md` template (`src/templates/tasks.md`) and `/spec-n-tasks` handler require:

- **Phase 1: Living Specification Updates** before any test or production code tasks
- Living-spec targets documented in `plan.md` (Living Spec Targets section) for full tier

Living spec file edits remain agent-managed under `living-specs/` (outside MCP/CLI).

## TODO: Not yet implemented

| Area | Phase |
| ---- | ----- |
| `/spec-n-implement` TDD entry and living-spec automation | US5–US7 |
| Active → Complete → Locked lifecycle enforcement in engine | US6 |
| Extension step replacement and custom workflow hooks | US8 |
