# CLI Remove Command Contract

Adds non-interactive parity for project removal (FR-052). Extends `specs/001-spec-n-roll-toolkit/contracts/cli-commands.md`.

## Command

```text
spec-n-roll remove [options]
```

Runs on the **full CLI** binary (project-local or global with resolved project root).

## Options

| Option | Description |
|--------|-------------|
| `--yes` | Skip confirmation prompt and proceed with removal |
| `--project-root <path>` | Optional absolute project root; defaults to cwd tree-walk result |

## Behavior

1. Resolve project root from `--project-root` or upward walk for initialized project (same rules as init/update).
2. Unless `--yes`, prompt: `Remove Spec N' Roll and all managed files from {projectRoot}? [y/N]`
3. On confirm:
   - Remove project-local CLI launchers under `.spec-n-roll/cli/bin/`
   - Remove `.spec-n-roll/cli/install.json`
   - Remove agent MCP entries and extension artifacts via same helpers as `config agent remove` for all configured agents
   - Remove `.spec-n-roll/config/`, `.spec-n-roll/bundled-extensions/`, `.spec-n-roll/compatibility.json`, and other toolkit-managed paths under `.spec-n-roll/`
   - MUST NOT delete user-owned `specs/` or `living-specs/` trees
4. Print summary of removed managed paths on success.
5. Exit code `0` on success; non-zero on user cancel or error.

## Interactive Parity

Global home option 3, Manage local option 3, and Re-install pre-step MUST call the same `runProjectRemove()` orchestrator with Ink `ConfirmDialog` instead of stdin prompt.

## Errors

| Condition | Message pattern |
|-----------|-----------------|
| Project not initialized | `Project is not initialized.` |
| User declined confirmation | Exit 1, no file changes |
