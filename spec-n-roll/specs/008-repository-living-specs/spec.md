# Feature Specification: Repository Living Specs

**Feature Branch**: `008-repository-living-specs`

**Created**: 2026-06-14

**Status**: Draft

**Input**: User description: "Create a command to initialize an existing repository with spec n roll. This is more than just the init cli command which just creates and sets up files. This should be a slash command that uses an agent to build living specs and tests from an existing repository. I'm not sure exactly what that needs to look like, so make some recommendations and we can tweak it. It should also be able to be used to update the existing living specs in the repository in case of drift from the code."

## Clarifications

### Session 2026-06-14

- Q: What authoritative artifacts does this workflow create or update? → A: Living specs only — Cucumber Gherkin `.feature` files in `living-specs/`, not retrospective task specs for discovered behavior.
- Q: Must `spec-n-roll init` have already been run before this workflow can onboard or refresh living specs? → A: Init required — the workflow stops with clear guidance if Spec-n-Roll scaffolding is missing.
- Q: During this workflow's specify stage, can the agent create or modify test files, or only recommend them? → A: No direct writes — specify captures accepted living-spec and test work for downstream planning and implementation.
- Q: After maintainer approval, how are living specs actually written? → A: Workflow mediated — approved work is captured by the specify-stage output and applied later by the normal planning and implementation stages.
- Q: How many specify-stage outputs does one workflow run produce? → A: One output per run — each workflow run produces a single forward specify-stage output for that scoped run.
- Q: What counts as user-authored notes that must be preserved? → A: Corrections happen through clarify on the specify-stage output before plan; living-spec files are unchanged until implementation.
- Q: When code, tests, documentation, and existing living specs disagree, is there a default source of truth? → A: No default — always present the conflict and ask the maintainer to choose the authoritative source during specify.
- Q: What happens to living specs determined obsolete, merged, or unsupported? → A: Propose deletion in specify output; retirements remove scenarios from `living-specs/` during implementation, with version control as the archive.
- Q: What role does confidence level play in the review workflow? → A: Informational only — it guides review priority and does not block specify-stage output.
- Q: Should this be a dedicated slash command or part of the workflow system? → A: Workflow type — repository onboarding and drift refresh run as workflow types that inject repository-discovery guidance into the normal specify stage while preserving the specify step structure.
- Q: How much of the Spec-n-Roll workflow does one repository onboarding run complete? → A: Specify stage only — run ends after specify-stage output; plan, tasks, and implement are separate maintainer actions.
- Q: When a repository has living specs for some areas but not others, what should one run do? → A: Two separate workflows — one onboarding workflow and one drift workflow; mixed coverage is handled by scoped runs of the appropriate workflow.
- Q: What makes an ambiguity critical enough to block specify-stage output? → A: Nothing is blocked — unresolved ambiguity is included in the specify-stage output; the maintainer corrects it later via clarify.
- Q: What happens to proposals the maintainer defers during a run? → A: No defer — specify produces the feature spec; the maintainer corrects it via clarify.
- Q: Where does maintainer review happen? → A: Normal specify plus clarify — discovery informs specify; the specify interview produces the spec; clarify handles corrections afterward.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build Living Specs From an Existing Repository (Priority: P1)

A maintainer starts the repository onboarding workflow in an existing codebase that has already been initialized with Spec-n-Roll. The workflow guides an agent through repository discovery, injects the discovered evidence and living-spec goals into the normal specify stage, runs the standard specify interview, and produces a forward feature spec for living-spec and test work. The workflow ends after specify; plan, tasks, and implementation are separate maintainer actions.

**Why this priority**: The feature exists to make Spec-n-Roll useful for repositories that already contain working code and tests, not only greenfield projects.

**Independent Test**: Run the onboarding workflow against an initialized repository with no living specs, complete the specify interview, and verify that the specify-stage output describes the living-spec changes using the normal spec structure and that living-spec files remain unchanged until implementation.

**Acceptance Scenarios**:

1. **Given** an initialized repository without living specs, **When** the maintainer starts the repository onboarding workflow, **Then** the agent inventories implemented user-facing behaviors, important workflows, existing tests, and documentation sources before the specify stage finalizes its output.
2. **Given** discovery finds several implemented behaviors, **When** the specify stage runs, **Then** the resulting feature spec includes behavior purpose, user scenarios, observable acceptance criteria, related tests or gaps, informational confidence levels, and marks unresolved ambiguity for later clarify rather than omitting it.
3. **Given** the specify interview completes, **When** the maintainer reviews the output, **Then** the workflow has produced one forward feature spec and the maintainer may correct it through the normal clarify step before advancing to plan.
4. **Given** the specify stage completes, **When** the workflow ends, **Then** the repository has one forward feature spec that describes the living-spec changes and records the discovery evidence used to create it, and plan has not run automatically.
5. **Given** the repository contains ambiguous behavior, **When** the agent cannot infer intent from code, tests, or documentation, **Then** the specify-stage output records the ambiguity and the maintainer may resolve it through clarify.

