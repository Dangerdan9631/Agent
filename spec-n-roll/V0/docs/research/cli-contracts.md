# Non-Interactive CLI Contracts

## Scope

The non-interactive CLI contract covers commands invoked as `spec-n-roll <command> [arguments]`. These commands run synchronously, write human-readable or JSON output to stdout, report failures to stderr, and exit with a non-zero status when the requested operation cannot be completed.

Bare `spec-n-roll` is outside this contract because it starts the interactive CLI.

## General Contract

- Commands operate from the current project directory unless a command accepts an explicit path.
- Commands that read state must not mutate project files.
- Commands that mutate state must perform the same validation as the matching MCP operation when one exists.
- Deterministic command output intended for automation is JSON unless the command is explicitly version/help output.
- Commands must reject writes to locked task specifications.
- Commands must fail with actionable messages when required project initialization, configuration, or task artifacts are missing.

## Invocation and Version Resolution

### `spec-n-roll --global <command>`

Runs the globally available product command surface instead of a project-local installation.

### `spec-n-roll version`

Reports the active toolkit version and invocation context. When available, the report also includes dispatcher version, whether the resolved command is local or global, the local command path, and the latest known version.

## Project Setup and Maintenance

### `spec-n-roll init [path] [--agents <ids>]`

Initializes a project for Spec-n-Roll.

**Inputs**

- `path`: Optional target directory. Defaults to the current directory.
- `--agents`: Optional comma-separated list of agent identifiers.

**Effects**

- Creates project configuration for workflows, set lists, metadata, and selected agents.
- Installs product-managed assets required for local workflow execution.
- Creates or merges agent configuration for selected agents.

**Errors**

- Fails when required setup paths cannot be created.
- Fails rather than silently overwriting user-owned project data.

### `spec-n-roll update [--dry-run] [--force]`

Updates the project-local toolkit installation.

**Inputs**

- `--dry-run`: Reports planned changes without writing files.
- `--force`: Allows confirmed breaking configuration migrations.

**Effects**

- Refreshes product-managed assets.
- Preserves user-owned project content.
- Applies confirmed configuration migrations.
- Reports extension compatibility warnings.

**Errors**

- Fails when a required migration cannot be completed safely.
- Fails when product-managed files cannot be refreshed.

## Agent Configuration

### `spec-n-roll list agents [--enabled]`

Lists supported agents. With `--enabled`, only agents configured for the current project are listed.

### `spec-n-roll config agent add <agents>`

Adds one or more agents to an initialized project.

**Inputs**

- `agents`: Comma-separated agent identifiers.

**Effects**

- Adds agent workflow guidance and project-local agent configuration.
- Preserves existing configured agents and unrelated agent configuration.

### `spec-n-roll config agent remove <agents>`

Removes one or more agents from the project.

**Inputs**

- `agents`: Comma-separated agent identifiers.

**Effects**

- Removes the selected agents from project configuration.
- Removes Spec-n-Roll entries from those agents' project-local configuration.
- Preserves unrelated agents and unrelated configuration entries.

## Workflow State

### `spec-n-roll workflow state read --task-spec-id <id>`

Reads workflow progress for a task specification.

**Inputs**

- `task-spec-id`: Zero-padded numeric task specification id.

**Output**

- JSON workflow state including task identity, selected workflow, current operational status, and completed step information.

### `spec-n-roll workflow state write --task-spec-id <id> --workflow-variant-id <id> --last-completed-step-id <id> --current-step-id <id> --status <status>`

Writes workflow progress for a task specification.

**Inputs**

- `task-spec-id`: Zero-padded numeric task specification id.
- `workflow-variant-id`: Selected workflow id.
- `last-completed-step-id`: Last completed workflow step.
- `current-step-id`: Current in-progress step.
- `status`: `active`, `paused`, or `complete`.

**Effects**

- Updates the task specification workflow state after validation.

**Errors**

- Rejects invalid state transitions.
- Rejects step advancement that bypasses required step finalization.

## Task Specification Lifecycle

### `spec-n-roll task status set --task-spec-id <id> <status>`

Sets task specification lifecycle status.

**Inputs**

