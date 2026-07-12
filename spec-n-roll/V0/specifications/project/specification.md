# Spec N' Roll Project Specification

## Purpose

A Spec N' Roll project is a software project that has adopted a shared,
specification-driven way of defining, performing, validating, and preserving
change. It provides the durable context that people and AI agents need to work
from the same product intent, workflow rules, current behavior, and task
history.

The project captures product-facing truth and workflow governance. It does not
make product decisions for the team or replace review of requirements and
outcomes.

## What the Project Captures

A Spec N' Roll project captures:

- The project's governing principles and rules.
- The agents that participate in specification-driven work.
- The available workflow steps and the workflows composed from them.
- The set lists used to triage work into an appropriate workflow.
- Task specifications and their lifecycle and workflow progress.
- Planning, task, analysis, and other outcomes associated with each task.
- Living specifications that describe current accepted product behavior.
- Traceability between a task and the behavior it introduced or changed.
- Project-level work ownership needed to prevent conflicting implementation.
- Registered extensions and their compatibility.
- Product version and update state needed to keep project capabilities current.
- Repository discovery and drift findings that can seed future specification
  work.

## Components

### Project Governance

Project governance states the enduring principles, quality expectations, and
constraints that guide all work. It includes rules that apply globally and
rules that apply only to a particular workflow step.

Governance is visible to people and agents before governed work begins.
Conflicts are surfaced rather than silently resolved unless the project has
defined precedence.

### Agent Participation

The project identifies which supported AI agents may participate. Every enabled
agent receives equivalent project workflow guidance and access to the same
authorized project capabilities.

Agents can be added or removed over time without changing task specifications,
living specifications, or unrelated project settings.

### Workflow Catalog

The workflow catalog contains the reusable steps and ordered workflows available
to the project. It also identifies the default choice used when a user needs a
starting selection.

The catalog supports multiple paths so the project can apply proportionate
process to different kinds of work. Its behavior is defined in the Workflow
Specification.

### Set Lists

Set lists are the project's named triage choices. Each set list explains when
it applies and selects a workflow. Enabled set lists participate in triage;
disabled set lists remain available for later use without influencing current
selection.

At least one valid choice must be available before new work can be triaged.

### Task Specifications

A task specification is the durable record for one bounded change. It captures:

- The problem or opportunity.
- The intended behavior and user-visible outcomes.
- Scope, exclusions, assumptions, and resolved clarifications.
- Acceptance conditions and important edge cases.
- The selected workflow and its progress.
- Related outcomes produced as the work advances.
- Links to living behavior created or changed by the task.

Task specifications have a lifecycle distinct from workflow progress:

- **Active** means work or clarification can continue.
- **Complete** means the selected workflow has finished.
- **Locked** means the task is preserved as an immutable historical record.

A completed task can be reopened when clarification introduces new,
unimplemented requirements. A locked task cannot be altered by normal workflow
actions.

### Task Outcomes

Steps may produce reviewable outcomes such as a specification, plan, ordered
task breakdown, consistency analysis, validation evidence, or repository
workflow report. Outcomes remain associated with their task and are not treated
as complete solely because content exists.

The project distinguishes current outcomes, partial outcomes from interrupted
work, and accepted outcomes from completed steps.

### Living Specifications

Living specifications describe the project's current accepted behavior through
concrete, verifiable examples. They are organized by behavior domain rather
than by implementation structure.

When behavior changes, living specifications are updated to reflect the new
truth. Removed behavior is removed instead of retained as current product
documentation. Scenarios preserve traceability to the task specifications that
introduced or changed them.

Living specifications are validation targets, not merely narrative history.

### Project State

Project state assigns unique task identities, tracks the task currently in
implementation, and records enough progress to resume work safely.

Only one active task may hold the project's implementation responsibility at a
time. Other tasks may remain active in earlier workflow steps, but competing
implementation work is blocked until the responsibility is released.

