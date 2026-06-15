# Workflow

spec-n-roll drives specification-driven development through agent slash commands and deterministic MCP/CLI mutations. This document reflects shipped behavior including **set list triage**, **step init/finalize** boundaries, **Spec Manifestos**, task-spec lifecycle, living specs, TDD implement, and extension hooks.

Toolkit docs live in the repository root `docs/` only — they are not installed into user projects.

## Task specs

Each workflow run creates a directory at `specs/{numeric-id}-{slug}/` containing at minimum:

- `spec.md` — task-focused specification (YAML frontmatter + prose body)
- `workflow-state.json` — operational progress (selected workflow id, last completed step, status, optional step lifecycle metadata)

Numeric ids are allocated from `.spec-n-roll/config/project-metadata.json` → `nextTaskSpecId`. Slugs are required; the toolkit derives kebab-case slugs from the feature description when omitted.

Project configuration also includes:

- `.spec-n-roll/config/set-lists.json` — named set lists for triage (description, workflow reference, priority, enabled)
- `.spec-n-roll/config/manifesto/global.md` — global Spec Manifesto (optional)
- `.spec-n-roll/config/manifesto/steps/{stepId}.md` — per-step manifestos (optional)

### Lifecycle status (`spec.md` frontmatter)

Task specs use a three-state lifecycle persisted in `spec.md` YAML frontmatter (`status` field). Operational workflow progress (`active` / `paused` / `complete`) remains in `workflow-state.json` as a separate concern.

| Status       | Meaning                                                                               |
| ------------ | ------------------------------------------------------------------------------------- |
| **Active**   | Open for workflow commands, clarify, and (when selected) implement                    |
| **Complete** | Final workflow step finished; still eligible for on-demand commands until locked      |
| **Locked**   | Immutable — core library and MCP/CLI reject machine-readable and guarded prose writes |

**Transitions** (implementation: `src/core/task-lifecycle.ts`, orchestration: `src/workflow/engine.ts`):

1. **Active → Complete** — `/spec-n-roll` sets `status: Complete` when the selected workflow has no remaining steps (implement finished; `lastCompletedStepId: implement`).
2. **Complete → Active** — `/spec-n-clarify` reverts when new un-implemented requirements are appended (`addsUnimplementedRequirements`, default true).
3. **Complete → Locked** — When any task spec begins a step beyond `specify` (`plan`, `tasks`, or `implement`), all **Complete** specs in the project lock. `/spec-n-specify` does **not** lock prior specs.
4. **Locked** — No further transitions; writes rejected with `TASK_SPEC_LOCKED`.

**Single implement guard** — Only one **Active** task spec may be in implement at a time. `project-metadata.json` tracks `currentTaskSpecId` / `currentTaskSlug`; starting implement on a second Active spec while another is in-flight raises `IMPLEMENT_IN_PROGRESS`. Fields clear when a workflow completes.

Write protection also flows through `src/updates/ownership.ts` (`assertUserOwnedPathWritable`) for paths under `specs/{id}-{slug}/`.

## Set list triage (within specify)

Triage is **not** a separate workflow step. It runs at the start of `/spec-n-specify` before the interview.

Set lists in `.spec-n-roll/config/set-lists.json` replace hard-coded complexity tiers. Each entry has:

| Field         | Purpose                                                              |
| ------------- | -------------------------------------------------------------------- |
| `id`          | Stable kebab-case identifier                                         |
| `name`        | Human-readable label                                                 |
| `description` | Natural-language text agents use to decide when the set list applies |
| `workflowId`  | References a workflow in `workflow.config.json`                      |
| `priority`    | Lower number wins when multiple enabled set lists remain eligible    |
| `enabled`     | Disabled entries are excluded from triage                            |

Fresh projects receive `papercut`, `quick`, and `full` as **ordinary data rows** at init. Runtime code does not branch on those names.

Built-in heuristics (`src/specs/triage.ts` → `src/setlists/triage.ts`) score the feature description against enabled set list descriptions. The toolkit presents the match with rationale. The developer confirms or overrides. When the description is empty or too ambiguous, all enabled set lists are presented for manual selection.

When no enabled set lists remain, triage is **blocking** with an actionable message.

The selected set list’s `workflowId` is persisted to `workflow-state.json` as `workflowVariantId` (field name retained for compatibility) **before** the specify interview proceeds.

Extension handlers may replace built-in triage by targeting implicit step id `triage` (highest `priority` wins). Custom handlers return a `TriageAssessment` compatible with `src/specs/triage.ts` (`proposedSetListId`, `eligibleSetLists`, `proposedWorkflowId`, etc.).

## Step lifecycle (init / finalize)

