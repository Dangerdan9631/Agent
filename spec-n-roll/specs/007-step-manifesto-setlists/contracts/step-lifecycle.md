# Contract: Step Lifecycle (Init / Finalize)

Defines MCP tools, CLI commands, and behavioral contract for deterministic step boundaries.

## Operations

| Surface | Init | Finalize |
|---------|------|----------|
| MCP | `step_init` | `step_finalize` |
| CLI | `spec-n-roll step init` | `spec-n-roll step finalize` |

Both MUST delegate to `runStepInit()` / `runStepFinalize()` in `src/core/step-lifecycle.ts`.

## step_init

### Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `taskSpecId` | string | yes | Three-or-more-digit task spec id |
| `slug` | string | yes | Task spec slug |
| `stepId` | string | yes | Workflow step id to initialize |

### Output (success)

```json
{
  "taskSpecId": "007",
  "slug": "step-manifesto-setlists",
  "stepId": "plan",
  "setListId": "quick",
  "workflowState": { },
  "manifestos": [
    { "scope": "global", "path": ".spec-n-roll/config/manifesto/global.md", "content": "..." },
    { "scope": "step", "stepId": "plan", "path": ".spec-n-roll/config/manifesto/steps/plan.md", "content": "..." }
  ],
  "beforeHooks": [
    {
      "phase": "before",
      "command": "speckit-git-commit",
      "description": "Commit spec artifacts",
      "optional": false,
      "source": "specify-extensions-yml",
      "extension": "git-commit"
    }
  ],
  "diagnostics": [],
  "blocking": false
}
```

### Output (blocking)

When active step cannot be resolved or state is inconsistent:

```json
{
  "blocking": true,
  "message": "Cannot initialize step: no active workflow state for task spec 007",
  "diagnostics": []
}
```

### Behavior

1. MUST be first required action in generated agent step instructions (FR-002).
2. MUST load global manifesto when present (FR-004).
3. MUST load step manifesto only when filename/id matches `stepId` (FR-005).
4. MUST return enabled before-hook instructions (FR-006).
5. MUST update lifecycle metadata to `in-progress` with `initAt` timestamp (FR-007).
6. Invalid hook config → non-blocking `diagnostics`; init still succeeds (edge case).

## step_finalize

### Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `taskSpecId` | string | yes | Task spec id |
| `slug` | string | yes | Task spec slug |
| `stepId` | string | yes | Step being finalized |
| `validationPassed` | boolean | yes | Agent attests step output validated |

### Output (success)

```json
{
  "taskSpecId": "007",
  "slug": "step-manifesto-setlists",
  "stepId": "plan",
  "validationStatus": "passed",
  "afterHooks": [],
  "completionEligible": true,
  "alreadyFinalized": false,
  "workflowState": {
    "lastCompletedStepId": "plan",
    "lifecycle": { "status": "completed", "finalizedAt": "2026-06-14T12:00:00.000Z" }
  }
}
```

### Behavior

1. MUST reject completion without prior init for same `stepId` (FR-010).
2. MUST reject marking step complete when `validationPassed` is false.
3. MUST return after-hook instructions before recording completion (FR-011).
4. MUST update `lastCompletedStepId` and lifecycle only when eligible (FR-012).
5. Second finalize → `alreadyFinalized: true`, no duplicate metadata writes.
6. Direct `workflow_state_write` attempting to complete step without finalize → rejected by validation in core writer (FR-009).

## Agent Skill Requirements

Every executable workflow step skill (`spec-n-plan`, `spec-n-tasks`, `spec-n-implement`, etc.) MUST:

1. Instruct agent to call `step_init` (MCP) before any step work.
2. Instruct validation of step output.
3. Instruct `step_finalize` before claiming step complete.
4. Instruct calling mandatory hooks from init/finalize responses before proceeding.

## CLI Display

CLI commands print JSON to stdout (existing convention) with optional `--pretty`. Errors use `exitOnCoreError` pattern.

## Acceptance Tests

| Scenario | Expected |
|----------|----------|
| Init before work | `lifecycle.initAt` set; before hooks returned |
| Finalize without init | Error; step not completed |
| Finalize with validation false | Error; not completed |
| Finalize after init + validation | `lastCompletedStepId` updated |
| Double finalize | `alreadyFinalized: true`; idempotent |
| Global + step manifesto scope | Both labeled in `manifestos` |
| Wrong step manifesto | Only global loaded |
| Enabled before hook | Only in init; not in finalize |
| Enabled after hook | Only in finalize |
