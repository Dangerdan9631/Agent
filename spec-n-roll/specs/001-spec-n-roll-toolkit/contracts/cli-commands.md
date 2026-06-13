# CLI Command Contract

The TypeScript CLI has two invocation surfaces:

- **Interactive**: bare `spec-n-roll` spawns Ink (no subcommand).
- **Non-interactive**: `spec-n-roll <subcommand> [args]` runs synchronously and exits.

Agent workflow commands remain separate and use the `spec-n-` prefix. Deterministic mutations use the shared core library — see `contracts/mcp-tools.md` for MCP parity (SC-012).

## Global Dispatcher

The globally installed npm artifact is a **lightweight dispatcher** only. It contains local-vs-global resolution logic and exec's the full CLI binary as a child process.

### `spec-n-roll [--global] [-v|--version] [<subcommand> ...]`

**Resolution**:

1. If `--global` is present, exec co-bundled global full CLI relative to dispatcher install path.
2. Otherwise, walk parent directories from `cwd` to find nearest `.spec-n-roll/cli/bin/spec-n-roll`.
3. If local binary found, exec it — MUST NOT load full CLI/core/MCP in-process.
4. If no local binary found, exec co-bundled global full CLI.

**Version** (`-v` / `--version`):

- Dispatcher forwards flag unchanged to resolved full CLI.
- Full CLI prints combined report: dispatcher version, executed binary version, `local`/`global` target, absolute local binary path when local.

**Full CLI binary invocation**:

- `-v`/`--version` reports binary version and indicates whether the running full CLI binary is local or global.

**Errors**:

- Local binary found but exec fails (missing, corrupt, permission denied): clear error — MUST NOT silently fall back to global unless `--global`.
- Unsupported subcommand: list available commands.

**MCP**: Agent MCP configuration MUST point at `.spec-n-roll/cli/bin/spec-n-roll-mcp` — never the dispatcher or full CLI binary.

## Setup

### `spec-n-roll init [path]`

Initializes toolkit files in a project.

**Interactive Ink prompts** (when invoked as bare `spec-n-roll` → Ink, or `init` without `--yes`):

- Select one or more agents to configure.
- Confirm toolkit-owned and user-owned directory layout.
- Confirm default workflow creation (papercut, quick, full tier variants — each with shared `specify` as step 1).

**Outputs**:

- Toolkit-owned files in designated toolkit directories.
- User-owned config files (`workflow.config.json`, `project-metadata.json` with `nextTaskSpecId: 1`).
- Full CLI binary at `.spec-n-roll/cli/bin/spec-n-roll` (+ `.cmd` on Windows).
- MCP server binary at `.spec-n-roll/cli/bin/spec-n-roll-mcp` (+ `.cmd` on Windows).
- For each selected agent extension: create or idempotently merge project-local native MCP configuration file(s) per `agentSetup.mcpConfig.targets` in the extension manifest — upsert `serverId` entry pointing at the local MCP binary (stdio). See `contracts/agent-mcp-config.md`.
- Default workflow configuration.
- Agent-specific rules/skills/commands for selected agents (extensions at `.spec-n-roll/bundled-extensions/`).

**Acceptance**:

- Does not verify selected agents are installed.
- Does not overwrite user-owned files without explicit setup confirmation.
- Installs version-matched full CLI and MCP binaries together.
- Preserves unrelated MCP server entries when merging agent MCP config files.

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

- Updated toolkit-owned files (including full CLI and MCP binaries).
- Refreshed Spec-N-Roll MCP server entry in all configured agents' project-local MCP config files when binary path or platform wrapper changes.
- `.bak` copies for modified toolkit-owned files.
- Migrated user-owned config files only after confirmed migration.
- Update summary (includes MCP config refresh results per agent).

**Acceptance**:

- User-owned files remain byte-identical unless explicitly migrated.
- Extension compatibility warnings never block the update.
- Agent MCP config merge preserves unrelated MCP server entries.

## Configure

### `spec-n-roll config agent add <agents>`

Adds one or more configured agents to an initialized project.

**Arguments**:

- `<agents>` — comma-separated bundled agent ids (e.g. `copilot,claude-code`).

**Outputs**:

- Rules, skills, and workflow commands for each new agent.
- Project-local native MCP configuration file(s) created or merged for each new agent only (per extension `agentSetup.mcpConfig`).

**Acceptance**:

- Existing agents' MCP config and rules remain unchanged.
- Merge is idempotent — unrelated MCP servers preserved.

### `spec-n-roll config agent remove <agents>`

Removes one or more configured agents from an initialized project.

**Arguments**:

- `<agents>` — comma-separated bundled agent ids (e.g. `copilot,claude-code`).

**Outputs**:

- Updated `workflow.config.json` without the removed agents.
- Deleted agent-specific rule pointer files and extension manifests.
- Spec-N-Roll MCP server entry removed from each removed agent's MCP config file(s).

**Acceptance**:

- Other configured agents' MCP config and rules remain unchanged.
- Removal is idempotent when the agent is not configured.

## Version

### `spec-n-roll version` (non-interactive subcommand)

Reports dispatcher version (when applicable), executed binary version, `local`/`global` target, local binary path when local, and latest available toolkit version when discoverable.

## Core Library Subcommands (non-interactive)

Each subcommand invokes the same `src/core/` operation as its MCP tool twin.

### Workflow state

- `spec-n-roll workflow state read --task-spec-id <id> --slug <slug>`
- `spec-n-roll workflow state write [options]`

### Task spec lifecycle

- `spec-n-roll task status set --task-spec-id <id> --slug <slug> <Active|Complete|Locked>`

### Project metadata

- `spec-n-roll project metadata read`
- `spec-n-roll project metadata write [options]`

### Task checkboxes

- `spec-n-roll task checkbox set <true|false> --task-spec-id <id> --slug <slug> --task-id <id...>`

### Step output templates

- `spec-n-roll step instantiate --task-spec-id <id> --slug <slug> --step-id <stepId> [--frontmatter key=value ...]`

Copies toolkit-owned template into task spec directory. Agents use MCP `step_output_instantiate`; developers use this subcommand.

### Spec frontmatter

- `spec-n-roll spec frontmatter update --task-spec-id <id> --slug <slug> [options]`

Status changes use `task status set` — not frontmatter update.

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
- Task spec lifecycle (`Active`/`Complete`/`Locked`) is read/written in `spec.md` YAML frontmatter via MCP tools only.
- `workflow-state.json` carries numeric `taskSpecId` plus required `slug`; operational status is `active`/`paused`/`complete`; writes via MCP/CLI only.
- Step outputs (`spec.md`, `plan.md`, `tasks.md`) MUST be instantiated via MCP/CLI before agent prose edits.
- Pre-implement commands and `/spec-n-roll` present a numbered-list interactive prompt when multiple Active specs exist and no task is identified.
- `/spec-n-specify` runs embedded triage (tier selection) before the interview, then persists `workflowVariantId`.
- `/spec-n-clarify` uses a separate follow-up interview.
- `/spec-n-roll` advances the next step from workflow state or tier-aware artifact fallback.
- Partial artifacts are detected via the built-in step output manifest (one prompt per step).
- `/spec-n-implement` begins with living spec updates and TDD red-green-refactor cycles.
- Living spec `.feature` files are agent-managed — no MCP/CLI template instantiation.
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
