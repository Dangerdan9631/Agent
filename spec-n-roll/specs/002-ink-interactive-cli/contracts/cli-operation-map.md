# CLI Operation Map

Maps each interactive flow to exactly one non-interactive CLI subcommand contract. Interactive screens MUST call the listed orchestrator with equivalent arguments — never duplicate mutation logic.

Reference CLI contracts: `specs/001-spec-n-roll-toolkit/contracts/cli-commands.md`

## Operations

| operationId | CLI subcommand | Orchestrator / core entry | Requires init | Requires task spec | Confirmation | Reused Ink module |
|-------------|----------------|---------------------------|---------------|-------------------|--------------|-------------------|
| `init` | `init [path]` | `runInit` from `init.ts` | No | No | No | `init-prompts.tsx` when agents omitted |
| `version` | `version` | `buildVersionReport` / `printVersionReport` from `version.ts` | No | No | No | — |
| `list.agents` | `list agents` | `resolveListedAgents` from `list-agents.ts` | No | No | No | — |
| `list.agents.enabled` | `list agents --enabled` | `resolveListedAgents({ enabledOnly: true })` | Yes | No | No | — |
| `update` | `update [--dry-run]` | `runUpdate` from `update.ts` | Yes | No | Yes | `update-prompts.tsx` |
| `config.agent.add` | `config agent add <agents>` | `runConfigAgentAdd` from `config-agent-add.ts` | Yes | No | No | `add-agent-prompt.tsx` |
| `config.agent.remove` | `config agent remove <agents>` | `runConfigAgentRemove` from `config-agent-remove.ts` | Yes | No | Yes | — |
| `workflow.state.read` | `workflow state read` | `readWorkflowState` from `core/workflow-state.ts` | Yes | Yes | No | — |
| `workflow.state.write` | `workflow state write` | `writeWorkflowState` from `core/workflow-state.ts` | Yes | Yes | Yes | — |
| `task.status.set` | `task status set` | `setTaskSpecStatus` from `core/task-lifecycle.ts` | Yes | Yes | No | — |
| `task.checkbox.set` | `task checkbox set` | `setTaskCheckboxes` from `core/task-checkboxes.ts` | Yes | Yes | No | — |
| `project.metadata.read` | `project metadata read` | `readProjectMetadata` from `core/project-metadata.ts` | Yes | No | No | — |
| `project.metadata.write` | `project metadata write` | `writeProjectMetadata` from `core/project-metadata.ts` | Yes | No | No | — |
| `step.instantiate` | `step instantiate` | `instantiateStepOutput` from `core/templates.ts` | Yes | Yes | No | — |
| `spec.frontmatter.update` | `spec frontmatter update` | `updateSpecFrontmatter` from `core/frontmatter.ts` | Yes | Yes | No | — |

## Task Spec Selection

Operations with `Requires task spec = Yes` follow:

1. If `selectedTaskSpec` already set in session context, use it.
2. Else if exactly one Active spec exists, auto-select.
3. Else if multiple Active specs exist, show numbered-list prompt (FR-011).
4. Else show error with remediation (no Active specs).

## Read-Only Browse Operations

These are interactive-only read models with no CLI subcommand as a primary screen but use the same underlying readers as CLI where applicable:

| UI surface | Data source |
|------------|-------------|
| Task spec list/detail | `assembleTaskSpecSummary`, `readWorkflowState`, frontmatter readers |
| Workflow variant list | `readWorkflowConfig` |
| Agents list (all) | `listBundledAgents` + `readWorkflowConfig` |
| Agents list (configured) | `resolveListedAgents({ enabledOnly: true })` |

## Parity Acceptance

For every row with a write orchestrator, integration tests MUST:

1. Prepare a fixture project state.
2. Apply the mutation via interactive orchestrator call with inputs `I`.
3. Reset fixture and apply `spec-n-roll <subcommand>` with equivalent `I`.
4. Assert byte-identical contents for all affected files.

Read operations assert equivalent parsed data, not identical stdout formatting (per spec assumptions).

## Adding New Operations

When a new non-interactive CLI subcommand is added to the toolkit:

1. Add a row to this table.
2. Add a screen or submenu entry in `contracts/interactive-app.md`.
3. Add parity test coverage before marking the interactive feature complete.
