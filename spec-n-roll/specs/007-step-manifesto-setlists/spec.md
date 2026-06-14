# Feature Specification: Step Manifestos and Set Lists

**Feature Branch**: `007-step-manifesto-setlists`

**Created**: 2026-06-14

**Status**: Draft

**Input**: User description: "Each step should instruct the agent to run a new init step through the MCP and a finalize step (also create the corresponding cli commands). Init runs as the first step, and finalize runs after the step has been validated, right before marking it as complete. It should check for the \"Spec Manifesto\" and return it as context for the agent. It should also check for any step before hooks and return it to the agent with instructions to call them. Create a new command that is not a part of any workflow. `/spec-n-manifesto` This should establish global rules that should be followed. In addition, the user should be able to define manifestos for specific steps by name, the command should focus on one manifesto per invocation, decided by the user input. The global manifesto is loaded on all steps, and only the step specific manifesto is loaded for that specific step. This should follow a similar process as defining the speckit constitution. But it should also pull in the spec-n-roll specific processes (interview process to get iterative feedback from the user as a mandatory step, mcp based deterministic step execution and metadata updates). The finalize step should check for any step after hooks and return them to the agent with instructions to call them. workflow complexity triage should be configurable. The configuration should include a \"name\" and a short description used by the agent to triage something as that complexity, the workflow to use when that complexity is selected, and a priority, lower priority number wins if the agent cannot decide between two. Combine this with the concept of a workflow and call it a \"set list\" instead of complexity or workflow -- basically just add priority and description as invocation instructions to the workflow concept and rename. A set list will also need an \"enabled\" config value to let the user disable the use of that set list. Create the relevant cli/mcp commands and INK interface for working with this. Each of the 3 existing complexities (\"papercut\", \"quick\", \"full\") should come as preconfigured set lists. The app should not have hard coded logic about any of them (Same idea as extensions). each agent skill should contain `author: spec-n-roll` and `version: current version` metadata. make sure the specification includes full details on the features of all of these things, and not just the details I requested here."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Deterministic Step Lifecycle (Priority: P1)

An agent begins any workflow step by receiving explicit instructions to call a step init operation. The init result gives the agent the current step context, applicable manifesto rules, and before-hook instructions before any step work begins. After the agent validates the step output, it calls a finalize operation that returns after-hook instructions and performs the final metadata update immediately before the step is marked complete.

**Why this priority**: Deterministic step boundaries are the foundation for reliable agent execution, reproducible metadata, hook dispatch, and manifesto enforcement.

**Independent Test**: Start a workflow step through the agent-facing step instructions, verify init is required before work starts, validate the step result, then verify finalize is required after validation and before completion.

**Acceptance Scenarios**:

1. **Given** an agent is assigned a workflow step, **When** the step instructions are generated, **Then** the first required action is to call the step init operation through the deterministic execution surface.
2. **Given** step init has run, **When** it returns context to the agent, **Then** the response includes step identity, current metadata, applicable manifesto content, and any executable before-hook instructions.
3. **Given** an agent has produced and validated a step result, **When** the step is ready to complete, **Then** the agent must call step finalize before the step can be marked complete.
4. **Given** step finalize has run, **When** after hooks exist for that step, **Then** the response includes hook instructions for the agent to call before completion is recorded.
5. **Given** init or finalize cannot determine the active step, **When** the operation is requested, **Then** the agent receives a clear blocking result and the step is not marked complete.

---

### User Story 2 - Manifesto Management (Priority: P1)

A maintainer defines a global Spec Manifesto that applies to every step and optional step-specific manifestos that apply only to named steps. The `/spec-n-manifesto` command focuses on one manifesto per invocation, uses an interview loop for iterative feedback, and updates the selected manifesto with synchronized validation similar to constitution editing.

**Why this priority**: Manifestos are the governance mechanism for step behavior. They must be easy to author, review, and reliably loaded at the right scope.

