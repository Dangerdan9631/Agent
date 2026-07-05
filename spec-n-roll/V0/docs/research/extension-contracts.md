# Extension Contracts

## Scope

The extension contract defines what third-party and bundled extensions may contribute to Spec-n-Roll. Extensions can add or replace workflow steps, provide hook behavior around workflow steps, add workflow variants, and configure AI agent integration.

Extensions must not require changes to product core behavior to be registered.

## Extension Manifest Contract

An extension declares its capabilities in a manifest.

**Required fields**

- `manifestVersion`: Manifest schema version.
- `id`: Stable kebab-case extension id.
- `name`: Human-readable extension name.
- `targetToolkitVersion`: Toolkit version the extension was designed for.

**Optional fields**

- `description`: Human-readable purpose.
- `steps`: Workflow step handlers contributed by the extension.
- `hooks`: Before-step and after-step hook handlers.
- `workflowVariants`: Additional workflow definitions.
- `agentSetup`: Agent-specific rule, skill, and MCP configuration targets.

## Identifier Contract

- Extension ids must be lowercase kebab-case.
- Step ids must be lowercase kebab-case.
- Hook events must be `before_{stepId}` or `after_{stepId}`.
- Product update hook events are reserved and must not be used by extensions.
- Command names contributed by extensions must use the `spec-n-` prefix.

## Version Compatibility Contract

Each extension declares the toolkit version it targets. During toolkit update, Spec-n-Roll reports known compatibility concerns for installed extensions.

Compatibility warnings do not block updates. If an extension later fails during workflow execution after a warning was reported, the workflow step must fail with an error that identifies the extension and the prior compatibility concern.

## Step Contribution Contract

An extension step declares:

- `id`: Stable id for the manifest entry.
- `stepId`: Workflow step id implemented or augmented by the extension.
- `command`: User-facing command name.
- `entrypoint`: Project-relative handler entry point.
- `priority`: Optional priority for conflict resolution.
- `enabledByDefault`: Optional initial enabled state.

**Behavior**

- A step handler runs only when its step is selected by the active workflow.
- If multiple handlers target the same step, priority determines which handler is selected according to project rules.
- A failing handler fails the current workflow step.
- A disabled step contribution is ignored.

## Hook Contract

A hook declares:

- `id`: Stable hook id.
- `event`: `before_{stepId}` or `after_{stepId}`.
- `entrypoint`: Project-relative handler entry point.
- `optional`: Whether failure should be treated as non-blocking.
- `description`: Optional human-readable purpose.

**Behavior**

- Before hooks are surfaced at step initialization.
- After hooks are surfaced at step finalization.
- Unknown step ids produce diagnostics and are skipped.
- Optional hook failures are reported without blocking the workflow.
- Mandatory hook failures block the step until remediated.

## Workflow Variant Contract

Extensions may contribute workflow variants.

**Fields**

- `id`: Stable workflow id.
- `name`: Human-readable name.
- `description`: Optional workflow purpose.
- `steps`: Ordered list of step ids.

**Behavior**

- Workflow variants must reference registered step ids.
- Variants used for ordinary feature work should start with `specify`.
- Variants must not skip required lifecycle boundaries for executable steps.

## Agent Setup Contract

Agent extensions may declare project-local integration targets.

**MCP configuration**

- `serverId`: Stable merge key for the Spec-n-Roll MCP server.
- `format`: Agent configuration format identifier.
- `targets`: One or more project-relative agent configuration files.

**Rule and skill targets**

- `ruleTargets`: Project-relative files that should point agents at shared rules.
- `skillTargets`: Project-relative locations for generated workflow skills or commands.

**Behavior**

- Agent setup must be idempotent.
- Existing unrelated agent configuration must be preserved.
- The MCP server entry must point at the project-local Spec-n-Roll MCP server.
- Removing an agent must remove that agent's Spec-n-Roll integration without altering unrelated entries.

## Triage Extension Contract

Extensions may replace or augment workflow selection during specification.

**Input**

- User intent text.
- Enabled set list descriptions.
- Available workflows.

**Output**

- Proposed set list id.
- Eligible set list ids.
- Proposed workflow id.
- Rationale.
- Ambiguity or blocking state when applicable.

**Behavior**

- Triage must consider only enabled set lists.
- Triage must not silently proceed when no enabled set lists exist.
- The user may confirm or override the proposed selection.

## Handler Failure Contract

When an extension handler fails, Spec-n-Roll must report:

- Extension id.
- Step or hook id.
- Event or command being executed.
- Whether the failure is blocking.
- Remediation guidance when known.

Extension failures must not leave workflow state claiming a step completed when the step did not pass validation.

## Ownership Contract

Extension configuration under project configuration is user-owned. Bundled extension assets installed by the product are product-managed. Updates may refresh product-managed extension assets but must preserve user-owned extension configuration unless an explicit migration is confirmed.
