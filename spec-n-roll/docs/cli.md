# CLI Reference

Command-line interface for spec-n-roll. This document reflects **Phase 1 (Setup)** and **Phase 2 (Foundational)** shipped behavior: triple-binary packaging, dispatcher delegation, core-library subcommands, and MCP tool registration.

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

### Install locations (planned)

| Binary     | Global npm install            | Project-local (after `init`)           |
| ---------- | ----------------------------- | -------------------------------------- |
| Dispatcher | Yes (`spec-n-roll` on `PATH`) | No                                     |
| Full CLI   | Co-bundled with dispatcher    | `.spec-n-roll/cli/bin/spec-n-roll`     |
| MCP server | No (project-local only)       | `.spec-n-roll/cli/bin/spec-n-roll-mcp` |

> **TODO:** Document project-local binary install during `init` (Phase 3, US1).

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
| Forward `-v` / `--version` unchanged         | Registered on full CLI; combined version report not implemented yet |

Direct full CLI access for development:

```bash
node dist/cli/index.js --help
npm run build && npx spec-n-roll-cli workflow state read --help
```

## Management commands (stubs)

These commands are registered but still print `{command}: not implemented`:

| Command            | Registered flags |
| ------------------ | ---------------- |
| `init [path]`      | —                |
| `update`           | `--dry-run`      |
| `config add-agent` | —                |
| `version`          | —                |

> **TODO:** Implement `init`, `update`, `config add-agent`, `version`, Ink bare invocation, and `--yes` non-interactive mode (Phases 3 and 10).

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

> **TODO:** Full MCP/CLI parity coverage for all tools in contract tests (T110, US9). Phase 2 includes an initial parity contract test for workflow state write and step instantiate.

## TODO: Not yet implemented

| Area                                                          | Phase          |
| ------------------------------------------------------------- | -------------- |
| `init` with agent selection, binary install, MCP config merge | US1 (Phase 3)  |
| `update` with `.bak`, migrations, MCP path refresh            | US9–US10       |
| `config add-agent`, combined `version` report                 | US9 (Phase 10) |
| Bare `spec-n-roll` Ink interactive mode                       | US1+           |
| `--yes` on management commands (SC-009)                       | US9            |
| Agent workflow slash commands (`/spec-n-specify`, etc.)       | US1+ (skills)  |

## Related documentation

| Topic                    | File                                                      |
| ------------------------ | --------------------------------------------------------- |
| File ownership on update | `updates-and-migrations.md`                               |
| Full command contracts   | `specs/001-spec-n-roll-toolkit/contracts/cli-commands.md` |
| MCP tool contracts       | `specs/001-spec-n-roll-toolkit/contracts/mcp-tools.md`    |
