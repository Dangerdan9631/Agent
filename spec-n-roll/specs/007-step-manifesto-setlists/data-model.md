# Data Model: Step Manifestos and Set Lists

## Set List

A named, configurable workflow-selection entry used for agent triage.

**Location**: `.spec-n-roll/config/set-lists.json` → `setLists[]`

**Fields**:

- `id` (required, kebab-case): Stable identifier; unique within file.
- `name` (required, string): Human-readable label shown in Ink and CLI.
- `description` (required, string): Short triage text returned to agents as invocation instructions (FR-023).
- `workflowId` (required, kebab-case): References `workflows[].id` in `workflow.config.json`.
- `priority` (required, positive integer): Lower number wins ambiguous triage (FR-025).
- `enabled` (required, boolean): Disabled lists excluded from triage (FR-024).

**Validation Rules**:

- `id` MUST be unique among set lists.
- `workflowId` MUST resolve to an existing workflow in `workflow.config.json`.
- At least one enabled set list MUST exist for triage to succeed (FR-025 edge case).
- Duplicate priorities allowed; tie-break uses lowest `priority` when agent cannot decide.

**State Transitions**: N/A (configuration entity). `enabled` toggled via enable/disable commands.

## Set Lists File

Container for all set lists in a project.

**Location**: `.spec-n-roll/config/set-lists.json`

**Fields**:

- `schemaVersion` (required, positive integer): `1` for initial release.
- `setLists` (required, array): Non-empty after init; may be empty only during failed partial writes (invalid).

**Validation Rules**:

- Written atomically on create/update.
- Fresh init seeds `papercut`, `quick`, `full` as ordinary entries with distinct priorities — no special-case code paths.

## Spec Manifesto

Curated rules guiding agent behavior at step execution time.

**Locations**:

- Global: `.spec-n-roll/config/manifesto/global.md`
- Step-specific: `.spec-n-roll/config/manifesto/steps/{stepId}.md`

**Fields** (file content, markdown):

- Body text with optional sync-impact HTML comment header (mirrors constitution pattern).
- `scope` (implicit from path): `global` | `step`
- `stepId` (step scope only): MUST match active workflow step id for loading (FR-005).

**Validation Rules**:

- Non-empty body required before save (FR-018).
- Unresolved `[PLACEHOLDER]` tokens block save.
- Step manifesto for unknown step name remains on disk but is not loaded until a matching step is active.
- Global empty → init reports no global rules defined; continues (edge case).

## Step Hook Instruction

Normalized agent-facing hook call payload.

**Fields**:

- `phase` (required, enum): `before` | `after`
- `command` (required, string): Slash command or extension command name (e.g. `speckit-git-commit`).
- `description` (required, string): Human-readable purpose.
- `optional` (required, boolean): Whether agent may skip after prompt.
- `prompt` (optional, string): Shown for optional hooks.
- `mandatory` (derived): `!optional` — response MUST state mandatory hooks clearly (FR hook acceptance).
- `source` (required, enum): `specify-extensions-yml` | `workflow-extension-manifest`
- `extension` (optional, string): Extension id when applicable.

**Validation Rules**:

- `before` hooks appear only in step init results; `after` only in finalize (SC-004).
- Disabled hooks (`enabled: false`) omitted.
- Unavailable command references included with `available: false` diagnostic (edge case).

## Step Lifecycle Session

Per-step-attempt execution state stored in workflow state.

**Location**: `specs/{taskSpecId}-{slug}/workflow-state.json` → `lifecycle` object

**Fields**:

- `activeStepId` (required when in progress): Current step id for this attempt.
- `initAt` (optional, ISO 8601): Timestamp when init succeeded for `activeStepId`.
- `validatedAt` (optional, ISO 8601): When agent reported validation success (finalize input).
- `finalizedAt` (optional, ISO 8601): When finalize recorded completion.
- `status` (required, enum): `pending-init` | `in-progress` | `validated` | `completed`

**Validation Rules**:

- Finalize MUST reject if `initAt` missing or `activeStepId` mismatch (FR-010).
- Second finalize for same completed step returns current state without re-writing completion (idempotent).
- Completion of step (`lastCompletedStepId` update) MUST NOT occur without successful finalize (FR-009).

## Step Init Result

Ephemeral response packet from `runStepInit`.

**Fields**:

- `taskSpecId`, `slug`, `stepId` (required): Active step identity.
- `setListId` (optional): Selected set list for current spec context.
- `workflowState` (required, object): Current metadata snapshot.
- `manifestos` (required, array): `{ scope, stepId?, content, path }` labeled entries.
- `beforeHooks` (required, array): `StepHookInstruction[]`
- `diagnostics` (optional, array): Non-blocking warnings (invalid hook config, missing commands).
- `blocking` (required, boolean): true when step cannot proceed (unknown active step).

## Step Finalize Result

Ephemeral response packet from `runStepFinalize`.

**Fields**:

- `taskSpecId`, `slug`, `stepId` (required)
- `validationStatus` (required, enum): `passed` | `failed`
- `afterHooks` (required, array): `StepHookInstruction[]`
- `completionEligible` (required, boolean): Whether step may be marked complete after hooks.
- `workflowState` (required, object): Updated state including lifecycle and `lastCompletedStepId` when eligible.
- `alreadyFinalized` (optional, boolean): true on idempotent second call.

## Agent Skill Metadata

Frontmatter on Spec-n-Roll-managed skills.

**Fields**:

- `metadata.author` (required): `spec-n-roll`
- `metadata.version` (required): Toolkit semver at generation time

**Validation Rules**:

- Applied only to skills in managed manifest (`spec-n-*`, generated workflow skills).
- User-authored skills outside manifest MUST NOT be modified (FR-035).

## Relationships

```text
SetList.workflowId ──► Workflow (workflow.config.json)
Step Init ──loads──► Global Manifesto + matching Step Manifesto
Step Init ──collects──► before Hooks (YAML + extension manifest)
Step Finalize ──collects──► after Hooks
Step Finalize ──updates──► Step Lifecycle Session ──► WorkflowState
Triage input ──evaluates──► enabled SetLists (by description + priority)
```

## Migration Artifacts

**Legacy workflow variant selection**: `workflow-state.json.workflowVariantId` may store workflow id from pre-set-list era; migration generates `set-lists.json` from `workflow.config.json` workflows on first read if missing.

**Terminology**: User-facing "complexity" / "workflow variant" → "set list"; persisted internal ids may remain until major schema bump.