**Independent Test**: Create a global manifesto, create a manifesto for one named step, run init for that step and a different step, and verify the global manifesto is always present while the step-specific manifesto appears only for the matching step.

**Acceptance Scenarios**:

1. **Given** no Spec Manifesto exists, **When** the maintainer invokes `/spec-n-manifesto` for the global manifesto, **Then** the command interviews the maintainer, drafts rules, asks for iterative feedback, and saves one global manifesto.
2. **Given** the maintainer invokes `/spec-n-manifesto` for a named step, **When** the interview completes, **Then** exactly one step-specific manifesto is created or updated for that step name.
3. **Given** a workflow step starts, **When** step init loads manifesto context, **Then** it includes the global manifesto and includes only the manifesto whose step name matches the active step.
4. **Given** a manifesto command invocation names more than one target, **When** the command runs, **Then** it requires the maintainer to choose one target before editing and does not update multiple manifestos in a single invocation.
5. **Given** manifesto content conflicts with current project rules, **When** the command validates the draft, **Then** it surfaces the conflict for user feedback before saving.

---

### User Story 3 - Hook Instructions Around Steps (Priority: P1)

A project configures before and after hooks for workflow steps. Step init reports executable before hooks with exact instructions for the agent to call them, and step finalize reports executable after hooks before completion is recorded.

**Why this priority**: Hooks are part of the step contract and must be surfaced deterministically instead of relying on agents to discover or infer them.

**Independent Test**: Configure enabled before and after hooks for one step, run init and finalize for that step, and verify the response contains only the executable hook instructions in the correct phase.

**Acceptance Scenarios**:

1. **Given** enabled before hooks exist for a step, **When** step init runs, **Then** it returns those hooks with command names, descriptions, optionality, prompts when applicable, and instructions for the agent to call them.
2. **Given** enabled after hooks exist for a step, **When** step finalize runs, **Then** it returns those hooks with command names, descriptions, optionality, prompts when applicable, and instructions for the agent to call them.
3. **Given** a hook is disabled, **When** init or finalize evaluates hook configuration, **Then** the hook is omitted from the response.
4. **Given** hook configuration is invalid or unreadable, **When** init or finalize runs, **Then** step execution continues without hook instructions and reports the skipped hook source as non-blocking diagnostic context.
5. **Given** a mandatory hook is returned, **When** the agent receives the response, **Then** the response clearly states that the hook must be called before the agent proceeds.

---

### User Story 4 - Configurable Set Lists Replace Complexity Triage (Priority: P2)

A maintainer configures named set lists that describe when they should be selected, which workflow they invoke, their priority, and whether they are enabled. The agent uses these descriptions and priorities to triage user requests without relying on hard-coded papercut, quick, or full behavior.

**Why this priority**: Configurable set lists make workflow choice extensible and project-owned while preserving the existing default choices as data.

**Independent Test**: Disable one preconfigured set list, add a custom set list with higher priority, ask the agent to triage a request, and verify the selected set list follows enabled state, description, and priority rather than hard-coded names.

**Acceptance Scenarios**:

1. **Given** a fresh project, **When** set lists are viewed, **Then** preconfigured `papercut`, `quick`, and `full` set lists are present with names, descriptions, workflow references, priorities, and enabled values.
2. **Given** a set list is disabled, **When** the agent triages a request, **Then** that set list is not eligible for selection.
3. **Given** two enabled set lists both plausibly match a request, **When** the agent cannot confidently choose between them, **Then** the set list with the lower priority number wins.
4. **Given** a maintainer renames or changes a set list description, **When** future triage occurs, **Then** the agent uses the configured name and description instead of any built-in complexity concept.
5. **Given** no enabled set list can be selected, **When** triage is requested, **Then** the user receives an actionable message explaining that at least one enabled set list is required.

---

### User Story 5 - Management Surfaces for Set Lists and Lifecycle (Priority: P2)

