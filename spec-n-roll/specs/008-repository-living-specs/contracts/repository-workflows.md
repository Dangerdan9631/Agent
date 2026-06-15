# Contract: Repository Workflow Types

Defines repository onboarding and repository drift workflow behavior across agent, CLI, and MCP surfaces.

## Workflow Types

| ID | Purpose | Scope Rule | End State |
|----|---------|------------|-----------|
| `repository-onboarding` | Build proposed living-spec and test work for areas without living specs | Use when selected scope has absent or partial living-spec coverage | One forward specify-stage output and report |
| `repository-drift` | Refresh proposed living-spec and test work for areas with existing living specs | Use when selected scope already has living specs | One forward specify-stage output and report |

Mixed coverage MUST be handled through separate scoped runs.

## Operation: Start Repository Workflow

### Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowTypeId` | string | yes | `repository-onboarding` or `repository-drift` |
| `scope` | object | no | Project-relative paths, living-spec targets, product areas, or command hints |
| `description` | string | no | Maintainer-provided goal; default is derived from workflow type and scope |
| `bounds` | object | no | Optional discovery limits for large repositories |

### Output

```json
{
  "workflowTypeId": "repository-onboarding",
  "recommendedPlan": {
    "includedPaths": ["src/cli"],
    "omittedPaths": ["src/cli/ink"],
    "testMappingStrategy": "Map behavior-facing tests first, then mark gaps.",
    "reviewCheckpoints": ["approve discovery scope", "complete specify interview"]
  },
  "requiresApproval": true,
  "initialized": true
}
```

### Behavior

1. MUST verify Spec-n-Roll scaffolding exists before discovery.
2. MUST recommend a discovery plan before analysis begins.
3. MUST allow maintainers to accept, narrow, broaden, or omit scope before discovery.
4. MUST not modify living specs, tests, or implementation files during specify.
5. MUST run the normal specify interview with repository evidence injected as context.
6. MUST end after specify and report next steps for clarify, plan, tasks, and implementation.

## Operation: Approve Discovery Plan

### Input

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflowTypeId` | string | yes | Workflow type being approved |
| `approvedPlan` | object | yes | Final discovery scope and bounds |

### Output

```json
{
  "status": "discovering",
  "approvedPlan": {
    "includedPaths": ["src/specs", "tests/integration"],
    "omittedPaths": ["dist"]
  }
}
```

### Behavior

1. MUST record approved scope in the run report.
2. MUST limit discovery to approved paths and bounds.
3. MUST include omitted areas as recommended future scoped runs.

## Operation: Complete Repository Workflow

### Output

```json
{
  "status": "complete",
  "taskSpecId": "008",
  "slug": "repository-living-specs",
  "specifyOutputRef": "specs/008-repository-living-specs/spec.md",
  "reportPath": "specs/008-repository-living-specs/repository-workflow-report.md",
  "nextSteps": ["clarify", "plan", "tasks", "implement"]
}
```

### Behavior

1. MUST produce exactly one forward specify-stage output.
2. MUST produce one repository workflow report.
3. MUST leave `living-specs/` and tests unchanged until downstream implementation.
4. MUST include blockers instead of partial output when required files, commands, or maintainer decisions are unavailable.

## Acceptance Tests

| Scenario | Expected |
|----------|----------|
| Missing init | Clear error and no artifact writes |
| Onboarding without living specs | One specify output; proposed `.feature` additions in spec only |
| Drift with living specs | Findings compare existing specs to code/tests/docs |
| Mixed coverage | Requires separate scoped runs |
| Large scope | Bounded plan and omitted areas recorded |
| Completion | Ends after specify; plan/tasks/implement not run automatically |
