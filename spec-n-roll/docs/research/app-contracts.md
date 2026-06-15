# Interactive CLI Contracts

## Scope

The interactive CLI contract covers the application launched by running bare `spec-n-roll`. It provides a keyboard-first interface for browsing project state, managing configuration, and invoking guarded project operations.

The interactive application must call the same underlying project operations as the non-interactive CLI. It must not create a separate behavior contract for state changes.

## General Interaction Contract

- The application starts at a main menu.
- Arrow keys move focus through lists.
- `Enter` activates the focused item.
- `b` and `Esc` return to the previous screen.
- `?` toggles key hints.
- `q` starts a quit flow.
- Destructive or overwrite-capable operations require explicit confirmation.
- Read-only screens must not mutate project files.
- Mutation screens must surface validation errors without leaving the user unsure whether a write occurred.

## Main Menu Contract

The main menu exposes these sections:

- **Project**: Project metadata, Spec Manifestos, set lists, and task specification browsing.
- **Agents**: Configured and available agent management.
- **Workflows**: Workflow definitions and step details.
- **Extensions**: Extension management placeholder until extension management is available.
- **Manage Spec N' Roll**: Initialization, version details, and update flows.
- **Quit**: Exit confirmation.

## Project Screens

### Project Hub

Shows project-level status and entry points for project-owned data.

**Contract**

- Must identify whether the current directory is initialized for Spec-n-Roll.
- Must offer project metadata inspection when initialized.
- Must offer read-only Spec Manifesto inspection.
- Must offer set list browsing and editing.
- Must offer task specification browsing when task specifications exist.

### Project Metadata View

Shows project metadata fields.

**Contract**

- Must display next task specification id.
- Must display the current implementation task when one is active.
- Must display implementation start time when one is recorded.
- Must not edit metadata directly from the read view.

### Spec Manifesto View

Shows project-wide and step-specific rules.

**Contract**

- Must display global rules when present.
- Must display step-scoped rules when present.
- Must clearly represent missing manifesto content as absent rather than empty policy.
- Must be read-only.

## Set List Screens

### Set List List

Shows configured set lists.

**Contract**

- Must display name, enabled state, priority, and workflow id.
- Must include disabled set lists when browsing configuration.
- Must provide navigation to detail and edit flows.

### Set List Detail

Shows one set list.

**Contract**

- Must display id, name, description, workflow id, priority, enabled state, and validation status.
- Must identify invalid workflow references.

### Set List Edit

Edits one set list.

**Contract**

- Must allow editing name, description, priority, enabled state, and workflow selection.
- Must validate before saving.
- Must reject edits that leave no enabled set lists.
- Must preserve unchanged fields.

## Agent Screens

### Agent List

Shows supported and configured agents.

**Contract**

- Must distinguish configured agents from available but unconfigured agents.
- Must provide flows to add or remove agents.
- Must preserve unrelated agent configuration when changing one agent.

### Agent Add

Adds an agent to the project.

**Contract**

- Must require explicit selection.
- Must use the same add-agent contract as the non-interactive CLI.
- Must report generated or updated agent configuration.

### Agent Remove

Removes an agent from the project.

**Contract**

- Must require confirmation before removal.
- Must use the same remove-agent contract as the non-interactive CLI.
- Must preserve all unrelated agent and MCP configuration.

## Workflow Screens

### Workflow List

Shows configured workflow definitions.

**Contract**

- Must display workflow name, id, and step sequence.
- Must identify the default workflow.
- Must expose disabled or invalid references as validation information when available.

### Workflow Detail

Shows one workflow and its steps.

**Contract**

- Must list ordered step ids.
- Must identify built-in, extension, and hook-backed steps when known.
- Must remain read-only unless a future edit contract is introduced.

## Manage Screens

### Local Home

Shows local project setup status.

**Contract**

- Must identify whether the current project has a local Spec-n-Roll installation.
- Must provide entry points for initialization and update when applicable.

### Global Home

Shows global toolkit status.

**Contract**

- Must display available global version information when known.
- Must provide enough context for the user to choose local or global management actions.

### Version Screen

Shows version details.

**Contract**

- Must display active toolkit version.
- Must display local/global invocation context when known.
- Must display update availability when known.

### Update Screen

Applies toolkit updates.

**Contract**

- Must present planned changes before writing.
- Must identify product-managed files that will be overwritten.
- Must identify backups that will be created for locally modified product-managed files.
- Must identify configuration migrations and compatibility warnings.
- Must require confirmation before applying changes.

### Init Screen

Initializes a project.

**Contract**

- Must collect required setup choices, including agent selection.
- Must report the files and configuration that will be created or updated.
- Must avoid silent overwrites of user-owned project content.

## Task Specification Screens

### Task Spec List

Shows available task specifications.

**Contract**

- Must display task specification id, slug, lifecycle status, and workflow progress when available.
- Must distinguish active, complete, and locked task specifications.

### Task Spec Detail

Shows one task specification.

**Contract**

- Must display lifecycle status.
- Must display workflow operational status and completed step information.
- Must provide navigation to guarded task operations when available.

### Task Status Set

Changes task lifecycle status.

**Contract**

- Must require an explicit target status.
- Must use the same validation as the non-interactive task status command.
- Must reject writes to locked task specifications.

### Task Checkbox Set

Changes task completion state.

**Contract**

- Must require explicit task id selection.
- Must use the same validation as the non-interactive task checkbox command.
- Must report failed ids without partial ambiguity.

## Repository Workflow Screens

### Repository Workflow List

Shows repository workflow reports or workflow run summaries when available.

**Contract**

- Must identify onboarding and drift workflow outputs.
- Must surface completed report references.
- Must leave living specifications and tests unchanged during specify-stage report browsing.

### Repository Workflow Report Detail

Shows one repository workflow report.

**Contract**

- Must display workflow type, discovery scope, evidence summary, findings, blockers, and next steps when present.
- Must be read-only.

## Recovery and Confirmation Contract

When the application detects partial artifacts for an incomplete step, it must offer exactly these choices:

- **Restart**: Overwrite partial artifacts and restart the step.
- **Cancel**: Leave artifacts in place and keep the workflow paused.
- **Force clean**: Delete partial artifacts and restart the step.

One prompt covers the step. The application must not prompt once per file.

## Error Contract

Interactive errors must identify what failed, what data was affected, and whether any write occurred. When remediation is known, the screen must state the next action, such as initializing the project, selecting a valid workflow, fixing invalid configuration, or retrying an update.