---

### User Story 2 - Map Existing Tests to Living Specs (Priority: P1)

A maintainer wants the generated living specs to be grounded in executable evidence. The workflow maps existing tests to proposed specs, identifies behavior that lacks test coverage, and injects the resulting evidence and test-gap recommendations into the specify stage.

**Why this priority**: Living specs are only useful when they stay connected to validation. Existing repositories may already have tests, but the relationship between tests and behavior is often implicit.

**Independent Test**: Run the workflow against a repository with a mix of covered and uncovered behavior, then verify that each generated spec lists matching tests or an explicit test gap.

**Acceptance Scenarios**:

1. **Given** existing tests exercise a discovered behavior, **When** the agent proposes the related living spec, **Then** the spec identifies those tests as supporting evidence.
2. **Given** a discovered behavior has no clear test coverage, **When** the agent proposes the living spec, **Then** the spec records the coverage gap and recommends the smallest useful test contract to protect the behavior.
3. **Given** a test appears to verify infrastructure details instead of user-observable behavior, **When** it is mapped to a spec, **Then** the workflow labels the evidence as indirect and does not overstate coverage.
4. **Given** the specify-stage output includes test recommendations, **When** the specify stage completes, **Then** the feature spec records which tests already exist, which tests remain recommended, and leaves test file creation to the implementation stage.

---

### User Story 3 - Update Living Specs When Code Drifts (Priority: P1)

A maintainer starts the repository drift workflow in a repository that already has living specs. The workflow compares current code, tests, documentation, and existing living specs, reports drift, injects the findings into the normal specify stage, runs the standard specify interview, and produces a forward feature spec for approved living-spec and test updates. The workflow ends after specify.

**Why this priority**: Living specs must be maintainable over time, not only created once.

**Independent Test**: Start with existing living specs, change repository behavior and tests, run the drift workflow, and verify that the specify-stage output identifies drift with evidence and proposed updates.

**Acceptance Scenarios**:

1. **Given** living specs already exist, **When** the maintainer starts the drift workflow, **Then** the agent performs a drift review instead of blindly regenerating all specs.
2. **Given** observed behavior no longer matches an existing spec, **When** drift is reported, **Then** the workflow explains the mismatch, cites the evidence, and asks the maintainer to choose the authoritative source among code, tests, documentation, and the existing spec with no default assumption.
3. **Given** only wording or organization is stale while behavior remains unchanged, **When** drift is reported, **Then** the workflow proposes a low-risk spec refresh without implying a product behavior change.
4. **Given** code changed without matching tests, **When** drift is detected, **Then** the workflow highlights the test gap and records the validation need in the specify-stage output.
5. **Given** the specify stage completes, **When** the drift workflow ends, **Then** the output feature spec records what living-spec changes were proposed and why.

---

### User Story 4 - Recommend an Onboarding Plan Before Writing Artifacts (Priority: P2)

A maintainer is unsure how repository onboarding should proceed. The workflow first presents a recommended plan for discovery depth, spec grouping, test strategy, and review checkpoints, then lets the maintainer adjust the plan before analysis begins.

**Why this priority**: Existing repositories vary widely. A plan-first flow gives maintainers control over scope while still providing sensible defaults.

**Independent Test**: Run the workflow with no detailed options, review the recommended plan, change at least one scope choice, and verify that the workflow follows the revised plan.

**Acceptance Scenarios**:

1. **Given** the maintainer starts the onboarding workflow without detailed options, **When** onboarding begins, **Then** the workflow recommends a phased plan that starts with discovery, maps tests, runs the normal specify interview, and ends after specify-stage output.
2. **Given** a repository is large, **When** the workflow creates the plan, **Then** it recommends a bounded first pass focused on the highest-signal areas rather than attempting to fully model the repository in one pass.
3. **Given** the maintainer wants focused onboarding, **When** they choose a subset of directories, commands, or product areas, **Then** the agent limits discovery and proposals to that scope.
4. **Given** the maintainer changes the plan, **When** analysis begins, **Then** the workflow records the selected scope and review policy in the onboarding report.

---

### User Story 5 - Preserve Maintainer Control and Repository Safety (Priority: P2)