- `task-spec-id`: Zero-padded numeric task specification id.
- `status`: `Active`, `Complete`, or `Locked`.

**Effects**

- Updates the task specification lifecycle status.

**Errors**

- Rejects invalid status values.
- Rejects writes to locked task specifications.

### `spec-n-roll task checkbox set <completed> --task-spec-id <id> --task-id <ids...>`

Updates task completion checkboxes.

**Inputs**

- `completed`: `true` or `false`.
- `task-spec-id`: Zero-padded numeric task specification id.
- `task-id`: One or more task ids from the task list.

**Effects**

- Sets matching task checkboxes to the requested completion state.

**Errors**

- Fails when any requested task id does not exist.
- Rejects writes to locked task specifications.

## Project Metadata

### `spec-n-roll project metadata read`

Reads project metadata as JSON.

### `spec-n-roll project metadata write [options]`

Updates project metadata fields.

**Inputs**

- `--next-task-spec-id`: Next numeric task specification id.
- `--current-task-spec-id`: Current implementation task id.
- `--implementation-started-at`: Implementation start timestamp.

**Effects**

- Updates project metadata after validation.

## Step Artifacts and Frontmatter

### `spec-n-roll step init --task-spec-id <id> --step-id <id>`

Begins a workflow step boundary.

**Output**

- JSON step context including workflow state, applicable project rules, and hook instructions.

### `spec-n-roll step finalize --task-spec-id <id> --step-id <id> --validation-passed <bool>`

Completes a workflow step boundary after validation.

**Effects**

- Records step completion when validation passed.
- Returns after-step hook instructions.

### `spec-n-roll step instantiate --task-spec-id <id> --step-id <id> [--frontmatter <key=value...>]`

Creates a workflow step output artifact from its template.

**Effects**

- Creates the requested artifact in the task specification directory.

**Errors**

- Fails when the step has no output template.
- Rejects overwrites that are unsafe for the current workflow state.

### `spec-n-roll spec frontmatter update --task-spec-id <id> --field <key=value...>`

Updates non-status frontmatter fields for a specification.

**Errors**

- Rejects lifecycle status changes; status changes use `task status set`.

## Set Lists

### `spec-n-roll set-list list [--include-disabled]`

Lists configured set lists as JSON.

### `spec-n-roll set-list show <id>`

Reads one set list as JSON.

### `spec-n-roll set-list create --id <id> --name <name> --description <text> --workflow-id <id> --priority <n> [--enabled]`

Creates a set list.

### `spec-n-roll set-list update <id> [options]`

Updates set list fields.

### `spec-n-roll set-list enable <id>` / `spec-n-roll set-list disable <id>`

Toggles whether a set list participates in triage.

### `spec-n-roll set-list remove <id>`

Deletes a set list.

**Errors**

- Rejects removal or disablement that leaves no enabled set lists.

### `spec-n-roll set-list validate`

Validates set list references and enabled-count rules.

### `spec-n-roll set-list triage --intent <text>`

Evaluates an intent against enabled set lists and returns the proposed match as JSON.

## Repository Workflows

### `spec-n-roll repository-workflow types list`

Lists repository workflow type metadata.

### `spec-n-roll repository-workflow plan --workflow-type-id <id> [scope and bound options]`

Recommends a bounded discovery plan before repository analysis.

**Inputs**

- `workflow-type-id`: `repository-onboarding` or `repository-drift`.
- `--included-path`: Project-relative path to include. May be repeated.
- `--omitted-path`: Project-relative path to omit. May be repeated.
- `--max-directories`, `--max-files`, `--max-product-areas`: Optional discovery bounds.

### `spec-n-roll repository-workflow start --workflow-type-id <id> [--description <text>]`

Starts a repository workflow and returns the recommended discovery plan.

### `spec-n-roll repository-workflow drift run [--description <text>]`

Runs repository drift through specification-stage output and report generation.

### `spec-n-roll repository-workflow report read --task-spec-id <id>`

Reads a repository workflow report as JSON.

## Error Contract

Non-interactive commands must use non-zero exit status for failures. Error output must identify the failed contract condition and include remediation when the next action is known, such as initializing the project, selecting a valid task specification, resolving configuration validation errors, or running update.