Executable workflow steps (`plan`, `tasks`, `implement`, and extension steps invoked by the engine) use deterministic boundaries:

1. **`step_init`** (MCP) / `spec-n-roll step init` (CLI) — **before** any step work
   - Returns step identity, workflow state snapshot, manifestos (global + matching step scope), and **before** hook call instructions
   - Records `lifecycle.initAt` on the task spec’s workflow state

2. **Agent work** — instantiate templates, edit prose, run validation

3. **`step_finalize`** (MCP) / `spec-n-roll step finalize` (CLI) — **after** validation succeeds, **before** completion is recorded
   - Verifies init ran for the same step
   - Returns **after** hook call instructions
   - Updates `lastCompletedStepId` only when `validationPassed: true`

Agents must not skip init, validation, finalize, or mandatory hooks. Attempts to advance `lastCompletedStepId` via `workflow_state_write` without finalize are rejected when lifecycle metadata is active.

Implementation: `src/core/step-lifecycle.ts`. Generated workflow skills (`spec-n-plan`, `spec-n-tasks`, `spec-n-implement`, etc.) instruct agents to call MCP tools in this order.

### Hook instructions

Before and after hooks are returned as **agent call instructions**, not silently auto-run on the agent path. Sources:

- `.specify/extensions.yml` (Spec Kit slash commands — read by skills and surfaced at init/finalize)
- `workflow.config.json` extension manifest hooks (`before_{stepId}` / `after_{stepId}`)

Disabled hooks are omitted. Invalid hook configuration produces non-blocking diagnostics; init/finalize still succeed. Mandatory hooks are labeled explicitly in the response payload.

CLI `runRoll` built-in step execution may still auto-dispatch extension handlers in-process for human-driven advancement; agents use the instruction payloads from init/finalize.

## Spec Manifestos

Spec Manifestos are project-scoped rules that guide agent behavior during step execution. They complement the Spec Kit **constitution** (`.specify/memory/constitution.md`), which remains project governance.

| Scope  | Path                                              | Loaded when                       |
| ------ | ------------------------------------------------- | --------------------------------- |
| Global | `.spec-n-roll/config/manifesto/global.md`         | Every `step_init`                 |
| Step   | `.spec-n-roll/config/manifesto/steps/{stepId}.md` | `step_init` when `stepId` matches |

Manifesto bodies are returned with `scope` labels in init results. When global and step rules conflict, both are returned; agents treat conflicts as blocking unless the manifesto text defines precedence.

Authoring is **not** a workflow step. Use `/spec-n-manifesto` (agent skill) for interview-driven editing of exactly one target per invocation (global or one named step). CLI `spec-n-roll manifesto show` provides read-only inspection.

## /spec-n-manifesto

**Command**: `/spec-n-manifesto` (global or `<stepId>` target)

**Orchestration**: agent skill `.agents/skills/spec-n-manifesto/SKILL.md` (generated at init)

Standalone maintenance command — no `step_init` / `step_finalize` required.

1. Optional extension hooks from `.specify/extensions.yml` when registered
2. Load existing content or template with `[PLACEHOLDER]` tokens
3. Interview maintainer with iterative feedback (mirrors `speckit-constitution` flow)
4. Validate non-empty body, unresolved placeholders, and conflicts with constitution before save
5. Write atomically to global or step manifesto path

## Embedded triage (legacy term)

User-facing copy uses **set list** instead of complexity, tier, or workflow variant. See `updates-and-migrations.md` for the terminology map and migration from older docs.

## /spec-n-specify

**Command**: `/spec-n-specify <description>`

**Orchestration**: `src/specs/specify.ts`

1. Allocate `taskSpecId` and derive `slug`
2. Run set list triage; confirm selection
3. Write initial `workflow-state.json` with `workflowVariantId` (linked workflow id) and `currentStepId: specify`
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

- When new un-implemented requirements are added to a **Complete** spec, `status` reverts to **Active** via MCP `task_spec_status_set` before the follow-up interview (`src/specs/clarify.ts`)
- One question at a time with recommended answers
- Clarifications appended to `spec.md` prose (not frontmatter)

Agent skill: `.agents/skills/spec-n-clarify/SKILL.md` (generated at `init`).

## MCP / CLI mutation boundaries

| Artifact                                | MCP / CLI required                        | Agent direct edit   |
| --------------------------------------- | ----------------------------------------- | ------------------- |
| `workflow-state.json`                   | Yes                                       | No                  |
| Step completion (`lastCompletedStepId`) | Via `step_finalize` when lifecycle active | No                  |
| `spec.md` frontmatter (`status`)        | Yes                                       | No                  |
| `spec.md` prose (after instantiate)     | No                                        | Yes                 |
| `project-metadata.json`                 | Yes                                       | No                  |
| `living-specs/*.feature`                | N/A                                       | Yes (agent-managed) |