A maintainer needs confidence that onboarding will not silently change living specs or tests. The workflow separates discovery, specify interview, and specify-stage output. Living-spec and test file mutations happen only when the maintainer later advances through plan, tasks, and implementation. Corrections to the feature spec happen through the normal clarify step.

**Why this priority**: Existing repositories often contain user-authored documentation, tests, and partial specs. Safe workflow boundaries prevent destructive or misleading automation.

**Independent Test**: Run the workflow where existing living specs contain user edits, complete specify, correct the output through clarify, and verify that living-spec files remain unchanged until implementation.

**Acceptance Scenarios**:

1. **Given** discovery and specify are running, **When** the specify stage has not completed, **Then** no living-spec or test files are changed.
2. **Given** the specify-stage output contains proposed living-spec changes, **When** the maintainer uses clarify, **Then** they can correct the feature spec before advancing to plan.
3. **Given** a proposed update would retire or merge a living spec, **When** it appears in the specify-stage output, **Then** the workflow explains the rationale and records deletion intent for implementation to apply after downstream stages complete.
4. **Given** the workflow cannot safely determine repository state, **When** it reaches the specify stage, **Then** it stops and reports the blocker instead of producing a partial spec.

---

### User Story 6 - Produce an Actionable Onboarding Report (Priority: P3)

A maintainer finishes the workflow and receives a concise report showing discovery scope, drift findings, test gaps, the specify-stage output reference, and recommended next steps. The report lets the team continue improving the repository without re-reading the entire agent transcript.

**Why this priority**: The report turns an agent-driven analysis session into durable project knowledge and follow-up work.

**Independent Test**: Complete an onboarding or drift run and verify the report includes the selected scope, specify-stage output reference, evidence summary, and follow-up recommendations.

**Acceptance Scenarios**:

1. **Given** a workflow run completes, **When** the workflow reports results, **Then** the report references the specify-stage output that will drive living-spec and test work and summarizes what discovery covered.
2. **Given** test gaps were found, **When** the report is generated, **Then** each gap is tied to a living spec or proposed spec and includes a recommended validation target.
3. **Given** drift findings were identified, **When** the report is generated, **Then** it records the evidence and maintainer authority choices captured during specify.
4. **Given** the workflow had to make assumptions, **When** the report is generated, **Then** it lists those assumptions separately from confirmed facts.

### Edge Cases

