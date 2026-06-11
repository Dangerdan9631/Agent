# CLI Reference

Command-line interface for spec-n-roll. This document reflects **Phase 1 (Setup)** shipped behavior: triple-binary packaging, npm `bin` entries, build output layout, and Windows wrappers. Dispatcher delegation, management commands, core-library subcommands, and MCP tools are listed under [TODO](#todo-not-yet-implemented) until their implementing phases land.

Toolkit docs live in the repository root `docs/` only — they are not installed into user projects by `init` or `update`.

## Three binaries

spec-n-roll ships as three separate Node.js entry points compiled from `src/` into `dist/`:

| Binary | npm `bin` name | Source | Built output | Role |
|--------|----------------|--------|--------------|------|
| **Dispatcher** | `spec-n-roll` | `src/cli/dispatcher.ts` | `dist/cli/dispatcher.js` | Global npm entry point; resolves local vs global CLI and exec's the full CLI as a child process |
| **Full CLI** | `spec-n-roll-cli` | `src/cli/index.ts` | `dist/cli/index.js` | Argument parsing, subcommands, and (eventually) Ink UI |
| **MCP server** | `spec-n-roll-mcp` | `src/mcp/server.ts` | `dist/mcp/server.js` | stdio MCP transport for agent-driven deterministic mutations |

After `npm run build`, the primary runnable artifacts are:

```text
dist/
├── cli/
│   ├── dispatcher.js          # dispatcher binary (global default)
│   ├── index.js               # full CLI binary
│   ├── spec-n-roll.cmd        # Windows wrapper → index.js
│   └── spec-n-roll-mcp.cmd    # Windows wrapper → ../mcp/server.js
└── mcp/
    └── server.js              # MCP server binary
```

TypeScript also emits `.d.ts`, `.js.map`, and other compiled modules under `dist/` for library code; only the three entry points above are published as CLI/MCP executables.

### Install locations (planned)

| Binary | Global npm install | Project-local (after `init`) |
|--------|-------------------|------------------------------|
| Dispatcher | Yes (`spec-n-roll` on `PATH`) | No |
| Full CLI | Co-bundled with dispatcher | `.spec-n-roll/cli/bin/spec-n-roll` |
| MCP server | No (project-local only) | `.spec-n-roll/cli/bin/spec-n-roll-mcp` |

> **TODO:** Document project-local binary install during `init` (Phase 3, US1).

## npm packaging

### `bin` entries

`package.json` registers three executables:

```json
"bin": {
  "spec-n-roll": "./dist/cli/dispatcher.js",
  "spec-n-roll-cli": "./dist/cli/index.js",
  "spec-n-roll-mcp": "./dist/mcp/server.js"
}
```

- **`spec-n-roll`** — what developers install globally (`npm install -g spec-n-roll`). This is the dispatcher, not the full CLI.
- **`spec-n-roll-cli`** — direct access to the full CLI without dispatcher resolution (development and testing).
- **`spec-n-roll-mcp`** — MCP server binary for local agent configuration.

The published npm package includes only `dist/` (`"files": ["dist"]`).

### Build and publish scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `build` | `tsc && node scripts/copy-wrappers.mjs` | Compile TypeScript (`src/` → `dist/`) and copy Windows `.cmd` wrappers into `dist/cli/` |
| `prepublish` | `npm run build` | Ensure `dist/` is fresh before `npm publish` |

**Requirements:** Node.js ≥ 20 (`engines.node`).

Run a local build:

```bash
npm run build
```

Verify the three entry points exist:

```bash
node dist/cli/dispatcher.js --help
node dist/cli/index.js --help
node dist/mcp/server.js   # starts stdio MCP server (minimal skeleton)
```

## Windows wrappers

On Windows, `npm run build` copies two batch shims from `scripts/wrappers/` into `dist/cli/`:

| Wrapper | Invokes | Purpose |
|---------|---------|---------|
| `dist/cli/spec-n-roll.cmd` | `node dist/cli/index.js` | Run the full CLI without relying on the `.js` shebang |
| `dist/cli/spec-n-roll-mcp.cmd` | `node dist/mcp/server.js` | Run the MCP server on Windows |

The dispatcher (`dist/cli/dispatcher.js`) prefers `spec-n-roll.cmd` over `spec-n-roll` when resolving a project-local full CLI on Windows.

Wrapper copy is handled by `scripts/copy-wrappers.mjs` as the second step of `npm run build` — it is not part of `tsc` itself.

> **TODO:** Document project-local `.cmd` install alongside binaries during `init` (Phase 3, US1).

## Phase 1 CLI surface

The full CLI (`dist/cli/index.js`) registers Commander subcommands with placeholder handlers. Invoking a registered command today prints `{command}: not implemented` and exits.

Currently registered (stub only):

| Command | Registered flags |
|---------|-------------------|
| `init [path]` | — |
| `update` | `--dry-run` |
| `config add-agent` | — |
| `version` | — |

Global option on the root program:

| Flag | Status |
|------|--------|
| `--global` | Registered on full CLI program; dispatcher resolution is implemented in `src/cli/dispatcher.ts` but not yet documented here (Phase 2, T033) |
| `-V, --version` | Commander built-in; reads version from `package.json` |

Bare `spec-n-roll` (no subcommand) with Ink interactive mode is **not** implemented yet.

---

## TODO: Not yet implemented

The sections below list planned CLI and MCP behavior from `specs/001-spec-n-roll-toolkit/contracts/`. None of it is callable in Phase 1 except the stub commands above.

### Management commands

| Command | Planned flags / behavior | Phase |
|---------|-------------------------|-------|
| `spec-n-roll init [path]` | Ink agent/script selection; `--yes`, `--agents`, `--script-variants`; installs project-local binaries and agent MCP config | US1 (Phase 3) |
| `spec-n-roll update` | `--dry-run`, `--yes`, `--confirm-migration`; toolkit-owned overwrite, `.bak` backups, MCP path refresh | US9 (Phase 10) |
| `spec-n-roll config add-agent` | `--yes`, `--agent`; merge MCP config for new agent only | US9 (Phase 10) |
| `spec-n-roll config script-variants` | Change enabled `.sh` / `.ps1` variants in `workflow.config.json` | US9 (Phase 10) |
| `spec-n-roll version` | Combined dispatcher + executed binary + local/global target report | US9 (Phase 10) |
| Bare `spec-n-roll` (no subcommand) | Ink interactive menu | US1+ |

**Global dispatcher (Phase 2, T033):**

- Walk `cwd` → parents for `.spec-n-roll/cli/bin/spec-n-roll`
- Exec local full CLI as child process (no in-process load)
- `--global` bypass to co-bundled `dist/cli/index.js` (or `spec-n-roll.cmd` on Windows)
- Forward `-v` / `--version` unchanged to resolved full CLI
- Clear error when local binary exists but is not executable

**Non-interactive mode (SC-009):**

- `--yes` on `init`, `update`, and `config add-agent` to skip Ink prompts

### Core library subcommands

Thin CLI wrappers over `src/core/` — each mirrors an MCP tool (SC-012). **None registered in Phase 1.**

| Subcommand | MCP tool twin |
|------------|---------------|
| `spec-n-roll workflow state read --task-spec-id <id> --slug <slug>` | `workflow_state_read` |
| `spec-n-roll workflow state write [options]` | `workflow_state_write` |
| `spec-n-roll task status set --task-spec-id <id> --slug <slug> --status <status>` | `task_spec_status_set` |
| `spec-n-roll project metadata read` | `project_metadata_read` |
| `spec-n-roll project metadata write [options]` | `project_metadata_write` |
| `spec-n-roll task checkbox set --task-spec-id <id> --slug <slug> --task-id <id> --completed <bool>` | `task_checkbox_set` |
| `spec-n-roll step instantiate --task-spec-id <id> --slug <slug> --step-id <stepId> [--frontmatter key=value ...]` | `step_output_instantiate` |
| `spec-n-roll spec frontmatter update --task-spec-id <id> --slug <slug> [options]` | `spec_frontmatter_update` |

**Phase:** Foundational (Phase 2, T024–T029).

### MCP tools

The MCP server binary starts on stdio and advertises an empty tool surface in Phase 1. The following tools from `contracts/mcp-tools.md` are **not** registered yet:

| Tool | Purpose |
|------|---------|
| `workflow_state_read` | Read `workflow-state.json` for a task spec |
| `workflow_state_write` | Write workflow state after step completion or recovery |
| `task_spec_status_set` | Set `status` in `spec.md` frontmatter (`Active` \| `Complete` \| `Locked`) |
| `project_metadata_read` | Read `.spec-n-roll/config/project-metadata.json` |
| `project_metadata_write` | Update project metadata fields |
| `task_checkbox_set` | Toggle `tasks.md` completion checkbox by task ID |
| `step_output_instantiate` | Copy step output template into task spec directory |
| `spec_frontmatter_update` | Update non-status `spec.md` frontmatter fields |

Agent MCP configuration must point at `.spec-n-roll/cli/bin/spec-n-roll-mcp` — never the dispatcher or full CLI binary.

**Phase:** MCP skeleton tool registration in Phase 2 (T028); parity with CLI in Phase 10 (T110).

### Agent workflow commands

Generated agent slash commands (`/spec-n-specify`, `/spec-n-roll`, etc.) are not part of the npm CLI binaries. They are installed as agent skills during `init` and documented in `workflow.md` as each workflow phase ships.

---

## Related documentation

| Topic | File | When updated |
|-------|------|--------------|
| Dispatcher, core subcommands, MCP skeleton | `cli.md` (this file) | Phase 2 (T033) |
| `init`, multi-agent MCP config | `multi-agent.md`, `cli.md` | US1 (T048) |
| `update`, `--yes`, version report | `cli.md` | US9 (T112) |
| Full command contracts | `specs/001-spec-n-roll-toolkit/contracts/cli-commands.md` | Source of truth |
| MCP tool contracts | `specs/001-spec-n-roll-toolkit/contracts/mcp-tools.md` | Source of truth |
