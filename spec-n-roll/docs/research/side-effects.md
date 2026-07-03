# Application Side Effects

## Scope

This document lists surfaces where Spec-n-Roll affects state outside its internal process. It includes file writes, file creation, deletion, backups, subprocess execution, stdout and stderr output, MCP responses, and network-affecting subprocesses.

## Console and Process Effects

- Writes command results to stdout.
- Writes diagnostics and failures to stderr.
- Sets process exit status for failed CLI commands.
- Starts child processes for npm operations and living-spec test execution.
- Reads child process exit status and output to decide workflow results.

## Project Initialization Effects

`spec-n-roll init` can create or update:

- `.spec-n-roll/`
- `.spec-n-roll/cli/bin/spec-n-roll`
- `.spec-n-roll/cli/bin/snr`
- `.spec-n-roll/cli/bin/spec-n-roll-mcp`
- Windows command shims for local CLI and MCP binaries.
- `.spec-n-roll/AGENTS.md`
- `.spec-n-roll/bundled-extensions/{agentId}/manifest.json`
- `.spec-n-roll/compatibility.json`
- `.spec-n-roll/config/`
- `.spec-n-roll/config/workflow.config.json`
- `.spec-n-roll/config/project-metadata.json`
- `.spec-n-roll/config/set-lists.json`
- `.spec-n-roll/config/manifesto/global.md`
- `.spec-n-roll/config/manifesto/steps/`
- `.agents/skills/spec-n-*/SKILL.md`
- `specs/`
- `living-specs/`
- Agent-native MCP configuration files.
- Agent-native rule pointer files.

It can also set executable permissions on installed local binaries.

## Toolkit Update Effects

`spec-n-roll update` can:

- Overwrite product-managed files under `.spec-n-roll/` outside `.spec-n-roll/config/`.
- Overwrite managed generated skills under `.agents/skills/spec-n-*`.
- Refresh bundled extension manifests.
- Refresh local CLI and MCP binaries.
- Refresh `.spec-n-roll/compatibility.json`.
- Create `.bak` backups beside locally modified product-managed files before overwrite.
- Apply confirmed migrations to user-owned configuration files.
- Refresh Spec-n-Roll entries in configured agents' native MCP configuration files.
- Report extension compatibility warnings.

`spec-n-roll update --dry-run` reports planned effects but must not write files.

## Toolkit Removal Effects

`spec-n-roll remove` can:

- Remove Spec-n-Roll entries from configured agents' native MCP configuration files.
- Remove agent-specific integration artifacts owned by Spec-n-Roll.
- Delete `.spec-n-roll/`.

It preserves user-owned `specs/` and `living-specs/` content.

## Agent Configuration Effects

`spec-n-roll config agent add` can:

- Update `.spec-n-roll/config/workflow.config.json`.
- Install or refresh bundled extension manifests for the added agents.
- Create or merge agent-native MCP configuration files.
- Create or update agent rule pointer files.
- Create or update generated agent skill files.

`spec-n-roll config agent remove` can:

- Update `.spec-n-roll/config/workflow.config.json`.
- Remove the selected agents' Spec-n-Roll MCP entries from agent-native configuration.
- Remove selected agents' rule pointer files when they are owned by Spec-n-Roll.
- Remove selected agents' extension artifacts when they are owned by Spec-n-Roll.

Both operations preserve unrelated agent configuration and unrelated MCP server entries.

## Workflow State Effects

Workflow state writes can:

- Create or update `specs/{id}-{slug}/workflow-state.json`.
- Record the selected workflow.
- Record current step and last completed step.
- Mark operational state as active, paused, or complete.
- Record step lifecycle metadata for init and finalize boundaries.

Step finalization can update workflow state only after validation passes.

## Task Specification Effects

Task specification operations can:

- Create a new `specs/{id}-{slug}/` directory.
- Instantiate `spec.md`, `plan.md`, or `tasks.md` from a product template.
- Update task specification lifecycle status in `spec.md`.
- Update non-status frontmatter in `spec.md`.
- Append or revise prose in `spec.md`, `plan.md`, or `tasks.md` through agent workflow activity.
- Toggle task completion checkboxes in `tasks.md`.
- Mark completed task specifications as locked when a later workflow reaches a guarded stage.

Locked task specifications reject guarded writes.

## Set List Effects

Set list commands and interactive edits can update `.spec-n-roll/config/set-lists.json` by:

- Creating set list entries.
- Updating names, descriptions, workflow ids, priorities, and enabled flags.
- Enabling or disabling entries.
- Removing entries.

