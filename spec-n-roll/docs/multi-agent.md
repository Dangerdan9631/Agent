# Multi-Agent Setup

spec-n-roll configures multiple AI coding agents from bundled extensions during `init` and (eventually) `config add-agent`. This document reflects **Phase 3 (US1)** shipped behavior.

Toolkit docs live in the repository root `docs/` only — they are not installed into user projects.

## Bundled agents

Four out-of-the-box bundled agent extensions ship with the toolkit:

| Extension id  | Display name   | Rules pointer                         | MCP config target    |
| ------------- | -------------- | ------------------------------------- | -------------------- |
| `cursor`      | Cursor         | `.cursor/rules/spec-n-roll.mdc`       | `.cursor/mcp.json`   |
| `claude-code` | Claude Code    | `CLAUDE.md`                           | `.mcp.json`          |
| `copilot`     | GitHub Copilot | `.github/copilot-instructions.md`     | `.vscode/mcp.json`   |
| `codex`       | Codex          | `AGENTS.md` (project root)            | `.codex/mcp.json`    |

Implementation: `src/agents/generators/` and `src/agents/extension-loader.ts`.

Each pointer file is a thin reference to the canonical rules at `.spec-n-roll/AGENTS.md`. Skills scaffolding is created under `.agents/skills/` (full skill content is added in later workflow phases).

## Canonical rules

`.spec-n-roll/AGENTS.md` is toolkit-owned and contains workflow command names, MCP usage boundaries, and living-spec guidance. Implementation: `src/agents/generators/agents-md.ts`.

## MCP configuration merge

For each selected agent, `init` creates or idempotently merges the agent's native MCP configuration file(s):

- Upserts the `spec-n-roll` server entry (merge key from extension manifest `agentSetup.mcpConfig.serverId`)
- Points stdio transport at `.spec-n-roll/cli/bin/spec-n-roll-mcp` via `node` and a project-relative binary path
- Preserves unrelated MCP server entries

Implementation: `src/agents/mcp-config.ts`. Contract: `specs/001-spec-n-roll-toolkit/contracts/agent-mcp-config.md`.

Re-running `init` for the same agent produces the same effective MCP config (no duplicate server entries).

## Bundled extension manifests

Selected agent manifests are written to `.spec-n-roll/bundled-extensions/{id}/manifest.json` during init. The extension loader validates `agentSetup.mcpConfig` when loading manifests from an initialized project.

## Workflow configuration

`init` writes `.spec-n-roll/config/workflow.config.json` with:

- Three tier variants: `papercut`, `quick`, `full` — each lists shared `specify` as step 1
- Enabled entries only for agents selected during init
- Extension references pointing at installed bundled manifests

`init` also writes `.spec-n-roll/config/project-metadata.json` with `nextTaskSpecId: 1`.

## Project-local binaries

`init` installs version-matched full CLI and MCP binaries to `.spec-n-roll/cli/bin/`:

- `spec-n-roll` — full CLI (`dist/cli/index.js` copy)
- `spec-n-roll-mcp` — MCP server (`dist/mcp/server.js` copy)
- On Windows: `spec-n-roll.cmd` and `spec-n-roll-mcp.cmd` wrappers in the same directory

The global dispatcher resolves and exec's the local full CLI when present.

## TODO: Not yet implemented

| Area                                      | Phase        |
| ----------------------------------------- | ------------ |
| `config add-agent` for adding agents later  | US9          |
| MCP path refresh on `update`              | US9          |
| Generated workflow skill file content     | US3–US4      |
| Platform script install during init       | US2          |
| Init layout confirmation Ink prompts      | US1+         |
