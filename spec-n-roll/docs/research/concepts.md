# Toolkit Concepts

## Core Workflow Concepts

- **Spec-n-Roll**: The product that coordinates specification-driven development between developers, project configuration, and AI coding agents.
- **Workflow**: An ordered path of steps that moves a feature from idea to implementation.
- **Workflow Step**: A named unit of work such as specify, clarify, plan, tasks, analyze, or implement.
- **Workflow State**: The operational progress record for a task specification, including selected workflow, current step, last completed step, and paused or complete status.
- **Task Specification**: A feature-specific work item that captures requirements, workflow progress, and related artifacts.
- **Task Specification Lifecycle**: The user-facing status of a task specification: Active, Complete, or Locked.
- **Set List**: A named workflow choice used during triage to select the right amount of process for a change.
- **Triage**: The evaluation of a feature description against enabled set lists to recommend a workflow path.
- **Partial Artifact Recovery**: The resume flow used when a workflow step was interrupted after creating some output.

## Specification Concepts

- **Specification**: The behavior-focused description of what a feature must accomplish.
- **Clarification**: A follow-up interview that adds or resolves requirements for an existing specification.
- **Plan**: A design-oriented artifact for changes that need deeper analysis before implementation tasks.
- **Tasks**: An ordered checklist that turns a specification or plan into executable implementation work.
- **Cross-Artifact Analysis**: A non-destructive review of specification, plan, tasks, and living behavior for gaps or inconsistencies.

## Living Behavior Concepts

- **Living Specification**: An executable behavior description that represents current accepted product behavior.
- **Scenario**: A behavior example inside a living specification.
- **Task Tag**: A tag that links living specification scenarios to the task specification that created or changed them.
- **Behavior-First Implementation**: The implementation approach where living behavior is updated before production code is accepted.
- **Red-Green-Refactor**: The validation cycle that expects failing behavior first, passing behavior after implementation, and continued passing behavior after cleanup.

## Agent and Interface Concepts

- **Agent**: An AI coding assistant configured to follow Spec-n-Roll workflow guidance.
- **Agent Skill**: Generated guidance that teaches an agent how to perform a Spec-n-Roll workflow command.
- **Spec Manifesto**: Project rules that guide agent behavior globally or for a specific workflow step.
- **Non-Interactive CLI**: The scriptable command interface for setup, updates, reads, and deterministic mutations.
- **Interactive CLI**: The keyboard-first application launched by bare `spec-n-roll`.
- **MCP Server**: The project-local agent interface for safe structured reads and deterministic mutations.
- **MCP Tool**: A specific operation exposed by the MCP server for agents.

## Configuration Concepts

- **Project Configuration**: User-owned settings that define agents, workflows, steps, set lists, manifests, and extensions.
- **Project Metadata**: Project-level state used for task id allocation and current implementation ownership.
- **Toolkit Version**: The product version associated with an installation and its managed assets.
- **User-Owned Content**: Project content that updates must preserve unless the user confirms a migration.
- **Product-Managed Content**: Toolkit assets that updates may refresh, with backups when local modifications exist.
- **Configuration Migration**: An update-time change that moves user-owned configuration to a newer schema.

## Extension Concepts

- **Extension**: A registered package of workflow behavior, hooks, workflow variants, or agent integration.
- **Extension Manifest**: The declaration of an extension's identity, compatibility target, steps, hooks, workflows, and agent setup.
- **Extension Step**: A workflow step provided or replaced by an extension.
- **Hook**: Extension behavior surfaced before or after a workflow step.
- **Workflow Variant**: An alternate ordered workflow path that can be selected through triage or configuration.
- **Compatibility Warning**: An update-time notice that an extension may not match the active toolkit version.

## Repository Workflow Concepts

- **Repository Onboarding**: A workflow that inspects an initialized project and proposes living specification work where coverage is absent or partial.
- **Repository Drift**: A workflow that compares repository evidence against existing living specifications and proposes refresh work.
- **Repository Evidence**: Information gathered from existing code, tests, documentation, and living specifications.
- **Discovery Plan**: A bounded proposal for what repository areas should be inspected.
- **Repository Workflow Report**: A durable summary of repository workflow scope, evidence, findings, blockers, and next steps.
