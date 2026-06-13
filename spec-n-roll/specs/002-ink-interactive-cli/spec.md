# Feature Specification: Interactive Ink CLI Application

**Feature Branch**: `002-ink-interactive-cli`

**Created**: 2026-06-13

**Status**: Draft

**Input**: User description: "a new spec for the interactive CLI INK application. It should provide simple navigation of the existing specs, workflows and other toolkit resources, and management of their state and configuration. Any operation supported by CLI command should be supported in the application."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse and Inspect Toolkit Resources (Priority: P1)

A developer opens the interactive application from their project directory to understand what task specs exist, which workflow tier each spec is on, and what configuration is active — without memorizing CLI subcommands or file paths.

**Why this priority**: Discovery is the primary reason to launch an interactive session. If developers cannot quickly see project state, the application delivers no value over reading files manually.

**Independent Test**: Can be fully tested by launching the application in a project with multiple task specs and verifying that specs, workflow variants, configured agents, and project metadata are listed with accurate summaries.

**Acceptance Scenarios**:

1. **Given** a project initialized with Spec-N-Roll and two or more task spec directories, **When** the developer launches the interactive application, **Then** they see a navigable list of task specs showing numeric id, slug, lifecycle status, and current workflow step or progress indicator.
2. **Given** a project with configured workflow tiers and agents, **When** the developer opens the workflows or agents section, **Then** they see each workflow variant name, its step sequence summary, and each configured agent with its display name.
3. **Given** a selected task spec, **When** the developer views its detail screen, **Then** they see workflow state, available step artifacts (spec, plan, tasks), and lifecycle status without opening files in an editor.
4. **Given** a project that is not initialized, **When** the developer launches the interactive application, **Then** they are guided to initialize the project rather than shown an empty or confusing main menu.

---

### User Story 2 - Manage State and Configuration Interactively (Priority: P1)

A developer uses the interactive application to change task spec lifecycle status, workflow operational status, project metadata, task checkboxes, and agent configuration — the same mutations they would perform with non-interactive CLI subcommands.

**Why this priority**: State and configuration management is the second core value proposition. Navigation alone is insufficient if developers must drop back to CLI flags for every change.

**Independent Test**: Can be fully tested by performing each supported mutation through the interactive UI and verifying the same on-disk files change as when running the equivalent non-interactive CLI command.

**Acceptance Scenarios**:

1. **Given** an Active task spec, **When** the developer sets lifecycle status to Complete through the interactive application, **Then** `spec.md` frontmatter reflects the new status identically to `task status set`.
2. **Given** a task spec with unchecked items in `tasks.md`, **When** the developer marks one or more tasks complete through the interactive application, **Then** the corresponding checkboxes update identically to `task checkbox set`.
3. **Given** a task spec with workflow state, **When** the developer updates operational status or current step through the interactive application, **Then** `workflow-state.json` reflects the change identically to `workflow state write`.
4. **Given** an initialized project, **When** the developer adds or removes a configured agent through the interactive application, **Then** agent rules, skills pointers, extension manifests, and MCP configuration change identically to `config agent add` or `config agent remove`.
5. **Given** project metadata fields, **When** the developer updates them through the interactive application, **Then** `project-metadata.json` reflects the change identically to `project metadata write`.

---

### User Story 3 - Run Setup and Maintenance Operations (Priority: P2)

A developer uses the interactive application to initialize a new project, check versions, preview and apply toolkit updates, instantiate step output templates, and update spec frontmatter — covering all remaining CLI subcommands.

**Why this priority**: Setup and maintenance are less frequent than browsing and state edits, but full CLI parity requires them. Grouping them at P2 keeps the MVP focused on daily navigation and state work while still delivering the stated parity goal.

**Independent Test**: Can be fully tested by running init, version, update (including dry-run preview), step instantiation, and spec frontmatter update flows through the interactive UI and comparing outcomes to the non-interactive CLI.

**Acceptance Scenarios**:

