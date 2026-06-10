# CLI Command Contract

The TypeScript CLI is the authoritative non-agent interface for toolkit setup, update, and configuration. Agent workflow commands remain separate and use the `spec-n-` prefix.

## Global Dispatch

### `spec-n-roll [--global] <command> [...args]`

**Behavior**:

- If `--global` is absent, search the current working directory and parents for a local project CLI.
- If found, delegate to the local CLI with the original command and arguments.
- If not found, execute the global CLI directly.
- If `--global` is present, execute the global CLI directly.

**Errors**:

- Local CLI found but cannot execute: report local path, version if readable, and remediation.
- Unsupported command: list available commands.

## Setup

### `spec-n-roll init [path]`

Initializes toolkit files in a project.

**Interactive Ink prompts**:

- Select one or more agents to configure.
- Select script variants: PowerShell, shell, or both.
- Confirm toolkit-owned and user-owned directory layout.
- Confirm default workflow creation (papercut, quick, full tier variants — each with shared `specify` as step 1).

**Outputs**:

- Toolkit-owned files in designated toolkit directories.
- User-owned config files in designated user directories (`workflow.config.json`, `project-metadata.json` with `nextTaskSpecId: 1`).
- Local CLI copy.
- Default workflow configuration.
- Agent-specific rules/skills/commands for selected agents.

**Acceptance**:

- Does not verify selected agents are installed.
- Does not overwrite user-owned files without explicit setup confirmation.

## Update

### `spec-n-roll update [--dry-run]`

Applies a toolkit version update.

**Interactive Ink prompts**:

- Show current and target toolkit versions.
- Show toolkit-owned files to overwrite.
- Show locally modified toolkit-owned files that will receive `.bak` backups.
- Show config migrations, if any, and require explicit confirmation for breaking schema migrations.
- Show extension compatibility warnings.

**Outputs**:

- Updated toolkit-owned files.
- `.bak` copies for modified toolkit-owned files.
- Migrated user-owned config files only after confirmed migration.
- Update summary.

**Acceptance**:

- User-owned files remain byte-identical unless explicitly migrated.
- Extension compatibility warnings never block the update.

## Configure

### `spec-n-roll config add-agent`

Adds a configured agent to an initialized project.

**Interactive Ink prompts**:

- Select the agent to add.
- Confirm generated files.

**Acceptance**:

- Existing agent configuration remains intact.
- No local installation verification is performed.

### `spec-n-roll config script-variants`

Changes enabled automation script variants.

**Interactive Ink prompts**:

- Select PowerShell, shell, or both.
- Confirm platform fallback behavior.

**Acceptance**:

- Runtime script selection follows configured variants.
- Missing runtime variants produce clear remediation errors.

## Version

### `spec-n-roll version`

Reports global, local, and latest available toolkit versions when discoverable.

## Agent Workflow Commands

Generated agent commands expose the development workflow:

- `/spec-n-specify`
- `/spec-n-clarify`
- `/spec-n-plan`
- `/spec-n-tasks`
- `/spec-n-analyze`
- `/spec-n-implement`
- `/spec-n-roll`

**Shared contract**:

- Commands operate on task specs under `specs/{numeric-id}-{slug}/`.
- Task spec lifecycle (`Active`/`Complete`/`Locked`) is read/written in `spec.md` YAML frontmatter.
- `workflow-state.json` carries numeric `taskSpecId` plus required `slug`; operational status is `active`/`paused`/`complete`.
- Pre-implement commands and `/spec-n-roll` present a numbered-list interactive prompt when multiple Active specs exist and no task is identified.
- `/spec-n-specify` runs embedded triage (tier selection) before the interview, then persists `workflowVariantId`.
- `/spec-n-clarify` uses a separate follow-up interview.
- `/spec-n-roll` advances the next step from workflow state or tier-aware artifact fallback.
- Partial artifacts are detected via the built-in step output manifest (one prompt per step).
- `/spec-n-implement` begins with living spec updates and TDD red-green-refactor cycles.
- Tier-skipped artifacts (`plan.md`, `tasks.md`) are omitted — not errors on papercut/quick tiers.

## Step Output Manifest (built-in)

| Step ID | Expected files (relative to task spec dir) |
|---------|---------------------------------------------|
| `specify` | `spec.md` |
| `plan` | `plan.md` |
| `tasks` | `tasks.md` |

Partial = any expected file exists for the current incomplete step per `workflow-state.json`.

## Extension Handler Contract

- `entrypoint`: project-relative path to a JS/TS module.
- Module MUST export a standard async handler function.
- Invoked in-process via Node `import()`.
- Failures fail the current workflow step with remediation guidance.