Step output templates (`spec.md`, `plan.md`, `tasks.md`) must be instantiated via MCP/CLI before prose edits.

## Spec quality checks

`src/specs/quality.ts` validates after specify/clarify:

- No unresolved `<!-- FILL:` placeholder markers in `spec.md`
- Critical interview questions resolved
- Non-empty spec body

## /spec-n-roll

**Command**: `/spec-n-roll [description]`

**Orchestration**: `src/workflow/engine.ts`

Zero-knowledge meta-command that detects intent and advances the next workflow step automatically.

### Intent detection

| Input                                                | Behavior                                         |
| ---------------------------------------------------- | ------------------------------------------------ |
| Description argument                                 | Route to `/spec-n-specify` with that description |
| No description, zero Active specs, nothing resumable | Prompt for a feature description                 |
| No description, multiple Active specs                | Numbered task-selection list (no silent default) |
| No description, paused/incomplete non-Active specs   | "New or continue?" prompt                        |
| No description, exactly one Active spec              | Advance that spec                                |

### Advancement

1. Read `workflow-state.json` via core (`workflow_state_read` / `workflow_state_write`)
2. Resolve next step from the workflow referenced by the selected set list (`workflow.config.json` `workflows[].steps`)
3. Skip on-demand `clarify` and `analyze` unless explicitly invoked
4. When state is missing, fall back to artifact detection (`src/workflow/artifacts.ts`) using configured workflow steps
5. When parseable state conflicts with artifacts, **state wins** after a single confirmation prompt
6. When partial artifacts exist for the next step (per `src/workflow/step-manifest.ts`), present one three-choice Ink prompt (`src/cli/ink/partial-recovery-prompt.tsx`): **restart** (overwrite partials), **cancel** (leave artifacts, `status: paused`), **force-clean** (delete partials then restart)
7. Before `plan`, `tasks`, or `implement`, lock all **Complete** specs in the project
8. For built-in automatic steps (`plan`, `tasks`), run `step_init` → handler → `step_finalize` in the engine path
9. When the workflow has no remaining steps, set lifecycle **Complete** and operational workflow `status: complete`
10. Before `implement`, claim the single implement slot in `project-metadata.json` (reject concurrent Active implement)

Agent skill: `.agents/skills/spec-n-roll/SKILL.md` (generated at `init`).

## /spec-n-plan

**Command**: `/spec-n-plan`

**Orchestration**: `src/specs/plan.ts`

Full-workflow step (omitted when the selected workflow’s step list skips `plan`).

1. Call `step_init` for `plan` before work
2. Instantiate `plan.md` via MCP `step_output_instantiate` **before** prose edits
3. Fill sections including **Living Spec Targets** (FR-008)
4. Validate step output, then call `step_finalize` with `validationPassed: true`

Agent skill: `.agents/skills/spec-n-plan/SKILL.md`

## /spec-n-tasks

**Command**: `/spec-n-tasks`

**Orchestration**: `src/specs/tasks.ts`

Workflows that include a `tasks` step (omitted when the selected workflow skips `tasks`).

1. Call `step_init` for `tasks` before work
2. Instantiate `tasks.md` via MCP `step_output_instantiate` **before** prose edits
3. **FR-009**: keep "Living Specification Updates" as the first implementation phase before test/code tasks (enforced in template and handler)
4. Validate, then call `step_finalize` with `validationPassed: true`

Agent skill: `.agents/skills/spec-n-tasks/SKILL.md`

## /spec-n-analyze

**Command**: `/spec-n-analyze`

**Orchestration**: `src/specs/quality.ts` → `runCrossArtifactAnalysis`

On-demand step (not in default workflow advancement). Produces a **non-destructive** report of gaps, placeholder failures, FR-009 ordering issues, and state/artifact mismatches across `spec.md`, `plan.md`, `tasks.md`, and optionally `living-specs/`.

No `step_init` / `step_finalize` envelope — analyze is advisory, not a tier completion step.

Agent skill: `.agents/skills/spec-n-analyze/SKILL.md`

## FR-009 living-spec-first tasks

The toolkit `tasks.md` template (`src/templates/tasks.md`) and `/spec-n-tasks` handler require:

- **Phase 1: Living Specification Updates** before any test or production code tasks
- Living-spec targets documented in `plan.md` (Living Spec Targets section) when the workflow includes `plan`

Living spec file edits remain agent-managed under `living-specs/` (outside MCP/CLI).

## Living specifications (`living-specs/`)

Living specs are Cucumber Gherkin `.feature` files — one per application domain at `living-specs/{kebab-case-domain}.feature` (e.g. `living-specs/user-authentication.feature`). They are the executable behavior source of truth; step definitions live in the project's standard test location.