A maintainer can inspect and modify set lists, invoke step init and finalize, and review relevant state through CLI commands, MCP tools, and the Ink interface. Each surface exposes the same concepts and validation rules with presentation appropriate to that surface.

**Why this priority**: Spec-n-Roll is used both directly by people and indirectly by agents. The feature is incomplete unless all supported control surfaces can operate it consistently.

**Independent Test**: Create or update a set list from the CLI, read it through MCP, edit it through Ink, and verify all three surfaces show the same state and validation results.

**Acceptance Scenarios**:

1. **Given** a maintainer uses CLI commands, **When** they list, create, edit, enable, disable, or remove set lists, **Then** the commands validate required fields and report the resulting configuration.
2. **Given** an agent uses MCP tools, **When** it calls step init, step finalize, or set-list read operations, **Then** the results are structured for deterministic agent execution and metadata updates.
3. **Given** a maintainer opens the Ink interface, **When** they navigate to workflow configuration, **Then** they can view set lists, inspect selection rules, change enabled state, and edit user-facing descriptions without leaving the interface.
4. **Given** a user changes set-list configuration from one surface, **When** another surface reads it, **Then** the new state is visible without conflicting interpretations.
5. **Given** a set-list update would make triage invalid, **When** the user attempts to save it, **Then** the surface explains the validation failure and preserves the prior valid state.

---

### User Story 6 - Agent Skill Metadata (Priority: P3)

A maintainer generates or refreshes agent skills and each skill carries Spec-n-Roll ownership metadata with the current toolkit version. The metadata is consistent across existing and newly generated skills.

**Why this priority**: Skill metadata supports provenance, upgrade diagnosis, and repeatable agent behavior, but depends on the lifecycle and configuration model being established first.

**Independent Test**: Refresh agent skills, inspect every generated skill, and verify each contains `author: spec-n-roll` and `version` equal to the current toolkit version.

**Acceptance Scenarios**:

1. **Given** agent skills already exist, **When** the project refreshes generated agent context, **Then** every managed skill contains `author: spec-n-roll` metadata.
2. **Given** the toolkit version changes, **When** generated skills are refreshed, **Then** every managed skill records the current toolkit version.
3. **Given** a skill is user-authored and outside Spec-n-Roll ownership, **When** metadata refresh runs, **Then** user-authored metadata is not overwritten unless the skill is explicitly managed by Spec-n-Roll.

### Edge Cases

