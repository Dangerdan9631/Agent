# MCP Tool Contract

The project-local MCP server at `.spec-n-roll/cli/bin/spec-n-roll-mcp` (stdio transport) is the agent interface for deterministic workflow mutations. It shares `src/core/` with the full CLI — every tool below has a matching non-interactive CLI subcommand (SC-012).

**Registration**: `init` installs the MCP binary and registers it in agent MCP configuration. MCP MUST never target the global dispatcher or full CLI binary directly.

**Version lock**: MCP and full CLI binaries MUST share the same toolkit version. Skew surfaces as an error with remediation to re-run `update` or `init`.

## Agent Edit Boundaries

| Artifact / field | Agent via MCP | Agent direct edit |
|------------------|---------------|-------------------|
| `workflow-state.json` | Required | Out of contract |
| `spec.md` YAML frontmatter (`status`) | Required | Out of contract |
| `spec.md` / `plan.md` / `tasks.md` prose bodies | N/A | Allowed after template instantiation |
| `project-metadata.json` | Required | Out of contract |
| `tasks.md` completion checkboxes | Required | Out of contract |
| `living-specs/*.feature` | N/A | Allowed (fully agent-managed) |

Agents MUST instantiate step output templates via MCP before editing prose. Editing a non-existent step output file is out of contract.

## Tools

### `workflow_state_read`

Reads `workflow-state.json` for a task spec.

**Parameters**:

- `taskSpecId` (string, required): Numeric ID (e.g. `001`)
- `slug` (string, required): Task spec slug

**Returns**: Parsed workflow state per `contracts/workflow-state.schema.json`.

**CLI parallel**: `spec-n-roll workflow state read --task-spec-id <id> --slug <slug>`

---

### `workflow_state_write`

Writes or updates `workflow-state.json` after a workflow step completes or on recovery.

**Parameters**:

- `taskSpecId` (string, required)
- `slug` (string, required)
- `workflowVariantId` (string, required)
- `lastCompletedStepId` (string | null, required)
- `currentStepId` (string | null, optional)
- `status` (enum: `active` | `paused` | `complete`, required)

**Returns**: Updated workflow state.

**CLI parallel**: `spec-n-roll workflow state write [options]`

---

### `task_spec_status_set`

Updates `status` in `spec.md` YAML frontmatter (`Active` | `Complete` | `Locked`).

**Parameters**:

- `taskSpecId` (string, required)
- `slug` (string, required)
- `status` (enum: `Active` | `Complete` | `Locked`, required)

**Returns**: Confirmation with previous and new status.

**CLI parallel**: `spec-n-roll task status set --task-spec-id <id> --slug <slug> --status <status>`

---

### `project_metadata_read`

Reads `.spec-n-roll/config/project-metadata.json`.

**Parameters**: none

**Returns**: Parsed metadata per `contracts/project-metadata.schema.json`.

**CLI parallel**: `spec-n-roll project metadata read`

---

### `project_metadata_write`

Updates project metadata (e.g. `nextTaskSpecId`, current implementation task).

**Parameters**: Subset of `project-metadata.schema.json` fields to update.

**Returns**: Updated metadata.

**CLI parallel**: `spec-n-roll project metadata write [options]`

---

### `task_checkbox_set`

Toggles a task completion checkbox in `tasks.md`.

**Parameters**:

- `taskSpecId` (string, required)
- `slug` (string, required)
- `taskIds` (string[], required, min 1): Checkbox identifiers (e.g. `T042`, `T043`); all must exist in the same task spec `tasks.md`
- `completed` (boolean, required)

**Returns**: Confirmation with updated checkbox state for each task id.

**CLI parallel**: `spec-n-roll task checkbox set --task-spec-id <id> --slug <slug> --task-id <id...> --completed <true|false>`

---

### `step_output_instantiate`

Copies a toolkit-owned step output template into the task spec directory.

**Parameters**:

- `taskSpecId` (string, required)
- `slug` (string, required)
- `stepId` (string, required): e.g. `specify`, `plan`, `tasks`
- `frontmatter` (object, optional): Frontmatter values passed at creation (e.g. `status: Active`)

**Returns**: Path to instantiated file relative to project root.

**CLI parallel**: `spec-n-roll step instantiate --task-spec-id <id> --slug <slug> --step-id <stepId> [--frontmatter key=value ...]`

**Notes**: Template files contain inline fill instructions. Agents edit prose after instantiation; further frontmatter changes use `task_spec_status_set` or dedicated frontmatter tools — not direct YAML edits.

---

### `spec_frontmatter_update`

Updates non-status frontmatter fields in `spec.md` via the core library.

**Parameters**:

- `taskSpecId` (string, required)
- `slug` (string, required)
- `fields` (object, required): Key-value pairs to merge into frontmatter (excluding `status` — use `task_spec_status_set`)

**Returns**: Updated frontmatter snapshot.

**CLI parallel**: `spec-n-roll spec frontmatter update --task-spec-id <id> --slug <slug> [options]`

## Error Contract

All tools return structured errors when:

- Target task spec is `Locked` (writes rejected)
- Required artifacts are missing (e.g. instantiate before read)
- Version skew between MCP and full CLI binaries
- Schema validation fails on read/write

Errors MUST include remediation guidance (e.g. run `init`, `update`, or instantiate step output first).
