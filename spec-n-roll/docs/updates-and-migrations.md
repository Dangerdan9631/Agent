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

## TODO — not yet implemented

The following update and migration behaviors are planned for later phases:

- **`spec-n-roll update` command** — toolkit-owned overwrite flow, dry-run summary, and version reporting (US9)
- **`.bak` backup integration in update** — `src/updates/backup.ts` exists; update command does not call it yet
- **Config schema migration** — tolerant reader and incremental migrations at update time (US10)
- **Extension compatibility warnings** — advisory checks from `.spec-n-roll/compatibility.json` (US10)
- **MCP config path refresh** — refresh spec-n-roll MCP binary paths in agent MCP config on update (US9)