- What happens when the repository has no detectable tests? The workflow can still produce living-spec content from behavior evidence in the specify-stage output, but every affected behavior records a test gap and recommends validation before treating the behavior as fully protected.
- What happens when code and documentation disagree? The workflow reports the conflict with no default authority, asks the maintainer which source reflects intended behavior during specify, and records the decision in the specify-stage output.
- What happens when existing living specs are partially complete? The drift workflow treats them as inputs to discovery, proposes focused updates in the specify-stage output, and avoids replacing them wholesale.
- What happens when a repository is too large for one pass? The workflow recommends a bounded first scope and records omitted areas for a later scoped run of the appropriate workflow.
- What happens when discovery finds internal utilities but no user-facing behavior? The workflow omits them from the specify-stage output unless they connect to observable behavior.
- What happens when the agent cannot run the repository's tests? The workflow records the inability, uses static evidence cautiously, and includes the limitation in the specify-stage output.
- What happens when generated recommendations conflict with current project governance? The workflow surfaces the conflict in the specify-stage output for clarify resolution.
- What happens when a drift update would make a spec less testable? The workflow records the risk in the specify-stage output and recommends acceptance criteria or test work to restore verifiability.
- What happens when Spec-n-Roll has not been initialized? The workflow stops with clear guidance to run `spec-n-roll init` first.
- What happens when a living spec is obsolete? The workflow records proposed scenario deletion in the specify-stage output; implementation removes scenarios after downstream stages complete, with version control as the archive.
- What happens when specify output contains unresolved ambiguity? The ambiguity is included in the feature spec and the maintainer corrects it through clarify rather than being blocked from output.
- What happens when a repository has both covered and uncovered areas? The maintainer runs the drift workflow for areas with living specs and the onboarding workflow for uncovered areas, each with an appropriate scoped plan.
- What happens when a workflow extension injects details into specify? The injected context augments the specify stage inputs and guidance but must preserve the standard specify section structure, validation checklist expectations, and downstream planning contract.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide two workflow types for existing, initialized repositories: a repository onboarding workflow for areas without living specs and a repository drift workflow for areas with existing living specs.
- **FR-002**: Each workflow type MUST use an agent-guided flow that separates discovery, normal specify interview, and specify-stage output, and MUST end after specify without automatically running plan, tasks, or implementation.
- **FR-003**: Each workflow MUST begin by recommending a discovery plan that includes scope, expected living-spec changes, test mapping strategy, and specify checkpoints.
- **FR-004**: Maintainers MUST be able to accept the recommended plan, narrow the scope, broaden the scope, or omit selected areas for a later scoped run before repository analysis begins.
- **FR-005**: The onboarding workflow MUST identify implemented product behaviors, important workflows, current documentation, existing tests, and obvious gaps before the specify stage finalizes its output.
- **FR-006**: The drift workflow MUST compare existing living specs with current code, tests, and documentation before the specify stage finalizes its output.
- **FR-007**: Maintainers MUST choose the onboarding workflow or the drift workflow based on whether the selected scope has living specs; repositories with mixed coverage MUST be handled through separate scoped runs rather than a combined mixed-mode workflow.
- **FR-008**: The specify-stage output MUST describe observed behavior, user scenarios, acceptance criteria, supporting evidence, unresolved questions, and informational confidence levels for each affected living-spec change.
- **FR-009**: The specify-stage output MUST distinguish confirmed behavior from inferred intent and maintainer assumptions.
- **FR-010**: The specify-stage output MUST identify existing tests that support each behavior or explicitly record that no supporting test was found.
- **FR-011**: Each test gap recommendation MUST describe the behavior to validate and the expected user-observable outcome without requiring a specific implementation design.
- **FR-012**: The workflow MUST run the normal specify interview using discovery results as injected context rather than replacing specify with a separate per-proposal review phase.
- **FR-013**: The workflow MUST support clarify after specify so maintainers can correct the feature spec before advancing to plan.
- **FR-014**: The workflow MUST NOT create or modify living-spec files, test files, or other authoritative artifacts during the specify stage; living-spec and test changes MUST be captured in the specify-stage output for downstream planning and implementation.
- **FR-015**: Drift findings MUST explain the mismatch between existing living specs and current repository evidence.
- **FR-016**: Drift findings MUST present evidence conflicts with no default authoritative source and require the maintainer to choose among code, tests, documentation, or the existing living spec during specify.
- **FR-017**: The workflow MUST distinguish behavior drift, documentation drift, test drift, and organization drift in its findings.
- **FR-018**: The workflow MUST include unresolved ambiguity in the specify-stage output and MUST NOT block specify completion solely because ambiguity remains; clarify is the correction path.
- **FR-019**: The specify-stage output MUST record assumptions and mark them separately from confirmed facts.
- **FR-020**: The workflow MUST create an onboarding or drift report for every completed run.
- **FR-021**: The report MUST summarize scope, drift findings, test gaps, assumptions, the specify-stage output reference, and recommended next steps.
- **FR-022**: The drift workflow MUST be repeatable so later runs can update existing living specs instead of creating duplicate specs for the same behavior.
- **FR-023**: The drift workflow MUST identify when an existing living spec appears obsolete, merged into another behavior, or unsupported by current repository evidence.
- **FR-024**: Obsolete or merged living-spec recommendations MUST be expressed as deletion instructions in the specify-stage output before implementation removes scenarios.
- **FR-025**: The workflow MUST provide clear stopping guidance when repository analysis cannot proceed because required files, commands, maintainer decisions, or prior Spec-n-Roll initialization are unavailable.
- **FR-026**: The workflow MUST keep proposed living-spec content focused on user-observable behavior and avoid presenting internal implementation details as requirements.
- **FR-027**: Each workflow MUST support focused runs against selected product areas, directories, or existing living specs so large repositories can be handled incrementally.
- **FR-028**: The workflow MUST preserve evidence links or references sufficient for maintainers to understand why each living-spec change was proposed, primarily in the report and specify-stage output.
- **FR-029**: The workflow MUST surface discovery and drift recommendations to the specify stage before the feature spec is finalized.
- **FR-030**: The specify-stage output and proposed living-spec content MUST follow project documentation standards, including concise living-spec language and testable acceptance criteria.
- **FR-031**: Each workflow MUST require prior `spec-n-roll init` and MUST stop with clear guidance when Spec-n-Roll scaffolding is missing.
- **FR-032**: Each completed workflow run MUST produce exactly one forward specify-stage output that bundles the living-spec and test work for that run; it MUST NOT create retrospective task specs that document already-shipped behavior as new feature history.
- **FR-033**: The workflow extension model MUST allow a workflow type to inject additional context, evidence, instructions, and constraints into the specify stage without replacing the standard specify step structure.
- **FR-034**: Specify-stage injections MUST preserve standard specify headings, quality checklist validation, clarification flow compatibility, and downstream planning expectations.
- **FR-035**: The repository onboarding and drift workflow types MUST declare their specify-stage injection content as workflow configuration or extension metadata so other workflow types can use the same mechanism.

