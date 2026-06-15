# Project Configuration Contracts

## Scope

Project configuration contracts define the user-owned configuration that controls Spec-n-Roll behavior in an initialized project. Product commands may read and validate these files during workflow execution, setup, updates, and agent configuration.

User-owned configuration must be preserved during updates unless the user explicitly confirms a migration.

## General Configuration Contract

- Configuration files must include a schema version.
- Runtime configuration must validate before workflow execution.
- Unknown or malformed required fields must fail with actionable errors.
- Update-time migrations may rewrite user-owned configuration only after validation and confirmation when the migration is breaking.
- Product-managed files and user-owned configuration must remain separate ownership categories.

## Workflow Configuration

Workflow configuration defines agents, steps, workflows, default workflow selection, and registered extensions.

**Required fields**

- `schemaVersion`: Configuration schema version.
- `toolkitVersion`: Toolkit version that wrote or migrated the configuration.
- `agents`: Configured agent entries.
- `steps`: Registered workflow steps.
- `workflows`: Ordered workflow definitions.
- `defaultWorkflowId`: Default workflow id used in manual selection contexts.

### Agent Entry

**Fields**

- `id`: Stable agent id.
- `displayName`: Optional human-readable name.
- `enabled`: Whether the agent is active for the project.
- `commandPrefix`: Must be `spec-n-`.
- `ruleTargets`: Optional generated rule target paths.
- `skillTargets`: Optional generated skill target paths.

### Step Entry

**Fields**

- `id`: Stable step id.
- `kind`: `built-in`, `extension`, or `hook`.
- `command`: User-facing command name using the `spec-n-` prefix.
- `implementation`: Optional implementation reference.
- `extensionId`: Extension id when the step is extension-backed.
- `priority`: Optional conflict-resolution priority.
- `enabled`: Whether the step is available.
- `outputs`: Optional expected artifact paths for partial-step detection.

### Workflow Entry

**Fields**

- `id`: Stable workflow id.
- `name`: Human-readable name.
- `description`: Optional purpose.
- `steps`: Ordered step ids.
- `default`: Optional marker for default workflow choices.

**Rules**

- Workflow step ids must reference registered enabled steps.
- Feature workflows begin with specification.
- Set list entries reference workflow ids from this configuration.

### Extension Registration Entry

**Fields**

- `id`: Extension id.
- `manifestPath`: Project-relative path to the extension manifest.
- `enabled`: Whether the extension is active.

**Rules**

- Disabled extensions are ignored at runtime.
- Invalid enabled manifests produce validation errors or diagnostics depending on when they are discovered.

## Project Metadata

Project metadata tracks task specification allocation and current implementation ownership.

**Required fields**

- `schemaVersion`: Metadata schema version.
- `nextTaskSpecId`: Next numeric task specification id to allocate.
- `updatedAt`: Last metadata update timestamp.

**Optional fields**

- `currentTaskSpecId`: Current task specification in implementation.
- `currentTaskSlug`: Slug paired with the current implementation task.
- `implementationStartedAt`: Timestamp for implementation start.

**Rules**

- `nextTaskSpecId` must be a positive integer.
- `currentTaskSpecId`, when present, must be a zero-padded numeric id.
- `currentTaskSlug` is required when `currentTaskSpecId` is present.
- Only one active implementation task may be recorded at a time.

## Set List Configuration

Set list configuration controls workflow triage choices.

**Required top-level fields**

- `schemaVersion`: Set list schema version.
- `setLists`: Ordered set list entries.

### Set List Entry

**Fields**

- `id`: Stable set list id.
- `name`: Human-readable name.
- `description`: Natural-language guidance for when the set list applies.
- `workflowId`: Workflow id selected by this set list.
- `priority`: Numeric priority used for tie-breaking.
- `enabled`: Whether the set list participates in triage.

**Rules**

- At least one set list must be enabled.
- Enabled set lists must reference existing workflows.
- Triage considers only enabled set lists.
- Default set lists are ordinary data and must not receive special runtime behavior because of their ids.

## Spec Manifesto Configuration

Spec Manifestos define project rules for agent behavior.

**Scopes**

- Global manifesto: applies to every workflow step.
- Step manifesto: applies to one matching step id.

**Rules**

- Missing manifesto content means no rule is defined for that scope.
- Conflicting manifesto guidance must be surfaced to the agent rather than silently resolved unless the manifesto text defines precedence.
- Manifestos guide behavior but do not replace workflow validation.

## Extension Configuration

Project extension configuration registers extension manifests and controls whether those extensions are active.

**Rules**

- Manifest paths must be project-relative.
- Enabled extension manifests must satisfy the extension manifest contract.
- Extension ids must be unique within the project configuration.
- Compatibility warnings are reported during updates and do not block update completion.

## Agent MCP Configuration

Configured agents may have project-local MCP configuration files.

**Rules**

- The Spec-n-Roll MCP server entry uses a stable server id.
- The entry must point at the project-local MCP server.
- Setup, add-agent, remove-agent, and update operations must preserve unrelated MCP server entries.
- Re-running setup or add-agent must not duplicate the Spec-n-Roll server entry.

## Task Specification State Configuration

Each task specification stores operational workflow state and lifecycle status.

**Workflow state**

- Tracks task id, slug, selected workflow, operational status, current step, and last completed step.
- Operational status values are `active`, `paused`, and `complete`.
- Writes must use CLI or MCP contracts.

**Lifecycle status**

- Stored with the task specification.
- Lifecycle values are `Active`, `Complete`, and `Locked`.
- Locked task specifications reject guarded writes.

## Update and Migration Contract

During update, Spec-n-Roll reads existing configuration using a tolerant reader, migrates configuration to the current schema when required, and writes the migrated configuration only as part of the update flow.

**Rules**

- User-owned configuration is preserved unless migration is required and accepted.
- Breaking migrations require explicit confirmation.
- Failed migrations must leave a recoverable state and report the affected file.
- Runtime execution may assume configuration has already been migrated by update.

## Validation Error Contract

Configuration validation errors must identify:

- The file or configuration area that failed.
- The invalid field or missing reference.
- Whether execution was blocked.
- The remediation path, such as enabling a set list, fixing a workflow reference, rerunning initialization, or applying an update.
