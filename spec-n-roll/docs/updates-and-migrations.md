# Updates and Migrations

How spec-n-roll classifies project files during updates and what is safe to overwrite.

Toolkit docs live in the repository root `docs/` only — they are **not** installed into user projects by `init` or `update`.

## File ownership (implemented)

Ownership is determined by **directory prefix only** — there are no per-file overrides. Implementation: `src/updates/ownership.ts`.

| Owner       | Path prefixes                                     | Update behavior                                                                          |
| ----------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **User**    | `.spec-n-roll/config/`, `specs/`, `living-specs/` | Preserve byte-for-byte unless an explicit config migration is confirmed                  |
| **Toolkit** | `.spec-n-roll/` (except `config/`), `.agents/`    | Overwrite on update; write `.bak` sibling when a toolkit-owned file was locally modified |

### Excluded from project ownership

Repository root `docs/` (toolkit-authored documentation) is never copied into user projects and is not classified by project ownership rules.

### Examples

| Path                                        | Owner                 |
| ------------------------------------------- | --------------------- |
| `.spec-n-roll/cli/bin/spec-n-roll`          | toolkit               |
| `.spec-n-roll/config/workflow.config.json`  | user                  |
| `.spec-n-roll/config/project-metadata.json` | user                  |
| `specs/001-my-feature/spec.md`              | user                  |
| `specs/001-my-feature/workflow-state.json`  | user (under `specs/`) |
| `living-specs/auth.feature`                 | user                  |
| `.agents/skills/speckit-specify/SKILL.md`   | toolkit               |

## Update flow (implemented)

Implementation: `src/cli/commands/update.ts`, backup helper `src/updates/backup.ts`, MCP refresh `src/agents/mcp-config.ts`.

```bash
spec-n-roll update --yes
spec-n-roll update --dry-run
```

When `update` runs (interactively or with `--yes`):

1. Read configured agents from `.spec-n-roll/config/workflow.config.json`.
2. Plan toolkit-owned overwrites: binaries, platform scripts, `.spec-n-roll/AGENTS.md`, workflow skills under `.agents/skills/`, bundled extension manifests, and `compatibility.json`.
3. For each toolkit-owned file that exists and differs from the new toolkit content, write a `.bak` sibling before overwrite.
4. Apply overwrites. User-owned paths (`.spec-n-roll/config/`, `specs/`, `living-specs/`) remain byte-identical.
5. Refresh the spec-n-roll MCP server entry in every configured agent's MCP config targets (stdio path `.spec-n-roll/cli/bin/spec-n-roll-mcp`).

`--dry-run` reports the same plan without writing files or refreshing MCP config.

## TODO — not yet implemented

The following update and migration behaviors are planned for later phases:

- **Config schema migration** — tolerant reader and incremental migrations at update time (US10)
- **Extension compatibility warnings** — advisory checks from `.spec-n-roll/compatibility.json` surfaced in update summary (US10)
- **Breaking migration confirmation** — interactive prompt unless `--yes` with `--confirm-migration` (US10)