### Key Entities *(include if feature involves data)*

- **Repository Workflow Run**: One execution of the repository onboarding workflow or repository drift workflow, including selected workflow type, scope, discovery results, specify-stage output reference, and final report.
- **Discovery Plan**: The recommended and approved plan for how the agent will inspect the repository, which areas are in scope, and where specify checkpoints occur.
- **Repository Evidence**: Observations gathered from code, tests, documentation, configuration, and existing living specs that support or challenge a proposed living-spec change.
- **Specify-Stage Injection**: Workflow-provided context, evidence, instructions, or constraints that augment the normal specify stage while preserving its structure and validation expectations.
- **Repository Specify Output**: The single forward feature spec produced by the specify stage at the end of a run; it describes living-spec and test changes for downstream planning and implementation and is not a retrospective record of already-shipped behavior.
- **Drift Finding**: A detected mismatch between an existing living spec and current repository evidence, categorized by behavior, documentation, test, or organization drift.
- **Test Coverage Mapping**: The relationship between a living spec behavior and tests that directly or indirectly validate it, including explicit gaps.
- **Workflow Report**: The durable summary of a run, including scope, evidence, drift findings, test gaps, specify-stage output reference, and recommended next steps.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In workflow tests, 100% of specify-stage outputs contain at least one user scenario, acceptance criteria, evidence summary, and test mapping or explicit test gap for each in-scope living-spec change.
- **SC-002**: In repositories with existing living specs, drift workflow runs identify changed, unchanged, obsolete, and ambiguous specs without creating duplicate living specs for the same behavior.
- **SC-003**: 100% of completed workflow runs end after specify, produce one forward specify-stage output, and leave living-spec and test files unchanged until implementation.
- **SC-004**: At least 90% of directly covered behaviors in representative fixture repositories are mapped to their supporting tests during onboarding workflow runs.
- **SC-005**: 100% of uncovered behaviors in scope are reported with an explicit test gap and recommended validation target in the specify-stage output or workflow report.
- **SC-006**: Large-repository fixture runs can complete a bounded first-pass plan and produce a report and specify-stage output without requiring full-repository coverage in one invocation.
- **SC-007**: Drift workflow reports clearly categorize every finding as behavior, documentation, test, or organization drift.
- **SC-008**: Maintainers can correct the specify-stage output through clarify before advancing to plan.
- **SC-009**: Workflow reports for completed runs include scope, assumptions, test gaps, specify-stage output reference, and next steps in 100% of test cases.
- **SC-010**: Specification quality review finds no specify-stage output that treats unconfirmed implementation details as user-facing requirements.
- **SC-011**: Workflow extension tests verify that repository onboarding and drift workflows inject additional specify-stage context while preserving the standard specify headings and checklist validation in 100% of covered cases.

## Assumptions

- The feature provides two workflow types intended for agent use: repository onboarding and repository drift. The `spec-n-roll init` CLI command remains responsible for creating files and configuration; both workflows require prior init and do not replace it.
- Each workflow run ends after specify. Plan, tasks, and implementation are separate maintainer actions using the normal Spec-n-Roll workflow.
- Repositories with mixed living-spec coverage are handled through separate scoped runs of the onboarding workflow and drift workflow, not a combined mixed-mode workflow.
- Initial onboarding should favor a bounded, reviewable first pass when the repository is large or ambiguous.
- Existing code, tests, and documentation are evidence sources injected into the normal specify interview.
- Living specs are Cucumber Gherkin `.feature` files in `living-specs/` and describe product behavior and validation contracts; these workflows target living specs only and do not create retrospective task specs for already-shipped behavior.
- The workflows do not create or modify living-spec or test files during specify. Each run produces one forward specify-stage output that downstream planning and implementation use to apply living-spec and test changes.
- Unresolved ambiguity is included in the specify-stage output; clarify is the correction path rather than blocking specify completion.
- Confidence levels are informational for review prioritization only.
- When evidence sources conflict, no source is authoritative by default; the maintainer must choose during specify.
- Obsolete living-spec scenarios are deleted via implementation, with version control as the archive.
- The workflow extension mechanism should be reusable by future workflow types that need to add context or constraints to specify without forking the specify stage.
- The exact workflow names, specify-stage output layout, evidence format, and test mapping mechanics are planning decisions, provided the user-facing workflow and review guarantees remain intact.