Validation and triage reads do not write set list configuration.

## Project Metadata Effects

Project metadata writes can update `.spec-n-roll/config/project-metadata.json` by:

- Advancing the next task specification id.
- Recording the current implementation task id and slug.
- Recording implementation start time.
- Clearing current implementation ownership when workflow completion permits it.
- Updating metadata timestamps.

## Spec Manifesto Effects

The manifesto authoring workflow can:

- Create or update `.spec-n-roll/config/manifesto/global.md`.
- Create or update `.spec-n-roll/config/manifesto/steps/{stepId}.md`.

Manifesto read commands and interactive manifesto views do not write files.

## Living Specification Effects

Implementation workflow activity can:

- Create `living-specs/{domain}.feature`.
- Update existing living specification files.
- Add new scenarios.
- Update existing scenarios.
- Remove deprecated scenarios.
- Add task tags to new or modified scenarios.
- Preserve existing scenario tags.

Living specification updates are agent-managed and occur before production code is accepted in the implementation workflow.

## Step Definition and Test Effects

Implementation workflow activity can:

- Create `tests/step-definitions/` when needed.
- Create or update `tests/step-definitions/living-spec-stubs.mjs`.
- Add stub step definitions for unmatched living-spec steps.
- Write a package marker used for module behavior in the step-definition area when needed.
- Create a temporary or local symlink to the toolkit's Cucumber dependency when project-local resolution requires it.
- Run Cucumber against tagged living-spec scenarios.

## Repository Workflow Effects

Repository onboarding and drift workflows can:

- Create a new specification-stage output under `specs/{id}-{slug}/`.
- Create or update workflow state for the produced task specification.
- Create `specs/{id}-{slug}/repository-workflow-report.md`.
- Read repository code, tests, docs, and living specifications to gather evidence.

During the specify stage, repository workflows must not directly mutate:

- `living-specs/`
- Test files.
- Production source files.

## Extension Effects

Extension step and hook handlers can have side effects defined by their handler code. Spec-n-Roll surfaces extension execution at workflow boundaries and step execution points.

Product-owned side effects around extensions include:

- Reading enabled extension manifests.
- Reporting compatibility warnings.
- Invoking enabled step and hook handlers.
- Failing a workflow step when a blocking extension handler fails.

Extension handlers are project-supplied code, so their external effects are part of the extension's own contract and should be reviewed before enabling.

## Platform Script Effects

Platform script execution can:

- Spawn a shell process.
- Execute the selected `.sh` or `.ps1` script for the current platform.
- Write subprocess output to the parent command context.
- Fail the current workflow operation when the script exits unsuccessfully.

The effects of the script body are defined by the script being executed.

## NPM and Network-Affecting Effects

Spec-n-Roll does not run its own HTTP server and does not expose inbound network endpoints. Network-affecting behavior is delegated to subprocesses.

The interactive version check can:

- Run `npm view spec-n-roll version --json`.
- Contact the configured npm registry through npm.

The interactive global install or reinstall flow can:

- Run `npm install -g spec-n-roll`.
- Download package data through npm.
- Modify the user's global npm installation outside the project.

## MCP Effects

MCP tool calls can cause the same file writes as their CLI equivalents:

- Workflow state writes.
- Task lifecycle status updates.
- Project metadata writes.
- Task checkbox updates.
- Step initialization and finalization state updates.
- Step output artifact creation.
- Specification frontmatter updates.
- Repository workflow report reads and repository workflow run outputs.

MCP tools also write structured responses back to the calling agent over stdio.

## Backup and Atomic Write Effects

For guarded writes, Spec-n-Roll may:

- Write temporary files during atomic write operations.
- Rename temporary files into final paths.
- Create `.bak` files before overwriting locally modified product-managed files.
- Create parent directories before writing target files.

Failed writes must report the affected path when known.

## Filesystem Metadata Effects

Spec-n-Roll can:

- Create directories.
- Copy files.
- Write text and JSON files.
- Write binary launcher files.
- Remove product-managed directories.
- Set executable permissions on installed scripts and binaries.
- Create filesystem symlinks or junctions for test dependency resolution.

## Explicit Non-Side Effects

- Read-only commands such as `version`, `list agents`, `manifesto show`, `set-list list`, `set-list show`, `set-list validate`, `workflow state read`, `project metadata read`, and report read operations do not intentionally write project files.
- Repository workflow planning does not mutate living specifications, tests, or production code.
- Cross-artifact analysis is non-destructive.
- Documentation in the repository root `docs/` is not installed into user projects by initialization or update.
