# Workflow Specification

## Purpose

A workflow defines a repeatable path for moving a task specification from an
idea to an accepted outcome. It gives people and agents a shared understanding
of what work is required, the order in which it occurs, the rules that govern
it, and the evidence needed to consider it complete.

A workflow describes required functionality and progress. It does not prescribe
the technology used to perform a step.

## Workflow Definition

A workflow is a named, ordered sequence of one or more steps. It captures:

- A stable identity and human-readable name.
- A description of the work for which it is appropriate.
- The ordered steps a task must follow.
- The first step from which new work begins.
- The conditions under which the workflow is complete.

Each task specification selects exactly one workflow. The selected workflow
remains associated with the task so its expected path and actual progress can
be understood later.

Different workflows may reuse the same steps in different combinations. This
allows a small change to follow a short path while a broad or risky change can
include clarification, planning, analysis, task breakdown, or other review
steps before implementation.

## Step Definition

A step is a named, bounded unit of work within a workflow. A step captures:

- Its identity and purpose.
- The outcome it is expected to produce.
- The information and prior outcomes it needs.
- The rules that apply while it is performed.
- Any expected artifacts or observable results.
- The validation required before it can be completed.
- Optional activities that occur before or after its primary work.

A step is available for reuse by any workflow for which its purpose is
appropriate. Inclusion in one workflow does not imply inclusion in every
workflow.

### Step Lifecycle

For each task, a step can be pending, in progress, interrupted, or complete.
Only the next eligible step may begin. A step becomes complete only after its
required work and validation succeed.

Before a step begins, the workflow provides the task context, applicable
project rules, relevant outcomes from earlier steps, and required pre-step
activities. After the work is performed, the workflow evaluates the step's
completion conditions and required post-step activities before recording it as
complete.

An interrupted step remains distinguishable from both a pending step and a
completed step. When partial work is detected, the user can inspect it and
choose to resume, restart, or clean it up. The workflow must not silently treat
partial output as a completed step.

## Triage and Workflow Selection

Triage selects an appropriate workflow before substantive specification work
begins. It evaluates the requested change against the project's enabled set
lists.

A set list is a named workflow choice that captures:

- A description of the kinds of work it covers.
- The workflow it selects.
- Its relative priority when more than one choice is suitable.
- Whether it currently participates in triage.

Triage considers only enabled set lists. It recommends the best match and
explains the basis for that recommendation. The user can confirm the
recommendation or select another eligible set list.

When the request is ambiguous, triage presents the eligible choices rather than
making an unsupported selection. When no set list is eligible, workflow
progress is blocked and the user is told how to restore an eligible choice.

Set list names are project vocabulary, not fixed meanings. Projects may add,
rename, reprioritize, disable, or remove set lists without changing the meaning
of the workflows they reference.

## Progress and Continuation

Workflow progress captures:

- The task specification being advanced.
- The selected workflow.
- The current or next step.
- The last successfully completed step.
- Whether work is active, paused, interrupted, or complete.

A user can continue a task without remembering its next step. Continuation
uses recorded progress and the selected workflow to identify the next eligible
step. It must not skip required steps or mark a step complete without its
required validation.

If recorded progress conflicts with observed outcomes, the conflict is surfaced
before work continues. If more than one task is eligible, the user chooses
which task to advance.

A task completes its workflow when every required step in its selected path is
complete. Completed task specifications remain available as a historical record
and may be protected from later change according to the task lifecycle.

## Rules and Governance

Project-wide rules apply to every step. Step-specific rules apply only to their
matching step. Both sets of rules are provided when a step begins.

Rules guide how the work is performed but do not replace the step's completion
and validation conditions. Conflicting rules are surfaced for resolution unless
the project has explicitly defined precedence.

## Extension

Workflows are extensible without requiring projects to abandon the core model
of ordered, validated steps. An extension may:

- Contribute a new reusable step.
- Replace the behavior of an existing open step while preserving its contract.
- Add an activity before or after a step.
- Contribute an alternate workflow composed from available steps.
- Provide an alternate triage assessment.
- Add guidance for supported agents participating in the workflow.

Extensions can be enabled or disabled independently. Disabled extensions do not
participate in triage or workflow execution.

When multiple extensions offer the same contribution, declared priority
determines which eligible contribution is selected. A mandatory extension
activity must complete before the related step can complete; an optional
activity may be skipped with its status remaining visible.

An extension must declare the product versions and capabilities with which it
is compatible. Compatibility concerns are reported before affected workflow
work begins. An unavailable or invalid required extension blocks only the work
that depends on it and provides an actionable explanation.

## Functional Requirements

1. A workflow must have a stable identity, a clear purpose, and at least one
   ordered step.
2. Every step referenced by a workflow must be available and eligible when that
   workflow is selected.
3. New feature work must begin with specification unless a specialized workflow
   explicitly defines an equivalent specification outcome.
4. Exactly one workflow must be selected for each task specification.
5. Triage must use the project's enabled set lists and must allow user override.
6. Workflow progress must distinguish task lifecycle from operational progress.
7. A step must not complete until its validation and mandatory boundary
   activities succeed.
8. Interrupted or inconsistent work must be surfaced with recovery choices.
9. Workflow completion must be derived from completion of the selected path.
10. Extensions must preserve the observable contract of any step they replace.
11. Invalid workflow, set list, step, or extension references must block the
    affected action with an actionable explanation.
12. A task's selected workflow and completed-step history must remain
    reviewable after the task is complete.

## Boundaries

A workflow coordinates work; it does not decide product requirements on behalf
of the user. It does not treat generated artifacts as accepted merely because
they exist, and it does not require every task to follow the same amount of
process. Human review, project rules, and observable validation remain part of
the acceptance boundary.