1. **Given** an uninitialized directory, **When** the developer runs project initialization through the interactive application, **Then** the same toolkit-owned and user-owned files are created as with `init`, including agent selection prompts when agents are not pre-specified.
2. **Given** an initialized project, **When** the developer requests version information, **Then** they see dispatcher version, executed binary version, local/global target, and latest available version when discoverable — matching `version` output.
3. **Given** an available toolkit update, **When** the developer previews and confirms an update through the interactive application, **Then** the same files are updated, backups created, migrations applied, and summary reported as with `update`.
4. **Given** a task spec ready for a workflow step, **When** the developer instantiates a step output template through the interactive application, **Then** the template file appears in the task spec directory identically to `step instantiate`.
5. **Given** a task spec with editable frontmatter fields, **When** the developer updates non-status frontmatter through the interactive application, **Then** `spec.md` frontmatter merges identically to `spec frontmatter update`.

---

### User Story 4 - Navigate Efficiently with Keyboard-First Interaction (Priority: P2)

A developer moves through menus, lists, confirmations, and forms using keyboard controls with clear on-screen guidance, completing common tasks without typing full CLI commands.

**Why this priority**: Usability distinguishes an interactive application from a thin wrapper around CLI help text. Keyboard-first navigation matches terminal expectations and keeps the experience fast.

**Independent Test**: Can be fully tested by completing browse-and-update flows using only keyboard input and verifying visible focus indicators, breadcrumbs or back navigation, and confirmation prompts for destructive actions.

**Acceptance Scenarios**:

1. **Given** the main menu, **When** the developer uses arrow keys and enter, **Then** they can reach any top-level section (specs, workflows, agents, project, setup/maintenance) and return to the previous screen with a consistent back action.
2. **Given** a list with more items than fit on screen, **When** the developer scrolls the list, **Then** the focused item remains visible and the current position is apparent.
3. **Given** a destructive or irreversible action (such as applying an update with overwrites or removing an agent), **When** the developer initiates the action, **Then** they must confirm explicitly before changes are applied.
4. **Given** any screen, **When** the developer invokes a global quit action, **Then** the application exits cleanly with no partial writes unless a confirmed operation is in progress.

---

### Edge Cases

- What happens when the working directory is not inside an initialized project? The application offers initialization or exits with a clear message explaining that most features require an initialized project.
- What happens when `specs/` contains directories that do not match the expected `{numeric-id}-{slug}` pattern? They are listed separately as unrecognized entries with a warning, not silently ignored or mis-parsed.
- What happens when workflow state and on-disk artifacts disagree? The detail view surfaces the mismatch and warns the developer before any advance or write operation, consistent with existing toolkit behavior.
- What happens when multiple Active task specs exist and an operation requires a single target? The application presents a numbered selection prompt, matching the interactive behavior used by agent workflow commands.
- What happens when a read-only inspection target file is missing or unreadable? The application shows a clear error for that resource without crashing the session; the developer can navigate back and continue.
- What happens when the developer runs a subcommand-equivalent operation that would fail validation in non-interactive mode? The same validation rules apply and the error is shown in context with remediation guidance.
- What happens when `list agents` is invoked with no bundled agents available? The agents section shows an empty state with guidance rather than a blank screen.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Launching `spec-n-roll` with no subcommand or arguments MUST open the interactive Ink application as the default entry point for the full CLI binary.
- **FR-002**: Invoking `spec-n-roll <subcommand> [args]` MUST continue to run non-interactively, synchronously exit, and MUST NOT open the interactive application.
- **FR-003**: The interactive application MUST provide a main navigation structure covering at minimum: task specs, workflows, agents, project metadata, and setup/maintenance operations.
- **FR-004**: The task specs section MUST list all directories under the user-owned specs root, showing numeric id, slug, lifecycle status, workflow operational status when available, and current or last-completed step summary.
- **FR-005**: The task spec detail view MUST display workflow state contents, lifecycle status, presence of step artifacts (spec, plan, tasks), and shortcuts to supported mutations for that spec.
- **FR-006**: The workflows section MUST list configured workflow variants from project workflow configuration, including each variant's ordered step sequence in human-readable form.
- **FR-007**: The agents section MUST list bundled agents and distinguish configured versus available agents, equivalent to `list agents` with and without the enabled-only filter.
- **FR-008**: The interactive application MUST support every non-interactive CLI subcommand operation defined for the toolkit: `init`, `version`, `list agents`, `update`, `config agent add`, `config agent remove`, `workflow state read`, `workflow state write`, `task status set`, `task checkbox set`, `project metadata read`, `project metadata write`, `step instantiate`, and `spec frontmatter update`.
- **FR-009**: Each interactive mutation MUST produce the same on-disk results and honor the same validation rules, confirmations, and safety behaviors as its non-interactive CLI equivalent, routed through the shared core library.
- **FR-010**: The interactive application MUST reuse existing Ink prompt flows where they already exist (init agent selection, update confirmation, and similar) rather than duplicating divergent UX for the same operation.
- **FR-011**: When an operation requires selecting one task spec from multiple Active specs, the application MUST present a numbered-list selection prompt with no silent default.
- **FR-012**: Destructive or high-impact operations (toolkit update with overwrites, agent removal, workflow state overwrites) MUST require explicit confirmation before applying changes.
- **FR-013**: Read-only inspection operations MUST NOT modify project files.
- **FR-014**: The application MUST surface actionable error messages when project files are missing, invalid, or inconsistent, allowing the developer to return to navigation without terminating the session except for unrecoverable startup failures.
- **FR-015**: The application MUST indicate the current project root and whether the CLI is operating against a local or global toolkit binary context when that information is available.
- **FR-016**: Agent workflow slash commands (`/spec-n-specify`, `/spec-n-plan`, `/spec-n-roll`, and similar) are out of scope for this feature; the interactive application covers CLI subcommands only and MAY reference agent commands as guidance text where helpful.

