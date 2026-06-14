# Updates and Migrations

How Spec-N-Roll classifies project files during updates and what is safe to overwrite.

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
| `.spec-n-roll/config/set-lists.json`        | user                  |
| `.spec-n-roll/config/manifesto/`            | user                  |
| `.spec-n-roll/config/project-metadata.json` | user                  |
| `specs/001-my-feature/spec.md`              | user                  |
| `specs/001-my-feature/workflow-state.json`  | user (under `specs/`) |
| `living-specs/auth.feature`                 | user                  |
| `.agents/skills/speckit-specify/SKILL.md`   | toolkit               |

## Update flow (implemented)

Implementation: `src/cli/commands/update.ts`, backup helper `src/updates/backup.js`, MCP refresh `src/agents/mcp-config.ts`.

```bash
spec-n-roll update
spec-n-roll update --dry-run
spec-n-roll update --force
```

When `update` runs:

1. Read configured agents from `.spec-n-roll/config/workflow.config.json`.
2. Plan user-owned config schema migrations (`src/updates/migration.ts`).
3. Evaluate extension compatibility warnings from `.spec-n-roll/compatibility.json` (`src/extensions/compatibility.ts`).
4. Plan toolkit-owned overwrites: binaries, platform scripts, `.spec-n-roll/AGENTS.md`, workflow skills under `.agents/skills/`, extension manifests, and `compatibility.json`.
5. For each toolkit-owned file that exists and differs from the new toolkit content, write a `.bak` sibling before overwrite.
6. Apply confirmed config migrations, then apply toolkit-owned overwrites. User-owned paths outside migrated configs (`specs/`, `living-specs/`) remain byte-identical.
7. Refresh the Spec-N-Roll MCP server entry in every configured agent's MCP config targets (stdio path `.spec-n-roll/cli/bin/spec-n-roll-mcp`).

`--dry-run` reports the same plan without writing files, migrating configs, or refreshing MCP config.

## Config schema migration (implemented)

Implementation: tolerant reader `src/config/reader.ts`, migration planner/applier `src/updates/migration.ts`.

- Config files carry a `schemaVersion` field. New projects are initialized at workflow config schema version `2`.
- The tolerant reader parses supported prior schema versions, ignores unknown fields, and maps legacy field names when doing so protects user-authored data.
- Migrations run **only** during `spec-n-roll update`, not at runtime.
- Non-breaking migrations apply automatically.
- Breaking migrations (for example removal of deprecated `legacyTierRouting`) require `--force`.

## Pre-1.0 compatibility policy

Application versions before `1.0.0` are pre-release. Breaking changes to
commands, config shapes, extension contracts, and internal APIs are acceptable
when they create the right stable interface.

Do not add compatibility layers solely to support pre-1.0 behavior. Preserve or
migrate user-authored data when practical, but remove legacy aliases, fallback
branches, and old contract shapes when they would clutter the implementation or
weaken the application API.

Migrated files:

| File                                        | Migration behavior                                      |
| ------------------------------------------- | ------------------------------------------------------- |
| `.spec-n-roll/config/workflow.config.json`  | v1 → v2 field normalization; breaking when legacy flags |
| `.spec-n-roll/config/project-metadata.json` | v1 → current schema field normalization (non-breaking)  |
| `.spec-n-roll/config/set-lists.json`          | Generated on first update when missing (non-breaking)   |

## Set lists and lifecycle terminology (feature 007)

Implementation: `src/setlists/`, `src/core/step-lifecycle.ts`, `src/updates/migration.ts`.

User-facing copy now says **set list** instead of **complexity** or **workflow variant** when describing workflow selection during specify and triage. Persisted JSON may still use `workflowVariantId` in `workflow-state.json` until a future schema bump; that field stores the selected set list’s linked workflow id.

### New projects

`spec-n-roll init` writes `.spec-n-roll/config/set-lists.json` with papercut, quick, and full entries and seeds manifesto template paths. Set lists are ordinary configuration data—disable, rename, or add entries without toolkit code changes.

### Existing projects without set-lists.json

On the first `spec-n-roll update` after upgrading to a toolkit that includes set lists, `migrateSetListsIfMissing` generates `set-lists.json` from `workflow.config.json` workflows when the file is absent. Review generated descriptions and enablement after update; the migration diagnostic mentions set lists explicitly.

### Step lifecycle (init / finalize)

Agents must call `step_init` before step work and `step_finalize` after validation succeeds. Skills and MCP tools surface manifesto context and hook call instructions at those boundaries. Do not mark a step complete via `workflow_state_write` alone when lifecycle metadata requires finalize.

### Terminology map for maintainers

| Legacy user-facing term | Current term        | Persisted field (unchanged)   |
| ----------------------- | ------------------- | ----------------------------- |
| Complexity triage       | Set list triage     | —                             |
| Workflow variant pick   | Set list selection  | `workflowVariantId` in state  |
| Tier (papercut/quick/full) | Named set list | Same ids as data in set-lists.json |

Migration docs and release notes may still mention legacy terms when explaining upgrades; product UI, CLI help, Ink labels, and agent-facing triage text should use **set list**.

## Extension compatibility warnings (implemented)

Implementation: `src/extensions/compatibility.ts`, matrix file `.spec-n-roll/compatibility.json`.

- `init` and every `update` refresh `.spec-n-roll/compatibility.json` from the running toolkit (initially an empty `incompatibleCombinations` array).
- During update, enabled extensions are checked against the compatibility matrix for the **target toolkit version**.
- Mismatches are reported as **warnings** in the update summary and Ink prompt.
- Compatibility warnings never block the update or subsequent workflow execution.

Example matrix entry:

```json
{
  "incompatibleCombinations": [
    {
      "extensionId": "cursor",
      "toolkitVersion": "0.2.0",
      "reason": "Cursor MCP merge format changed"
    }
  ]
}
```
