# Application Entry Points

## Scope

This document lists surfaces where Spec-n-Roll accepts input from users, agents, files, subprocesses, or external systems. It includes command surfaces, interactive input, MCP tools, slash-command skills, extension entry points, network-backed lookups, and file reads.

## Process Invocation

### Global Dispatcher

**Surface**: `spec-n-roll [--global] [-v|--version] [command...]`

**Inputs**

- Command-line arguments.
- Current working directory.
- `--global` local-vs-global resolution choice.
- Local executable presence and permissions under parent directories.
- Package metadata used for version reporting and source resolution.

**Purpose**

Routes the invocation to a project-local or global full CLI.

### Full Non-Interactive CLI

**Surface**: `spec-n-roll <command> [arguments]`

**Inputs**

- Command names, positional arguments, and flags.
- Current working directory as project root context.
- User confirmation on commands that prompt.

**Commands**

- `init`
- `version`
- `list agents`
- `update`
- `remove`
- `config agent add`
- `config agent remove`
- `workflow state read`
- `workflow state write`
- `task status set`
- `task checkbox set`
- `project metadata read`
- `project metadata write`
- `step init`
- `step finalize`
- `step instantiate`
- `spec frontmatter update`
- `set-list list`
- `set-list show`
- `set-list create`
- `set-list update`
- `set-list enable`
- `set-list disable`
- `set-list remove`
- `set-list validate`
- `set-list triage`
- `manifesto show`
- `repository-workflow types list`
- `repository-workflow plan`
- `repository-workflow start`
- `repository-workflow drift run`
- `repository-workflow report read`

### Interactive CLI

**Surface**: bare `spec-n-roll`

**Inputs**

- Keyboard navigation.
- Menu selection.
- Confirmation prompts.
- Text entry for setup, edit, and recovery flows.
- Current terminal size.
- Current working directory as project root context.

**Interactive areas**

- Project hub.
- Agent management.
- Workflow browsing.
- Set list browsing and editing.
- Manifesto viewing.
- Task specification browsing and guarded mutations.
- Repository workflow report browsing.
- Local and global toolkit management.
- Update, remove, reinstall, and recovery confirmation prompts.

## MCP Server

**Surface**: project-local stdio MCP server.

**Inputs**

- MCP tool calls and JSON payloads from configured agents.
- Current working directory as project root context.

**Tools**

- `workflow_state_read`
- `workflow_state_write`
- `task_spec_status_set`
- `project_metadata_read`
- `project_metadata_write`
- `task_checkbox_set`
- `step_init`
- `step_finalize`
- `step_output_instantiate`
- `spec_frontmatter_update`
- `set_list_read`
- `set_list_triage`
- `repository_workflow_types_list`
- `repository_workflow_start`
- `repository_workflow_plan`
- `repository_workflow_drift_run`
- `repository_workflow_report_read`

## Agent Slash Commands

**Surface**: generated agent skills under `.agents/skills/`.

**Inputs**

- User slash-command text handled by a configured coding agent.
- Agent interpretation of project files, MCP tool results, and maintainer responses.
- Optional arguments after the slash command.

**Commands**

- `/spec-n-specify <description>`
- `/spec-n-clarify [topic]`
- `/spec-n-roll [description]`
- `/spec-n-plan`
- `/spec-n-tasks`
- `/spec-n-analyze`
- `/spec-n-implement`
- `/spec-n-manifesto <global|stepId>`
- `/repository-onboarding`
- `/repository-drift`

## Extension Entry Points

### Extension Manifests

**Surface**: registered extension manifest files.

**Inputs**

- Extension id, name, target toolkit version, step declarations, hook declarations, workflow variants, and agent setup declarations.
- Enabled or disabled state from project workflow configuration.

### Extension Step Handlers

**Surface**: extension step entry point modules.

**Inputs**

- Active workflow context.
- Step id.
- Project root.
- Task specification identity.
- Extension-specific handler inputs.

### Extension Hook Handlers

**Surface**: before-step and after-step hook entry point modules.

**Inputs**

- Hook event name.
- Active step context.
- Project root.
- Task specification identity.
- Hook optionality.

### Agent Generators

**Surface**: bundled or registered agent extension setup declarations.

**Inputs**

- Agent id.
- MCP target paths.
- Rule target paths.
- Skill target paths.

## File-Based Inputs

Spec-n-Roll accepts project state through file reads. These files are user-controlled unless explicitly product-managed.

### Project Configuration

- `.spec-n-roll/config/workflow.config.json`
- `.spec-n-roll/config/project-metadata.json`
- `.spec-n-roll/config/set-lists.json`
- `.spec-n-roll/config/extensions/**/manifest.json`
- `.spec-n-roll/config/manifesto/global.md`
- `.spec-n-roll/config/manifesto/steps/*.md`

### Product-Managed Metadata and Assets

- `.spec-n-roll/compatibility.json`
- `.spec-n-roll/cli/package.json`
- `.spec-n-roll/cli/install.json`
- `.spec-n-roll/cli/bin/spec-n-roll`
- `.spec-n-roll/cli/bin/spec-n-roll-mcp`
- `.spec-n-roll/bundled-extensions/**/manifest.json`
- `.spec-n-roll/scripts/*`
- `.agents/skills/spec-n-*/SKILL.md`

### Task Specification Artifacts

- `specs/{id}-{slug}/spec.md`
- `specs/{id}-{slug}/plan.md`
- `specs/{id}-{slug}/tasks.md`
- `specs/{id}-{slug}/workflow-state.json`
- `specs/{id}-{slug}/repository-workflow-report.md`

### Living Behavior and Tests

- `living-specs/**/*.feature`
- `tests/step-definitions/**/*.mjs`
- Test files discovered during repository onboarding and drift.
- Documentation files discovered during repository onboarding and drift.
- Source files discovered during repository onboarding and drift.

### Agent Native Configuration

- Agent-specific MCP configuration files declared by enabled agent extensions.
- Agent-specific rule pointer files declared by enabled agent extensions.

### Package and Runtime Metadata

- Nearest `package.json` files used to identify package roots and versions.
- Build/version marker files used by the local bundle.
- Local `node_modules` presence used by living-spec test execution.

## Subprocess and Runtime Inputs

### Platform Script Execution

**Surface**: configured platform scripts.

**Inputs**

- Current platform.
- Shell availability.
- Script arguments.
- Subprocess exit status, stdout, and stderr.

### Cucumber Execution

**Surface**: living-spec behavior test run.

**Inputs**

- Living specification files.
- Step definition files.
- Scenario tag filters.
- Cucumber process exit status and output.

### NPM Version Lookup

**Surface**: `npm view spec-n-roll version --json`.

**Inputs**

- NPM executable on `PATH`.
- Network access available to npm.
- Registry response for the package version.

### NPM Global Install

**Surface**: interactive global install or reinstall flow.

**Inputs**

- NPM executable on `PATH`.
- Network access available to npm.
- User confirmation in the interactive CLI.
- NPM install output and exit status.

## Environment Inputs

- Current working directory.
- Operating system and path separator behavior.
- Available shell runtime for platform scripts.
- Executable permissions on local binaries.
- Terminal input and output capabilities.
- Filesystem permissions.
- PATH resolution for external commands such as npm and Cucumber.

## Explicit Non-Entry Points

- Spec-n-Roll does not expose an HTTP server.
- Spec-n-Roll does not accept inbound network webhooks.
- Spec-n-Roll does not expose a public remote API.
- Network-backed behavior is delegated to local subprocesses such as npm rather than a product-owned HTTP endpoint.
