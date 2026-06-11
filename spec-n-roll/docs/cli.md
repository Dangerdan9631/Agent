# CLI Reference

Command-line interface for spec-n-roll. This document reflects **Phase 1 (Setup)**, **Phase 2 (Foundational)**, and **Phase 3 (US1 — init)** shipped behavior: triple-binary packaging, dispatcher delegation, project initialization, core-library subcommands, and MCP tool registration.

Toolkit docs live in the repository root `docs/` only — they are not installed into user projects by `init` or `update`.

## Three binaries

spec-n-roll ships as three separate Node.js entry points compiled from `src/` into `dist/`:

| Binary         | npm `bin` name    | Source                  | Built output             | Role                                                                                            |
| -------------- | ----------------- | ----------------------- | ------------------------ | ----------------------------------------------------------------------------------------------- |
| **Dispatcher** | `spec-n-roll`     | `src/cli/dispatcher.ts` | `dist/cli/dispatcher.js` | Global npm entry point; resolves local vs global CLI and exec's the full CLI as a child process |
| **Full CLI**   | `spec-n-roll-cli` | `src/cli/index.ts`      | `dist/cli/index.js`      | Argument parsing, subcommands, and (eventually) Ink UI                                          |
| **MCP server** | `spec-n-roll-mcp` | `src/mcp/server.ts`     | `dist/mcp/server.js`     | stdio MCP transport; thin interface over `src/core/`                                            |

After `npm run build`, the primary runnable artifacts are:

```text
dist/
├── cli/
│   ├── dispatcher.js
│   ├── index.js
│   ├── spec-n-roll.cmd
│   └── spec-n-roll-mcp.cmd
├── mcp/
│   └── server.js
└── templates/
    ├── spec.md
    ├── plan.md
    └── tasks.md
```

### Install locations

| Binary     | Global npm install            | Project-local (after `init`)           |
| ---------- | ----------------------------- | -------------------------------------- |
| Dispatcher | Yes (`spec-n-roll` on `PATH`) | No                                     |
| Full CLI   | Co-bundled with dispatcher    | `.spec-n-roll/cli/bin/spec-n-roll`     |
| MCP server | No (project-local only)       | `.spec-n-roll/cli/bin/spec-n-roll-mcp` |

During `init`, the toolkit copies `dist/cli/index.js` and `dist/mcp/server.js` into `.spec-n-roll/cli/bin/` as `spec-n-roll` and `spec-n-roll-mcp`. On Windows, `.cmd` wrappers are created alongside the binaries. Implementation: `src/cli/commands/init.ts`.

## Global dispatcher (implemented)

Implementation: `src/cli/dispatcher.ts`.

When you run the global `spec-n-roll` binary (dispatcher):

1. Unless `--global` is present, walk from `cwd` upward to find `.spec-n-roll/cli/bin/spec-n-roll`.
2. If found and executable, **exec** the local full CLI as a child process (dispatcher does not load full CLI/core/MCP in-process).
3. If not found, exec the co-bundled global full CLI (`dist/cli/index.js`, or `spec-n-roll.cmd` on Windows).
4. `--global` skips local resolution and always uses the co-bundled global full CLI.

| Behavior                                     | Status                                                              |
| -------------------------------------------- | ------------------------------------------------------------------- |
| Parent walk for local CLI                    | Implemented                                                         |
| Child process exec with inherited stdio      | Implemented                                                         |
| `--global` bypass                            | Implemented                                                         |
| Windows `.cmd` preference for local CLI      | Implemented                                                         |
| Clear error when local CLI is not executable | Implemented                                                         |
| Forward `-v` / `--version` unchanged         | Implemented — combined version report via full CLI                    |

Direct full CLI access for development:

```bash
node dist/cli/index.js --help
npm run build && npx spec-n-roll-cli workflow state read --help
```

## `init` (implemented)

Implementation: `src/cli/commands/init.ts`, agent prompts in `src/cli/ink/init-prompts.tsx`.

