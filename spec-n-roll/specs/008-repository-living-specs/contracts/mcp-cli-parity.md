# Contract: MCP and CLI Parity

Repository workflow operations must be available through MCP and CLI with shared core behavior.

## Surfaces

| Capability | MCP Tool | CLI Command |
|------------|----------|-------------|
| List repository workflow types | `repository_workflow_types` | `spec-n-roll repository workflow list` |
| Recommend discovery plan | `repository_workflow_plan` | `spec-n-roll repository workflow plan` |
| Run onboarding specify workflow | `repository_onboarding_start` | `spec-n-roll repository onboarding` |
| Run drift specify workflow | `repository_drift_start` | `spec-n-roll repository drift` |
| Read report | `repository_workflow_report_read` | `spec-n-roll repository workflow report` |

All adapters MUST delegate to `src/repository/` core services.

## Shared Input Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectRoot` | string | yes for MCP, implicit for CLI | Absolute project root |
| `scope` | object | no | Project-relative paths, living-spec targets, product areas, or command hints |
| `bounds` | object | no | Discovery limits |
| `description` | string | no | Maintainer goal for the run |
| `approvePlan` | boolean | no | Whether to proceed with recommended plan in non-interactive mode |

## Output Requirements

1. CLI JSON and MCP payloads MUST use the same field names.
2. Errors MUST include clear stopping guidance and avoid partial artifact writes.
3. Report and specify output paths MUST be project-relative in JSON responses.
4. Interactive CLI/Ink MAY present richer UI, but persisted artifacts MUST match core output.

## Parity Test Matrix

| Scenario | Expected |
|----------|----------|
| List workflow types | Same ids and descriptions |
| Missing init | Same blocking message category |
| Plan recommendation | Same included/omitted paths and checkpoints |
| Onboarding completion | Same `specifyOutputRef` and report path shape |
| Drift completion | Same drift categories and test gap counts |
| Report read | Same markdown content and metadata |