- What happens when a step-specific manifesto exists for a step name that no longer exists? The manifesto remains manageable, but step init does not load it until a step with that exact name is active.
- What happens when global manifesto content is empty? Step init reports that no global manifesto rules are defined and continues with step-specific rules and hooks.
- What happens when global and step-specific manifestos conflict? Step init returns both with clear scope labels; the agent must treat the conflict as blocking unless the manifesto text itself defines precedence.
- What happens when a step is finalized twice? The second finalize reports the current completed state and does not re-run completion metadata updates.
- What happens when an agent tries to mark a step complete without finalize? Completion is rejected with instructions to call finalize first.
- What happens when set-list priorities duplicate? Duplicate priorities are allowed only when descriptions are distinct enough for triage; if the agent cannot decide, the response asks the user to choose.
- What happens when all preconfigured set lists are removed? The app remains valid if at least one enabled set list exists; otherwise triage is unavailable until one is created or re-enabled.
- What happens when an older configuration still uses complexity or workflow labels? The user receives a migration path that preserves intent while presenting the new set-list terminology.
- What happens when hook commands or manifesto content reference unavailable commands? Init or finalize returns the instruction and marks the availability issue clearly so the agent can stop before unsafe progress.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a step init operation for agents that is callable through MCP and has a corresponding CLI command for human and script usage.
- **FR-002**: Step init MUST be the first required action in every generated agent instruction for an executable workflow step.
- **FR-003**: Step init MUST identify the active spec, selected set list, workflow step, current step metadata, and any prior lifecycle state relevant to the agent’s next action.
- **FR-004**: Step init MUST load the global Spec Manifesto when present and return it as labeled context for every step.
- **FR-005**: Step init MUST load a step-specific manifesto only when its configured step name matches the active step.
- **FR-006**: Step init MUST discover enabled step before hooks and return explicit instructions for the agent to call each executable hook.
- **FR-007**: Step init MUST update deterministic step metadata to show that the step has started before the agent performs step work.
- **FR-008**: System MUST provide a step finalize operation for agents that is callable through MCP and has a corresponding CLI command for human and script usage.
- **FR-009**: Step finalize MUST be required after step validation succeeds and before any workflow step can be marked complete.
- **FR-010**: Step finalize MUST verify that step init has run for the same active step before allowing completion metadata to be recorded.
- **FR-011**: Step finalize MUST discover enabled step after hooks and return explicit instructions for the agent to call each executable hook before completion is recorded.
- **FR-012**: Step finalize MUST record deterministic metadata for validation result, completion eligibility, hook instructions returned, and final completion state.
- **FR-013**: Generated agent step instructions MUST tell agents not to skip init, validation, finalize, or mandatory hook calls.
- **FR-014**: Lifecycle operations MUST produce structured responses suitable for agent consumption and readable summaries suitable for CLI display.
- **FR-015**: System MUST provide `/spec-n-manifesto` as a standalone command that is not part of any workflow.
- **FR-016**: `/spec-n-manifesto` MUST operate on exactly one manifesto target per invocation: either the global Spec Manifesto or one named step manifesto.
- **FR-017**: `/spec-n-manifesto` MUST use an interview process that obtains iterative user feedback before saving new or revised manifesto content.
- **FR-018**: `/spec-n-manifesto` MUST validate manifesto drafts for empty content, unresolved placeholders, ambiguous scope, and obvious conflicts with project governance before saving.
- **FR-019**: `/spec-n-manifesto` MUST preserve prior manifesto content until the user confirms the revised draft.
- **FR-020**: Manifesto responses returned to agents MUST label each rule source as global or step-specific.
- **FR-021**: System MUST rename the user-facing workflow-selection concept from complexity/workflow triage to set-list selection.
- **FR-022**: A set list MUST include a name, short triage description, workflow reference, priority number, and enabled value.
- **FR-023**: Set-list descriptions MUST be returned to the agent as invocation instructions for selecting the appropriate set list.
- **FR-024**: Disabled set lists MUST be excluded from agent triage and from default user selection lists unless the user asks to manage disabled entries.
- **FR-025**: When the agent cannot decide between two or more eligible set lists, the enabled set list with the lowest priority number MUST be selected.
- **FR-026**: Fresh projects MUST include preconfigured `papercut`, `quick`, and `full` set lists that replace the existing hard-coded complexity choices.
- **FR-027**: The app MUST NOT contain hard-coded selection behavior that depends on the names `papercut`, `quick`, or `full`; those names must be treated as ordinary configured set lists.
- **FR-028**: System MUST provide CLI commands to list, show, create, update, enable, disable, remove, and validate set lists.
- **FR-029**: System MUST provide MCP tools to read set-list configuration, evaluate set-list triage inputs, and support deterministic step init and finalize flows.
- **FR-030**: System MUST provide Ink interface flows to view, edit, enable, disable, and validate set lists.
- **FR-031**: CLI, MCP, and Ink surfaces MUST use the same validation rules and produce consistent set-list state.
- **FR-032**: System MUST provide migration behavior or guidance for existing configurations and user-facing text that still refer to complexity or workflow selection.
- **FR-033**: Agent skill generation and refresh MUST add `author: spec-n-roll` metadata to every Spec-n-Roll-managed skill.
- **FR-034**: Agent skill generation and refresh MUST add `version` metadata equal to the current toolkit version to every Spec-n-Roll-managed skill.
- **FR-035**: Metadata refresh MUST not overwrite user-owned skills that are not managed by Spec-n-Roll.
- **FR-036**: All new user-facing command names, MCP tool names, and Ink labels MUST consistently use set-list and manifesto terminology.
- **FR-037**: All generated top-level functions, types, values, and schema fields for this feature MUST have multiline doc comments that describe intent, constraints, and return values where applicable.
- **FR-038**: Tests MUST cover lifecycle ordering, manifesto loading scope, hook instruction output, set-list selection and priority behavior, default set lists, disabled set lists, and skill metadata refresh.