```bash
spec-n-roll init [path]
spec-n-roll init . --yes --agents cursor,claude-code
```

| Flag               | Description                                                                 |
| ------------------ | --------------------------------------------------------------------------- |
| `[path]`           | Project directory to initialize (default: `.`)                              |
| `--yes`            | Non-interactive mode; requires `--agents`                                   |
| `--agents <list>`  | Comma-separated bundled agent ids: `cursor`, `claude-code`, `copilot`, `codex` |

**Interactive mode** (default): Ink multi-select for bundled agents.

**Non-interactive mode** (`--yes`): skips Ink; `--agents` is required with at least one id.

**Outputs:**

- `.spec-n-roll/cli/bin/spec-n-roll` and `spec-n-roll-mcp` (+ `.cmd` on Windows)
- `.spec-n-roll/AGENTS.md` canonical rules
- `.agents/skills/` directory scaffolding
- Per-agent pointer files and MCP config merge (see `multi-agent.md`)
- `.spec-n-roll/bundled-extensions/{id}/manifest.json` for selected agents
- `.spec-n-roll/config/workflow.config.json` (papercut, quick, full tiers)
- `.spec-n-roll/config/project-metadata.json` (`nextTaskSpecId: 1`)
- `.spec-n-roll/compatibility.json` (empty incompatible combinations)

> **TODO:** Ink layout confirmation prompts; platform script install (US2).

## `update` (implemented)

Implementation: `src/cli/commands/update.ts`, MCP refresh in `src/agents/mcp-config.ts`.

```bash
spec-n-roll update
spec-n-roll update --yes
spec-n-roll update --dry-run
```

| Flag                   | Description                                              |
| ---------------------- | -------------------------------------------------------- |
| `--dry-run`            | Preview toolkit-owned files to overwrite and `.bak` plan |
| `--yes`                | Non-interactive mode; skip Ink confirmation              |
| `--confirm-migration`  | Apply breaking config migrations without prompting (US10 hook) |

**Behavior:**

- Overwrites toolkit-owned paths (`.spec-n-roll/` except `config/`, `.agents/`, binaries, scripts, skills, bundled extensions).
- Preserves user-owned files byte-for-byte (`.spec-n-roll/config/`, `specs/`, `living-specs/`).
- Writes `.bak` siblings for locally modified toolkit-owned files before overwrite (`src/updates/backup.ts`).
- Refreshes spec-n-roll MCP server paths for all configured agents.

> **TODO:** Config schema migration and extension compatibility warnings at update time (US10).

## `config add-agent` (implemented)

Implementation: `src/cli/commands/config-add-agent.ts`.

```bash
spec-n-roll config add-agent
spec-n-roll config add-agent --yes --agent copilot
```

| Flag            | Description                                        |
| --------------- | -------------------------------------------------- |
| `--yes`         | Non-interactive mode; requires `--agent`           |
| `--agent <id>`  | Bundled agent id: `cursor`, `claude-code`, `copilot`, `codex` |

Adds rules, skills pointers, bundled extension manifest, and MCP config merge for the new agent only. Existing agents remain unchanged. Idempotent when the agent is already configured.

## `version` (implemented)

Implementation: `src/cli/commands/version.ts`.

```bash
spec-n-roll version
spec-n-roll -v
spec-n-roll --version
```

Prints combined report: toolkit version, invocation target (`local` / `global` / `direct`), dispatcher version when delegated, and local CLI path when running project-local.

> **TODO:** Discover and report latest published toolkit version from registry.

## Management commands summary

| Command            | Status      | Flags                                      |
| ------------------ | ----------- | ------------------------------------------ |
| `init [path]`      | Implemented | `--yes`, `--agents`                        |
| `update`           | Implemented | `--dry-run`, `--yes`, `--confirm-migration` |
| `config add-agent` | Implemented | `--yes`, `--agent`                         |
| `version`          | Implemented | — (also `-v` / `--version` on full CLI)    |

> **TODO:** Bare `spec-n-roll` Ink mode (no subcommand).

## Core library subcommands (implemented)

