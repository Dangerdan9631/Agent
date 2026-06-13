# Data Model: Interactive Ink CLI Application

This model extends the base toolkit entities in `specs/001-spec-n-roll-toolkit/data-model.md` with interactive-session and read-model types. It does not introduce new on-disk schemas.

## Interactive Session

A running terminal UI bound to one resolved project root.

**Fields**:

- `projectRoot`: Absolute path to the working project directory
- `isInitialized`: Whether `workflow.config.json` exists and parses
- `navigationStack`: Ordered list of `RouteId` values representing current drill-down path
- `selectedTaskSpec`: Optional `TaskSpecIdentity` set when a spec is targeted for detail or mutation flows
- `binaryContext`: `local` | `global` — from the actually running full CLI binary
- `localBinaryPath`: Absolute path when operating against a project-local full CLI (nullable)

**Validation**:

- `projectRoot` defaults to `process.cwd()` at launch; not user-editable in v1
- When `isInitialized` is false, only setup/maintenance routes and init flow are fully enabled; browse sections show guided empty states (SC-005)
- `navigationStack` always includes at least `main-menu` as the root; back pops one level; quit clears the Ink render
- Session state is in-memory only — no session persistence file

## RouteId

Discriminated union identifying interactive screens.

**Values**:

- `main-menu`
- `specs-list`, `spec-detail`, `spec-mutations`
- `workflows-list`, `workflow-detail`
- `agents-list`, `agent-add`, `agent-remove`
- `project-metadata-view`, `project-metadata-edit`
- `setup-menu`, `setup-init`, `setup-version`, `setup-update`, `setup-step-instantiate`, `setup-frontmatter-update`

**Validation**:

- Transitions are push/pop on `navigationStack`; destructive mutation screens require a `selectedTaskSpec` or explicit project scope
- `setup-*` routes may run when uninitialized only where the underlying CLI operation allows (`setup-init`)

## Task Spec Summary

Read model for list and detail display.

**Fields**:

- `taskSpecId`: Zero-padded numeric id from directory name
- `slug`: Kebab-case slug from directory name
- `directoryName`: Full `specs/` child directory basename
- `lifecycleStatus`: `Active` | `Complete` | `Locked` | `unknown` — from `spec.md` frontmatter when readable
- `operationalStatus`: `active` | `paused` | `complete` | `missing` — from `workflow-state.json` when present
- `currentStepId`: Current in-progress step id (nullable)
- `lastCompletedStepId`: Last completed step id (nullable)
- `workflowVariantId`: Tier variant id when workflow state exists (nullable)
- `artifacts`: Object with boolean `spec`, `plan`, `tasks` for file presence
- `warnings`: String array — e.g. state/artifact mismatch, unreadable frontmatter
- `unrecognized`: Boolean — true when directory name fails `{numeric-id}-{slug}` pattern

**Validation**:

- Built by `assembleTaskSpecSummary(projectRoot, directoryEntry)` without writing files
- Unrecognized directories use `unrecognized: true` and appear in a separate list section with warning styling
- Missing `spec.md` yields `lifecycleStatus: unknown` and a warning — does not throw

## Workflow Variant Summary

Read model for configured workflow tiers.

**Fields**:

- `variantId`: Workflow variant key from `workflow.config.json`
- `displayName`: Human-readable label when configured (fallback to id)
- `stepSequence`: Ordered array of step ids (e.g. `specify`, `plan`, `tasks`, `implement`)
- `stepLabels`: Map of step id → display label for human-readable summary string

**Validation**:

- Sourced only from parsed `workflow.config.json`; empty when project uninitialized
- Step sequence rendered as joined summary for list rows (FR-006)

## Agent Summary

Read model for agents section.

**Fields**:

- `agentId`: Bundled extension id
- `displayName`: From extension manifest
- `isConfigured`: Whether id appears in `workflow.config.json` agents with `enabled: true`
- `isEnabled`: Same as `isConfigured` for v1 (future: configured but disabled)

**Validation**:

- `list agents` equivalent: all agents when showing available
- Filter `isConfigured` when showing project agents only (FR-007, `list agents --enabled`)

## Project Metadata View

Read model for project section.

**Fields**:

- `nextTaskSpecId`: Counter from `project-metadata.json`
- `currentTaskSpecId`: Current implementation task id (nullable)
- `currentTaskSlug`: Resolved slug when id set (nullable)
- `implementationStartedAt`: ISO timestamp (nullable)
- `raw`: Parsed metadata object for edit forms

**Validation**:

- Read via `readProjectMetadata`; write via `writeProjectMetadata` only from edit screen after confirmation
- Read-only view route must not call write APIs (FR-013)

## CLI Operation Binding

Maps one interactive flow to one non-interactive contract.

**Fields**:

- `operationId`: Stable key (e.g. `task.status.set`)
- `cliContract`: Reference to `specs/001-spec-n-roll-toolkit/contracts/cli-commands.md` section
- `orchestrator`: Function reference — `run*` from commands or core export
- `requiresInitialized`: Boolean
- `requiresTaskSpec`: Boolean
- `requiresConfirmation`: Boolean
- `inkPromptModule`: Optional path to reused prompt (e.g. `update-prompts.tsx`)

**Validation**:

- Full mapping enumerated in `contracts/cli-operation-map.md` (FR-008)
- Interactive flow must gather all required inputs before invoking orchestrator — no silent defaults for task spec selection when multiple Active exist (FR-011)

## Navigation Stack Entry

Lightweight history item for breadcrumbs.

**Fields**:

- `routeId`: `RouteId`
- `title`: Short label for breadcrumb/status display
- `contextLabel`: Optional secondary label (e.g. selected spec `001-feature`)

**Validation**:

- Pushed when entering a child route; popped on back
- Breadcrumb renders `navigationStack` titles joined by ` › `

## Error Presentation

In-context error surface for recoverable failures.

**Fields**:

- `message`: User-facing error text
- `remediation`: Optional next-step guidance (mirrors `CoreMutationError` remediation when available)
- `recoverable`: Boolean — when true, session continues after dismissal

**Validation**:

- Unrecoverable startup failures (e.g. cannot render Ink) exit process with stderr message
- Recoverable errors render inline on the current screen; `esc` returns to parent route (FR-014)

## State Transitions

### Session lifecycle

```text
launch → resolve projectRoot → detect initialized
  → render main-menu (initialized or guided uninitialized)
  → user navigates / mutates / quits
  → unmount Ink → exit 0 (or non-zero on unrecoverable error)
```

### Task spec selection (when multiple Active)

```text
mutation requires task spec → count Active specs
  → 0: show error + remediation
  → 1: auto-select
  → 2+: NumberedSelectionPrompt → selectedTaskSpec set → continue mutation flow
```

### Destructive operation

```text
user initiates destructive action → confirmation screen (reuse update/remove patterns)
  → confirmed → invoke orchestrator → success toast / error inline
  → cancelled → pop to parent without writes
```