### Extensions

Extensions adapt the project by contributing workflow steps, alternate
workflows, step-boundary activities, triage behavior, or agent guidance.
Extensions are registered explicitly, can be independently enabled or disabled,
and declare their compatibility.

Project updates preserve extension registrations and report compatibility
concerns before affected behavior is used.

### Repository Workflows

Repository workflows help an existing project establish or refresh its living
behavior from repository evidence.

- Onboarding identifies behavior that lacks adequate living specification
  coverage and proposes bounded specification work.
- Drift review compares current evidence with living specifications and
  identifies alignment, gaps, conflicts, and stale behavior.

These workflows create reviewable findings and forward-looking specification
work. They do not silently redefine accepted behavior.

### Ownership and Updates

The project distinguishes team-authored content from product-provided
capabilities. Team-authored configuration, specifications, governance, and
behavior remain under project control.

Updates may refresh product-provided capabilities and propose necessary changes
to project configuration. Breaking changes to team-owned content require
explicit confirmation, and failed updates leave the project recoverable.

## How a Project Works

### Adoption

1. A team adopts Spec N' Roll for an existing or new software project.
2. The project establishes governance, participating agents, workflow choices,
   and initial triage set lists.
3. The project validates that its workflow choices and required capabilities
   are internally consistent.
4. Existing repositories may run onboarding to identify initial living
   specification work.

### Feature Change

1. A user describes a desired change.
2. Triage recommends an enabled set list and its associated workflow; the user
   confirms or overrides the choice.
3. The project creates an active task specification and records the selected
   workflow.
4. The task advances through the workflow's required steps, applying project
   governance and validating each step before completion.
5. Living specifications are created or updated before the implementation is
   accepted.
6. The implementation is validated against the intended behavior.
7. When all required steps complete, the task becomes complete and its outcomes
   remain available as project history.
8. Completed task records become locked when preservation of the historical
   record is required by later work.

### Continuation and Recovery

A user can ask the project to continue active work. The project identifies the
eligible task and next required step from recorded progress. If several tasks
are eligible, the user selects one. If progress and observable outcomes
disagree, or a previous attempt left partial work, the project presents recovery
choices before continuing.

### Ongoing Maintenance

Teams can clarify active or completed task specifications, inspect consistency
across project outcomes, manage workflow choices and agents, review repository
drift, and update product capabilities. These activities preserve unrelated
team-authored content and maintain traceability between accepted behavior and
the work that shaped it.

## Functional Requirements

1. A project must expose its governance, enabled agents, workflow choices, and
   triage choices for review.
2. A project must validate references among set lists, workflows, steps, and
   enabled extensions before dependent work begins.
3. Every new task specification must receive a unique identity and exactly one
   selected workflow.
4. Task lifecycle and workflow progress must remain distinct and independently
   understandable.
5. The project must preserve task specifications and their outcomes as durable,
   traceable records.
6. The project must protect locked task specifications from normal workflow
   changes.
7. The project must prevent more than one active task from holding
   implementation responsibility.
8. Living specifications must represent current accepted behavior and retain
   traceability to originating task specifications.
9. Partial or contradictory project state must be reported with safe recovery
   choices.
10. Team-authored content must be preserved during product updates unless the
    team explicitly accepts a required change.
11. Enabled agents must receive consistent project guidance and authorized
    capabilities.
12. Extensions must be explicit, independently controllable, and checked for
    compatibility before affected work begins.
13. Repository onboarding and drift review must produce reviewable proposals
    rather than silently changing accepted project behavior.
14. Project errors must identify the affected concept, whether work is blocked,
    and an actionable path to resolution.

## Boundaries

A Spec N' Roll project coordinates specification-driven change. It does not
replace product ownership, infer acceptance from generated code, or make every
change follow the same workflow depth. It preserves human control over workflow
selection, requirement decisions, extension adoption, breaking updates, and
acceptance of behavior.
