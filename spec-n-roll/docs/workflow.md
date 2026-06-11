# Workflow

spec-n-roll drives specification-driven development through agent slash commands and deterministic MCP/CLI mutations. This document reflects **Phase 5 (US3)** shipped behavior for specify, triage, and clarify.

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

## TODO: Not yet implemented

| Area | Phase |
| ---- | ----- |
| `/spec-n-roll` meta-command advancement | US4 |
| `/spec-n-plan`, `/spec-n-tasks` step handlers | US4 |
| `/spec-n-analyze` cross-artifact report | US4 |
| `/spec-n-implement` and TDD entry | US5–US7 |
| Active → Complete → Locked lifecycle enforcement in engine | US6 |
| Multi-spec numbered-list task selection prompts | US4 |