**Implementation**: `src/living-specs/gherkin.ts`, `src/living-specs/tags.ts`

### Domain routing

At implement entry, the toolkit infers the target domain semantically from the feature description (`inferDomainFromDescription` / `routeLivingSpecFile`). Keyword heuristics map authentication, payment, order, notification, and related phrases to canonical domain files; unmatched descriptions fall back to a kebab-case phrase derived from the description. Planned targets should still be documented in `plan.md` and `tasks.md` for developer review.

### Scenario tagging

New or modified scenarios receive additive `@spec-n-roll-{taskSpecId}` tags (`src/living-specs/tags.ts`). Prior tags — including earlier task tags and custom tags such as `@smoke` — are preserved; tags are never removed by the toolkit.

### Deprecated scenarios

When behavior is removed, deprecated scenarios are deleted from living spec files entirely. Version control history is the sole archive — no in-repo archive directory or archive tags.

### Parsing and edits

`parseFeatureFile` / `readFeatureFile` extract scenarios with tags and steps. `updateLivingSpecFile` applies additions, in-place updates by scenario name, and deprecated removals before writing the feature file.

## /spec-n-implement

**Command**: `/spec-n-implement`

**Orchestration**: `src/specs/implement.ts` → `runImplement`

Implement performs **living spec updates first** (FR-009), then drives the **TDD red-green-refactor** cycle from living spec Gherkin files before production code is accepted.

### Entry phase (`phase: entry`, default)

1. Call `step_init` for `implement` before work
2. Route to `living-specs/{domain}.feature` from the feature description (create file when absent)
3. Remove deprecated scenarios when `deprecatedScenarioNames` are supplied
4. Add or update scenarios with additive `@spec-n-roll-{taskSpecId}` tags
5. Generate stub step definitions for unmapped Gherkin steps in `tests/step-definitions/living-spec-stubs.mjs` (`src/living-specs/step-stubs.ts`; each stub marked with `// STUB: requires implementation` and throws until implemented)
6. Run Cucumber against `living-specs/**/*.feature` filtered to `@spec-n-roll-{taskSpecId}` (`src/living-specs/cucumber-runner.ts`)
7. **Red gate** — reject entry when all tagged scenarios pass before `productionCodeWritten: true` (`TddRedGateError`)
8. Set `workflow-state.json` `currentStepId: implement` via core library

Entry must leave at least one failing scenario (typically via throwing stubs) before production code.

### Follow-up phases

Re-invoke `runImplement` with explicit `phase` after the agent writes code:

| Phase      | Purpose                                 | Success criteria                                                                                                         |
| ---------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `green`    | Verify implementation                   | All tagged scenarios pass                                                                                                |
| `refactor` | Verify behavior preserved after cleanup | All tagged scenarios still pass                                                                                          |
| `complete` | Finish implement step                   | All tagged scenarios pass; call `step_finalize` with `validationPassed: true` (records `lastCompletedStepId: implement`) |

Each invocation returns `testRun` with per-scenario pass/fail tracking and a `progressMessage` for developer reporting.

### Cucumber layout

- **Feature source**: `living-specs/{domain}.feature` (no duplicate feature files under `tests/`)
- **Step definitions**: `tests/step-definitions/` (generated `.mjs` stubs plus hand-written implementations)
- **Dependency**: projects must install `@cucumber/cucumber`; when absent locally, the toolkit symlinks its own copy only for the test run (development fixtures)

`/spec-n-roll` still claims the single implement slot and returns `{ action: 'implement' }` for the agent to invoke `runImplement` with scenario payloads and phase.

Agent skill: `.agents/skills/spec-n-implement/SKILL.md`

Managed Spec-n-Roll skills include frontmatter metadata (`author: spec-n-roll`, `version: <toolkit semver>`) refreshed on `init` and `update`. User-owned skills outside the managed manifest are not overwritten.

### TODO: TDD reporting gaps

| Area                   | Notes                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| Refactor guidance      | Toolkit verifies tests stay green on `refactor` phase; detailed refactor heuristics left to agent skill prose |
| Vertical-slice picker  | No interactive slice selection UI — agent chooses behavior from `tasks.md`                                    |
| Cucumber install check | Clear error when `@cucumber/cucumber` cannot be resolved in the project                                       |

### TODO: Lifecycle nuances

| Area                        | Notes                                                                                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Clarify on Locked specs     | Rejected today; future policy for sealed-spec amendments TBD                                                                                  |
| Implement completion signal | Lifecycle **Complete** is set when `/spec-n-roll` detects no remaining workflow steps (typically after implement finalize records completion) |