### Key Entities *(include if feature involves data)*

- **Step Lifecycle Session**: The state for one agent attempt to execute a workflow step, including init status, validation status, finalize status, returned hook instructions, and completion metadata.
- **Step Init Result**: The context packet returned before step work begins. It contains active step identity, metadata, applicable manifestos, before-hook instructions, and blocking diagnostics.
- **Step Finalize Result**: The context packet returned after validation and before completion. It contains validation state, after-hook instructions, completion eligibility, and recorded metadata.
- **Spec Manifesto**: A curated set of rules that guide agent behavior. The global manifesto applies to all steps; a step-specific manifesto applies only to a named step.
- **Step Hook Instruction**: A normalized instruction for an agent to call a configured before or after hook, including command name, description, optionality, prompt, and phase.
- **Set List**: A named, configurable workflow-selection entry with a triage description, workflow reference, priority, and enabled state.
- **Preconfigured Set List**: A default set list supplied for new projects. `papercut`, `quick`, and `full` are defaults but have no special behavior beyond their configured values.
- **Agent Skill Metadata**: Ownership and version information embedded in managed skill files so generated skills can be traced to Spec-n-Roll and the toolkit version that produced them.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of generated executable step instructions in test fixtures require step init before any step work and step finalize after validation before completion.
- **SC-002**: In lifecycle tests, attempts to complete a step without finalize are rejected in 100% of cases.
- **SC-003**: Step init returns the global manifesto for every tested step and returns a step-specific manifesto only for exact matching step names.
- **SC-004**: Hook instruction tests verify that enabled before hooks appear only in init results and enabled after hooks appear only in finalize results.
- **SC-005**: A maintainer can create or update a global manifesto and one step-specific manifesto through `/spec-n-manifesto` with at least one explicit feedback-and-confirmation cycle before save.
- **SC-006**: Fresh-project validation shows `papercut`, `quick`, and `full` as configured set lists with no code path requiring those names for selection.
- **SC-007**: Set-list triage tests select the lower priority number in 100% of ambiguous cases where multiple enabled set lists remain eligible.
- **SC-008**: CLI, MCP, and Ink round-trip tests observe the same set-list configuration after create, update, enable, disable, and validation actions.
- **SC-009**: Agent skill refresh tests confirm every Spec-n-Roll-managed skill contains `author: spec-n-roll` and the current toolkit version.
- **SC-010**: Documentation and validation checks find no remaining user-facing reliance on the old complexity terminology except in migration guidance.

## Assumptions

- Step lifecycle operations apply to Spec-n-Roll workflow steps that are intended for agent execution; standalone maintenance commands may remain outside workflow step lifecycle unless they explicitly execute a step.
- "Spec Manifesto" refers to a project-level manifesto system distinct from the Spec Kit constitution. Constitution rules remain project governance, while manifestos are step-execution instructions.
- Step-specific manifesto matching uses the configured step name as the user-facing identity; aliases or renamed steps are planning details.
- Hook configuration follows the existing extension-style optional/enabled model and may evolve in planning without changing the user-facing requirement that agents receive call instructions.
- The `/spec-n-manifesto` command may have CLI and agent-skill forms, but it remains outside workflow execution and does not itself require step init/finalize.
- MCP is the authoritative deterministic agent execution surface; CLI commands provide parity for humans, scripts, and debugging.
- Ink flows are for interactive local management and should favor clear validation and review over bulk editing.
- Existing papercut, quick, and full behavior can be represented accurately as data-backed set lists without preserving hard-coded branches.