Non-interactive subcommands invoke `src/core/` — the same operations exposed as MCP tools (SC-012). Implementation: `src/cli/commands/core.ts`.

| Subcommand                                                                                                                                                                                   | MCP tool twin             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `spec-n-roll workflow state read --task-spec-id <id> --slug <slug>`                                                                                                                          | `workflow_state_read`     |
| `spec-n-roll workflow state write --task-spec-id <id> --slug <slug> --workflow-variant-id <id> --status <active\|paused\|complete> [--last-completed-step-id <id>] [--current-step-id <id>]` | `workflow_state_write`    |
| `spec-n-roll task status set --task-spec-id <id> --slug <slug> --status <Active\|Complete\|Locked>`                                                                                          | `task_spec_status_set`    |
| `spec-n-roll project metadata read`                                                                                                                                                          | `project_metadata_read`   |
| `spec-n-roll project metadata write [options]`                                                                                                                                               | `project_metadata_write`  |
| `spec-n-roll task checkbox set --task-spec-id <id> --slug <slug> --task-id <id...> --completed <true\|false>`                                                                                | `task_checkbox_set`       |
| `spec-n-roll step instantiate --task-spec-id <id> --slug <slug> --step-id <specify\|plan\|tasks> [--frontmatter key=value ...]`                                                              | `step_output_instantiate` |
| `spec-n-roll spec frontmatter update --task-spec-id <id> --slug <slug> [--field key=value ...]`                                                                                              | `spec_frontmatter_update` |

Example:

```bash
node dist/cli/index.js step instantiate \
  --task-spec-id 001 --slug my-feature --step-id specify \
  --frontmatter status=Active

node dist/cli/index.js workflow state write \
  --task-spec-id 001 --slug my-feature \
  --workflow-variant-id quick --status active
```

**Notes:**

- `task status set` is the only supported path for `status` frontmatter changes.
- `spec frontmatter update` rejects `status` fields.
- Locked task specs reject mutations with a clear error.

## MCP server (implemented)

Implementation: `src/mcp/server.ts`, tool handlers in `src/mcp/tools.ts`.

Start locally:

```bash
node dist/mcp/server.js
```

Registered tools (stdio transport):

| Tool                      | Purpose                                                |
| ------------------------- | ------------------------------------------------------ |
| `workflow_state_read`     | Read `workflow-state.json` for a task spec             |
| `workflow_state_write`    | Write workflow state after step completion or recovery |
| `task_spec_status_set`    | Set `status` in `spec.md` frontmatter                  |
| `project_metadata_read`   | Read `.spec-n-roll/config/project-metadata.json`       |
| `project_metadata_write`  | Update project metadata fields                         |
| `task_checkbox_set`       | Toggle `tasks.md` completion checkbox by task ID       |
| `step_output_instantiate` | Copy step output template into task spec directory     |
| `spec_frontmatter_update` | Update non-status `spec.md` frontmatter fields         |

MCP uses `process.cwd()` as the project root. Agent MCP configuration must point at `.spec-n-roll/cli/bin/spec-n-roll-mcp` — never the dispatcher or full CLI binary.

MCP/CLI parity for all eight core tools is covered in `tests/contract/mcp-cli-parity.test.ts` (SC-012).

## TODO: Not yet implemented

| Area                                                          | Phase          |
| ------------------------------------------------------------- | -------------- |
| Config schema migration and compatibility warnings on update  | US10           |
| Bare `spec-n-roll` Ink interactive mode                       | US1+           |
| Latest published toolkit version discovery in `version`       | US9 polish     |

## Related documentation

| Topic                    | File                                                      |
| ------------------------ | --------------------------------------------------------- |
| Multi-agent init setup   | `multi-agent.md`                                          |
| File ownership on update | `updates-and-migrations.md`                               |
| Full command contracts   | `specs/001-spec-n-roll-toolkit/contracts/cli-commands.md` |
| MCP tool contracts       | `specs/001-spec-n-roll-toolkit/contracts/mcp-tools.md`    |
