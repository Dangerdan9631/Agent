# Agent MCP Configuration Contract

Project-local agent MCP configuration files connect each configured AI coding agent to the Spec-N-Roll MCP server. This contract applies to `init`, `config add-agent`, and `update`.

## MCP Server Reference

Every configured agent MUST reference:

| Field | Value |
|-------|-------|
| Binary | `.spec-n-roll/cli/bin/spec-n-roll-mcp` (project-relative; use `spec-n-roll-mcp.cmd` on Windows when the agent format requires `.cmd`) |
| Transport | `stdio` |
| Server ID (merge key) | `spec-n-roll` (default; overridable per extension via `agentSetup.mcpConfig.serverId`) |

MCP MUST never reference the global dispatcher or full CLI binary.

## Extension Manifest (`agentSetup.mcpConfig`)

Bundled agent extensions declare MCP integration in `extension-manifest.schema.json` under `agentSetup`:

```json
{
  "agentSetup": {
    "mcpConfig": {
      "serverId": "spec-n-roll",
      "format": "cursor-mcp-json",
      "targets": [
        { "path": ".cursor/mcp.json" }
      ]
    },
    "ruleTargets": ["AGENTS.md"],
    "skillTargets": [".agents/skills"]
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `serverId` | Yes | Stable key used to upsert the Spec-N-Roll MCP server entry |
| `format` | Yes | Config format adapter id (e.g. `cursor-mcp-json`, `claude-mcp-json`) |
| `targets` | Yes (min 1) | Project-relative paths to native MCP config files |
| `targets[].path` | Yes | File to create or merge |

## Commands

### `init`

For each selected agent extension:

1. Install MCP binary at `.spec-n-roll/cli/bin/spec-n-roll-mcp`.
2. Run the extension's agent generator.
3. For each `agentSetup.mcpConfig.targets[]` path: create file or merge idempotently.
4. Upsert server entry `serverId` with stdio command pointing at the resolved local MCP binary.

### `config add-agent`

Same as `init` steps 3–4 for the newly added agent only.

### `update`

For each enabled agent extension:

1. Resolve current MCP binary path (including platform wrapper when applicable).
2. Refresh the `serverId` entry in all `mcpConfig.targets` paths.
3. Report agents whose MCP config could not be updated.

## Merge Rules

- **Upsert by `serverId`**: If an entry with `serverId` exists, update command/args/transport only.
- **Insert if absent**: Add Spec-N-Roll server entry without removing or reordering unrelated servers.
- **Preserve unrelated entries**: Never delete or overwrite other MCP server definitions.
- **Idempotent**: Re-running `init` or `config add-agent` for the same agent produces the same effective MCP config (no duplicates).

## Format Adapters

Each `format` value maps to a small adapter in `src/agents/mcp-config.ts` that:

- Reads existing config (or empty object if file missing)
- Applies upsert merge for `serverId`
- Writes formatted output preserving unrelated keys where the format allows

Bundled adapters (v1): one per OOTB agent extension (cursor, claude-code, copilot, codex).

## Errors

| Condition | Behavior |
|-----------|----------|
| MCP config file exists but is unparseable | Fail the command with path and remediation (fix manually or delete file) |
| Target path parent directory missing | Create parent directories |
| Local MCP binary missing after `init` | Fail with remediation to re-run `init` or `update` |
| `update` cannot refresh path | Report in update summary; surface error if agent MCP tools invoked |

## Validation (Quickstart)

See quickstart Scenario 1 (init) and Scenario 1b (add-agent): each configured agent's native MCP config file contains a Spec-N-Roll server entry pointing at `.spec-n-roll/cli/bin/spec-n-roll-mcp`.