### Key Entities

- **Interactive Session**: A running terminal UI session bound to a resolved project root, navigation stack, and optional selected task spec context.
- **Task Spec Summary**: A read model combining directory identity (numeric id, slug), lifecycle status from spec frontmatter, workflow state, and artifact presence for display and selection.
- **Workflow Variant Summary**: A read model of a named tier or workflow definition including its ordered step list as configured in project workflow configuration.
- **Agent Summary**: A read model of a bundled agent id, display name, and whether it is currently configured in the project.
- **Project Metadata View**: A read model of project-level counters and current implementation task pointers from project metadata configuration.
- **CLI Operation**: A named capability mapping one interactive flow to exactly one non-interactive CLI subcommand contract, sharing the same core mutation or query implementation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can locate any task spec and view its status and workflow progress within 30 seconds of launching the interactive application in a project with up to 20 task specs.
- **SC-002**: 100% of documented non-interactive CLI subcommand operations are reachable through the interactive application without requiring the developer to type subcommand names or flags for required inputs.
- **SC-003**: For every supported mutation, the resulting on-disk files are byte-equivalent to running the corresponding non-interactive CLI command with the same inputs in 100% of acceptance test scenarios.
- **SC-004**: 90% of first-time users can complete agent add/remove and task status change flows using only on-screen key hints, without consulting external CLI documentation.
- **SC-005**: When launched outside an initialized project, 100% of users receive a clear next step (initialize or exit) within the first screen — no unexplained empty states or stack traces.
- **SC-006**: Uninitialized or read-only navigation flows introduce no file mutations; verified by file watchers across exploratory test sessions.

## Assumptions

- The existing non-interactive CLI subcommands and core library contracts from the base toolkit feature remain the source of truth for behavior; this feature adds an interactive presentation layer, not new mutation semantics.
- Agent workflow slash commands remain agent-facing; developers who want to run specify, plan, implement, or roll workflows continue to use their configured coding agent.
- The interactive application targets developers working in a terminal environment with standard ANSI support; graphical mouse-only interaction is not required.
- Full CLI parity means operational equivalence of outcomes and validations, not identical text output formatting between interactive screens and stdout from non-interactive commands.
- Existing Ink components for init, update, and recovery prompts are extended and composed rather than replaced, preserving established confirmation patterns.
- Listing living spec files is in scope as read-only navigation; creating or editing living spec Gherkin content remains agent-managed and is not required in this feature.
- Extension manifest editing beyond what `config agent add/remove` already triggers is out of scope; extensions are visible when referenced by configured agents but not authorable through new interactive editors in this feature.
