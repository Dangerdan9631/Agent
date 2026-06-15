# MCP Server Contracts

## Scope

The MCP server contract covers the project-local Spec-n-Roll server exposed to configured agents. The MCP surface is the agent-safe interface for deterministic project mutations and structured reads.

Agents may edit prose artifacts after those artifacts are created, but they must use MCP tools for machine-readable state changes.

## General Contract

- The MCP server operates against the current project root.
- Tools return structured JSON text on success.
- Tools validate inputs before writing.
- Tools reject writes to locked task specifications.
- Tools preserve unrelated project content.
- Tool failures must include actionable remediation when possible.
- MCP tools that mirror CLI commands must enforce the same behavior as those commands.

## Agent Edit Boundaries

| Artifact or field | MCP required | Direct agent edit allowed |
| --- | --- | --- |
| Workflow state | Yes | No |
| Task specification lifecycle status | Yes | No |
| Project metadata | Yes | No |
| Task checkboxes | Yes | No |
| Step output artifact creation | Yes | No |
| Specification, plan, and task prose after creation | No | Yes |
| Living behavior specifications | No | Yes |

## Workflow State Tools

### `workflow_state_read`

Reads workflow state for a task specification.

**Input**

- `taskSpecId`: Zero-padded numeric task specification id.

**Output**

- Workflow state JSON including selected workflow, operational status, current step, and last completed step.

### `workflow_state_write`

Writes workflow state for a task specification.

**Input**

- `taskSpecId`: Zero-padded numeric task specification id.
- `workflowVariantId`: Selected workflow id.
- `lastCompletedStepId`: Last completed step id or empty state.
- `currentStepId`: Current step id when active.
- `status`: `active`, `paused`, or `complete`.

**Output**

- Updated workflow state.

**Errors**

- Rejects invalid status values.
- Rejects guarded step advancement that bypasses finalize.
- Rejects writes to locked task specifications.

## Task Specification Tools

### `task_spec_status_set`

Sets task lifecycle status.

**Input**

- `taskSpecId`: Zero-padded numeric task specification id.
- `status`: `Active`, `Complete`, or `Locked`.

**Output**

- Previous status and new status.

### `task_checkbox_set`

Updates task completion checkboxes.

**Input**

- `taskSpecId`: Zero-padded numeric task specification id.
- `taskIds`: One or more task ids.
- `completed`: Boolean completion state.

**Output**

- Updated completion state for each requested task id.

**Errors**

- Fails when any requested task id is missing.
- Rejects writes to locked task specifications.

### `spec_frontmatter_update`

Updates non-status frontmatter fields in a task specification.

**Input**

- `taskSpecId`: Zero-padded numeric task specification id.
- `fields`: Key-value frontmatter fields to merge.

**Output**

- Updated frontmatter.

**Errors**

- Rejects lifecycle status updates. Status changes use `task_spec_status_set`.

## Project Metadata Tools

### `project_metadata_read`

Reads project metadata.

**Input**

- None.

**Output**

- Project metadata including next task specification id and current implementation task when present.

### `project_metadata_write`

Updates project metadata.

**Input**

- Any supported writable project metadata fields.

**Output**

- Updated project metadata.

**Errors**

- Rejects invalid current-task references.
- Rejects malformed timestamps or task ids.

## Step Tools

### `step_init`

Starts a workflow step boundary.

**Input**

- `taskSpecId`: Zero-padded numeric task specification id.
- `stepId`: Workflow step id.

**Output**

- Step identity.
- Workflow state snapshot.
- Applicable project rules.
- Before-step hook instructions.
- Lifecycle metadata for the step.

### `step_finalize`

Finalizes a workflow step boundary.

**Input**

- `taskSpecId`: Zero-padded numeric task specification id.
- `stepId`: Workflow step id.
- `validationPassed`: Boolean validation attestation.

**Output**

- After-step hook instructions.
- Updated step lifecycle metadata.
- Recorded completion when validation passed.

**Errors**

- Rejects finalize without matching init.
- Rejects finalize for a different step than the initialized step.

### `step_output_instantiate`

Creates a step output artifact from a product template.

**Input**

- `taskSpecId`: Zero-padded numeric task specification id.
- `stepId`: Step id.
- `frontmatter`: Optional creation-time frontmatter fields.

**Output**

- Created artifact path.

**Errors**

- Fails when no template exists for the step.
- Rejects unsafe overwrites.

## Set List Tools

### `set_list_read`

Reads configured set lists.

**Input**

- Optional set list id.

**Output**

- Full set list configuration or the requested set list.

### `set_list_triage`

Evaluates user intent against enabled set lists.

**Input**

- `userIntent`: Natural-language feature or change description.

**Output**

- Eligible set lists.
- Proposed selected set list id.
- Selection rationale.
- Ambiguity or blocking information when applicable.

**Errors**

- Blocks when no enabled set lists exist.

## Repository Workflow Tools

### `repository_workflow_types_list`

Lists repository workflow types.

**Output**

- Workflow type metadata for repository onboarding and repository drift.

### `repository_workflow_plan`

Recommends repository discovery scope before analysis.

**Input**

- `workflowTypeId`: `repository-onboarding` or `repository-drift`.
- `scope`: Optional included and omitted paths.
- `bounds`: Optional discovery limits.

**Output**

- Recommended discovery plan, omitted areas, review checkpoints, and approval requirement.

### `repository_workflow_start`

Starts a repository workflow and returns the recommended discovery plan.

**Input**

- `workflowTypeId`: `repository-onboarding` or `repository-drift`.
- `description`: Optional maintainer goal.

**Output**

- Start result with recommended plan and initialization status.

### `repository_workflow_drift_run`

Runs repository drift through specification-stage output.

**Input**

- `description`: Optional maintainer goal.

**Output**

- Completed output with task specification id, slug, report path, and next steps, or a blocked result with remediation.

### `repository_workflow_report_read`

Reads a completed repository workflow report.

**Input**

- `taskSpecId`: Zero-padded numeric task specification id.

**Output**

- Report content and structured report metadata.

## Error Contract

MCP errors must identify:

- The tool that failed.
- The invalid or missing input when applicable.
- Whether any write was performed.
- The next known remediation step.

Common remediation includes initializing the project, creating the required task artifact first, selecting a valid task specification, resolving invalid configuration, or updating the local toolkit installation.
