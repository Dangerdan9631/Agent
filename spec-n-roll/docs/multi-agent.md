# Multi-Agent Setup

spec-n-roll configures multiple AI coding agents from extensions during `init` and `config agent add`. This document reflects **Phase 3 (US1)** and **Phase 10 (US9)** shipped behavior.

Toolkit docs live in the repository root `docs/` only — they are not installed into user projects.

## Bundled agents

Four out-of-the-box agent extensions ship with the toolkit:

| Extension id  | Display name   | Rules pointer                     | MCP config target  |
| ------------- | -------------- | --------------------------------- | ------------------ |
| `cursor`      | Cursor         | `.cursor/rules/spec-n-roll.mdc`   | `.cursor/mcp.json` |
| `claude-code` | Claude Code    | `CLAUDE.md`                       | `.mcp.json`        |
| `copilot`     | GitHub Copilot | `.github/copilot-instructions.md` | `.vscode/mcp.json` |
| `codex`       | Codex          | `AGENTS.md` (project root)        | `.codex/mcp.json`  |

Implementation: `src/agents/generators/` and `src/agents/extension-loader.ts`.

Each pointer file is a thin reference to the canonical rules at `.spec-n-roll/AGENTS.md`. Workflow skill files (for example `spec-n-specify`, `/spec-n-roll`, `/spec-n-implement`) are generated under `.agents/skills/` during `init` and refreshed on `update`.

## Canonical rules

`.spec-n-roll/AGENTS.md` is toolkit-owned and contains workflow command names, MCP usage boundaries, and living-spec guidance. Implementation: `src/agents/generators/agents-md.ts`.

## MCP configuration merge

For each selected agent, `init` creates or idempotently merges the agent's native MCP configuration file(s):

- Upserts the `spec-n-roll` server entry (merge key from extension manifest `agentSetup.mcpConfig.serverId`)
- Points stdio transport at `.spec-n-roll/cli/bin/spec-n-roll-mcp` via `node` and a project-relative binary path
- Preserves unrelated MCP server entries

Implementation: `src/agents/mcp-config.ts`. Contract: `specs/001-spec-n-roll-toolkit/contracts/agent-mcp-config.md`.

Re-running `init` for the same agent produces the same effective MCP config (no duplicate server entries).

## Extension manifests

Selected agent manifests are written to `.spec-n-roll/bundled-extensions/{id}/manifest.json` during init. The extension loader validates `agentSetup.mcpConfig` when loading manifests from an initialized project.

## Workflow configuration

`init` writes `.spec-n-roll/config/workflow.config.json` with:

- Three tier variants: `papercut`, `quick`, `full` — each lists shared `specify` as step 1
- Enabled entries only for agents selected during init
- Extension references pointing at installed manifests

`init` also writes `.spec-n-roll/config/project-metadata.json` with `nextTaskSpecId: 1`.

## Project-local binaries

`init` installs version-matched full CLI and MCP binaries to `.spec-n-roll/cli/bin/`:

- `spec-n-roll` — full CLI (`dist/cli/index.js` copy)
- `spec-n-roll-mcp` — MCP server (`dist/mcp/server.js` copy)
- On Windows: `spec-n-roll.cmd` and `spec-n-roll-mcp.cmd` wrappers in the same directory

The global dispatcher resolves and exec's the local full CLI when present.

## Adding agents later

`spec-n-roll config agent add <agents>` adds rules, skills, extension manifests, and MCP config merge for **one or more new agents** without modifying existing agents. Idempotent when an agent is already configured. See `cli.md`.

`spec-n-roll config agent remove <agents>` removes one or more agents from project configuration, deletes agent-specific artifacts, and removes the Spec-N-Roll MCP server entry without affecting other agents.

`spec-n-roll update` refreshes MCP server paths for all configured agents when local binaries change.

## TODO: Not yet implemented

| Area                                 | Notes                               |
| ------------------------------------ | ----------------------------------- |
| Init layout confirmation Ink prompts | Workflow/agent selection only today |
