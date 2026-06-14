# Contract: Set Lists

Defines configuration schema, CRUD commands, triage evaluation, and MCP read operations.

## Persistence

**Path**: `.spec-n-roll/config/set-lists.json`

**Schema version**: `1`

```json
{
  "schemaVersion": 1,
  "setLists": [
    {
      "id": "papercut",
      "name": "Papercut",
      "description": "Single-file or trivial changes with minimal ceremony",
      "workflowId": "papercut",
      "priority": 1,
      "enabled": true
    },
    {
      "id": "quick",
      "name": "Quick",
      "description": "Small features with specify, tasks, and implement",
      "workflowId": "quick",
      "priority": 2,
      "enabled": true
    },
    {
      "id": "full",
      "name": "Full",
      "description": "Full spec-kit flow with plan, tasks, and implement",
      "workflowId": "full",
      "priority": 3,
      "enabled": true
    }
  ]
}
```

Preconfigured entries are **data only** — runtime MUST NOT branch on these ids (FR-027).

## CLI Commands

Parent: `spec-n-roll set-list`

| Subcommand | Args | Action |
|------------|------|--------|
| `list` | `[--include-disabled]` | Print all set lists |
| `show` | `<id>` | Print one set list |
| `create` | `--id --name --description --workflow-id --priority [--enabled]` | Add entry |
| `update` | `<id> [--name] [--description] [--workflow-id] [--priority]` | Patch fields |
| `enable` | `<id>` | Set `enabled: true` |
| `disable` | `<id>` | Set `enabled: false` |
| `remove` | `<id>` | Delete entry (reject if last enabled) |
| `validate` | | Validate all references and enabled count |

All commands output JSON; validation failures exit non-zero with message.

## MCP Tools

| Tool | Purpose |
|------|---------|
| `set_list_read` | Read full config or single id |
| `set_list_triage` | Input user intent text; return ranked eligible set lists + selected id |

### set_list_triage Input

```json
{
  "userIntent": "fix typo in readme",
  "taskSpecId": "007",
  "slug": "step-manifesto-setlists"
}
```

### set_list_triage Output

```json
{
  "eligible": [
    { "id": "papercut", "name": "Papercut", "description": "...", "priority": 1 }
  ],
  "selectedId": "papercut",
  "selectionReason": "priority-tie-break",
  "ambiguous": false
}
```

When no enabled set lists: `blocking: true` with actionable message (FR-025 edge).

## Triage Rules

1. Consider only `enabled: true` entries (FR-024).
2. Return all `description` fields to agent as invocation instructions (FR-023).
3. Agent or heuristic may rank matches; when uncertain between multiple eligible, select lowest `priority` (FR-025).
4. No code path references `papercut`, `quick`, or `full` by name except init seed data and tests.

## Ink Interface

Routes: `set-lists-list`, `set-list-detail`, `set-list-edit`

- List shows name, enabled state, priority, workflow id.
- Detail shows full fields and validation status.
- Edit allows name, description, priority, enabled toggle; workflow id selection from configured workflows.
- Save calls same validation as CLI `update`.

## Migration

On read when `set-lists.json` missing:

1. If `workflow.config.json` has `workflows[]`, generate set lists with incremented priorities from workflow order.
2. Emit one-time diagnostic suggesting review of descriptions.
3. User-facing text uses "set list" not "complexity" (FR-032).

## Acceptance Tests

| Scenario | Expected |
|----------|----------|
| Fresh init | Three default set lists present |
| Disable `quick` | Triage excludes it |
| Two matches, priorities 2 and 5 | Selects priority 2 |
| Remove last enabled | Validation error |
| CLI create → MCP read | Same JSON |
| Ink edit → CLI show | Same state |
| Code search for hard-coded tier union | None in `src/setlists`, `src/specs/triage` |
