# Feature Specification: Spec-n-Roll Toolkit

**Feature Branch**: `001-spec-n-roll-toolkit`

**Created**: 2026-06-09

**Status**: Draft

**Input**: User description: "spec-n-roll is a toolkit is an AI development workflow for spec driven development..."

---

## Clarifications

### Session 2026-06-09

- Q: Should living spec Gherkin scenarios be tagged with the originating task spec ID? → A: Yes. When a task spec creates or updates living spec scenarios, those scenarios MUST be tagged with the task spec ID (e.g., `@task-001`). This enables running only the Cucumber tests relevant to a specific task.
- Q: What naming convention should be used for agent workflow commands? → A: All commands MUST use the `spec-n-` prefix (e.g., `/spec-n-specify`, `/spec-n-plan`, `/spec-n-implement`). A `/spec-n-roll` meta-command MUST also exist that advances the workflow to the next appropriate step without the developer needing to know the current state or selected workflow tier.
- Q: Should individual workflow definitions be user-configurable? → A: Yes. Workflows MUST be definable in configuration files in the user's project setup. A default workflow MUST be provided on init. The extension model MUST support multiple named workflow definitions, step reuse across workflows, and triage/selector steps that choose between workflows at runtime.
- Q: How should `/spec-n-roll` determine the current workflow position? → A: An explicit state file is written to the task spec directory after each step completes. If the state file is absent or unreadable, artifact detection (presence/absence of spec.md, plan.md, tasks.md, etc.) is used as a self-healing fallback.
- Q: What is the granularity of the task ID tag applied to Gherkin scenarios? → A: One tag per workflow run using the task spec directory ID (e.g., `@task-001`). All scenarios created or modified in a single workflow run share the same tag.
- Q: When a workflow step is interrupted mid-execution and `/spec-n-roll` is next invoked, what should happen? → A: Restart the interrupted step from the beginning. If partial artifacts are detected, warn the developer and ask for a single confirmation before proceeding — one confirmation covers all artifacts for that step, not one confirmation per artifact.
- Q: When a later workflow run modifies a Gherkin scenario already tagged from a prior run, how should tags accumulate? → A: Additive — all task tags are retained. A scenario modified by tasks 001 and 002 carries both `@task-001` and `@task-002`. Tags are never removed from a scenario.
- Q: Should documentation be a first-class deliverable of the toolkit? → A: Yes. The toolkit MUST ship comprehensive documentation covering the overall workflow, the extension/plugin process, multi-agent setup, platform configuration, CLI usage, and the update/migration model. Documentation must be treated as a first-class feature, not an afterthought.
- Q: Should a CLI application be provided for toolkit setup, update, and configuration? → A: Yes. A TypeScript CLI application MUST be provided that enables developers to set up a new toolkit installation, update an existing installation, and modify configuration. This is the primary non-agent interaction surface for the toolkit.
- Q: Should the toolkit be versioned to support safe updates? → A: Yes. The toolkit MUST be versioned. The CLI MUST support checking for updates and applying them. Toolkit files MUST be classified as either toolkit-owned (overwritten on update) or user-owned (preserved on update). These two categories MUST NOT overlap.
- Q: How should config schema changes be handled across toolkit versions? → A: Config files MUST use a versioned schema designed for backward compatibility. Projects using older config schemas MUST continue to work after a toolkit update. Breaking changes to config schemas require a migration path that the CLI can assist with.
- Q: What is the precise backward compatibility mechanism for config schemas? → A: Breaking schema changes are permitted. Schema migration happens at CLI update time — not JIT at runtime. The CLI uses an additive-only "read schema" (tolerant reader) to parse any prior config version, migrates it to the current schema, and writes the migrated config back to disk as part of the update. At runtime (outside of an update), the toolkit may assume all configs are already at the current schema version. Schema migration logic lives in the CLI update path only.
- Q: Can extensions declare toolkit version compatibility, and what happens on a mismatch? → A: Extensions declare the specific toolkit version they were designed for in their manifest. The toolkit maintains a compatibility declaration listing toolkit versions it is known to be incompatible with for a given extension. Version mismatches surface as warnings at upgrade time — they are never shown at runtime and never block execution.
- Q: What is the guiding principle for classifying a file as toolkit-owned vs user-owned? → A: Intent-based, made clear through directory location — toolkit-owned files live in designated toolkit directories; user-owned files live in separate, designated user directories. The directory location communicates and enforces the ownership intent. A file's location determines its ownership class.
- Q: When a toolkit update would overwrite a toolkit-owned file that the user has locally modified, what should happen? → A: Overwrite with backup — the CLI saves a `.bak` copy of any locally modified toolkit-owned file before overwriting it, and reports each conflict in the update summary. The developer can recover their changes from the backup. The toolkit-owned file is always updated to the new version.
- Q: How is the TypeScript CLI distributed, installed, and versioned? → A: The CLI is globally installed. When initializing a project, the CLI writes a local copy of itself into the project. On every invocation, the globally installed CLI checks the working directory for a local version and delegates execution to it if found — the global CLI acts as a dispatcher. If no local version is found, the global CLI executes directly. A flag (e.g., `--global`) allows the developer to force use of the global version regardless of whether a local version exists.
- Q: How is a task spec "marked complete" and locked to enforce immutability? → A: The toolkit automatically marks a task spec complete when it executes the final workflow step. After completion, the user may request additional actions (e.g., re-run tests, re-analyze) without the spec being locked. Locking (full immutability) is triggered when a NEW workflow run begins any step beyond `/spec-n-specify`. `/spec-n-specify` itself never locks a prior task spec, allowing multiple specs to coexist before any implementation begins.
- Q: Where does the toolkit's documentation live and how is it accessed? → A: Markdown files bundled inside the toolkit's own repository only — no hosted site. Documentation is not installed into user projects.
- Q: How should documentation files be classified under the file ownership model? → A: Documentation files live only in the toolkit's own repository and are not installed into user projects — they are entirely excluded from the toolkit-owned vs. user-owned classification.
- Q: What depth and structure is required for extension/plugin documentation? → A: Quick-start guide + reference (manifest schema, hook events, step interfaces) + at least one fully worked extension example. This structure applies to the extension/plugin documentation specifically and must be at least as thorough as the built-in workflow documentation.
- Q: Do extension interfaces carry formal stability or deprecation guarantees? → A: The toolkit version as a whole follows semver. Breaking changes to any extension interface (step contracts, hook event shapes, manifest schema) require a toolkit major version bump. Extension authors rely on the toolkit's semver guarantee — interfaces are not individually versioned and no per-interface deprecation cycle is required.
- Q: When a developer declines the interrupted-step confirmation, can they inspect partial artifacts before deciding? → A: Yes. The confirmation prompt MUST offer three choices: restart (overwrite all partial artifacts), cancel (leave partial artifacts in place for inspection), or force-clean (delete all partial artifacts and restart). Cancelling leaves the workflow in a paused state that can be resumed via `/spec-n-roll`.

### Session 2026-06-09 (Design Interview)

- Q: How should task spec directory IDs be assigned? → A: Hybrid model. The toolkit auto-assigns a unique, sequential, zero-padded numeric ID (e.g., `001`). The developer may optionally provide a descriptive slug; if omitted, the toolkit derives a kebab-case slug from the feature description (truncated as needed). Slugs are not required to be unique; only the numeric ID must be unique. Directory format: `specs/{numeric-id}-{slug}/`.
- Q: Where and how should living specification Gherkin files be organized? → A: A dedicated user-owned directory (e.g., `living-specs/`) containing one `.feature` file per application domain or capability area. The toolkit routes updates to the appropriate file.
- Q: How should deprecated living spec scenarios be handled? → A: Removed from living spec files entirely. Version control history is the sole archival record — no in-repo archive directory or archive tags.
- Q: When the workflow state file conflicts with artifacts on disk, which source wins? → A: The state file wins when present and parseable. The toolkit warns about the artifact mismatch and requires a single confirmation before proceeding.
- Q: What happens when the feature description is empty or too ambiguous to triage? → A: Present all available workflow tiers and require the developer to pick one manually, skipping triage.
- Q: How does initialization handle agents that are not installed? → A: Agent selection is purely user input during initialization. The toolkit generates configuration for selected agents with no verification that any agent is installed.
- Q: How are conflicting living spec scenarios detected? → A: No dedicated conflict-detection step. The toolkit attempts to update all relevant living specs as new functionality is defined. Contradictions are surfaced by automated Cucumber test runs.
- Q: What happens when Gherkin steps have no matching step definitions? → A: Generate stub step definitions in the failing test suite, clearly marked as stubs requiring implementation.
- Q: What post-completion actions are allowed on Complete task specs? → A: Unrestricted — any workflow command may run against a Complete spec until locking occurs. When `/spec-n-clarify` adds new un-implemented requirements, they are appended to the spec and the task spec reverts from Complete to Active.
- Q: Where should task spec directories live? → A: A dedicated user-owned `specs/` directory with one `{numeric-id}-{slug}/` subdirectory per workflow run.
- Q: Where do generated Cucumber tests live relative to living specs? → A: Living specs are the Cucumber Gherkin `.feature` files in `living-specs/`; Cucumber runs against them directly. Step definitions and executable test code live in the project's standard test location — no duplicate feature files.
- Q: What happens when no configured script runtime is available on the current platform? → A: Fail with a clear error identifying the missing script variant and remediation steps.
- Q: At which workflow step(s) should living specs be updated? → A: Living spec updates occur at implementation entry. The tasks step MUST list updating living specs as its first task(s), executed before test generation or production code.
- Q: Can multiple task specs be in implementation simultaneously? → A: No. Only one Active task spec may be in the implement phase at a time; others must remain in pre-implement stages.
- Q: What happens when an extension fails at runtime after an upgrade warning? → A: Fail the current workflow step with a clear error citing the extension and prior upgrade warning, with remediation guidance. Warnings are not retroactively upgraded to block startup.
- Q: How should `/spec-n-roll` determine which task spec to advance when multiple are Active? → A: A versioned project-level metadata file identifies the current task. `/spec-n-roll` uses this file at implement time; pre-implement routing is governed separately (see next item).
- Q: When is the current-task metadata file updated? → A: Validated and set when the implement step begins, establishing which task spec is authoritative for implementation.
- Q: How are pre-implement workflow commands scoped when multiple Active task specs exist? → A: Require an explicit task ID on every pre-implement workflow command when multiple Active specs exist.
- Q: What is the relationship between `/spec-n-specify` and `/spec-n-clarify`? → A: `/spec-n-specify` creates a new task spec and includes the initial iterative interview. `/spec-n-clarify` is a follow-up step for additional clarifications on an existing spec, with its own iterative interview process for those follow-ups.
- Q: What should `/spec-n-analyze` do? → A: Cross-artifact consistency and quality analysis across the current task spec's spec, plan, tasks, and optionally living specs — producing a non-destructive report of gaps, contradictions, and checklist failures.
- Q: When a Complete spec reverts to Active via clarify, what happens to other Complete specs? → A: Other Complete specs remain Complete (unlocked) until the reverted spec begins a non-specify step or a different task spec begins a non-specify step.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Multi-Agent Project Initialization (Priority: P1)

A developer initializes spec-n-roll on a new or existing project and selects one or more AI coding agents (e.g., Cursor, Claude Code, GitHub Copilot) to use. The toolkit generates agent-specific rules, skills, and configuration for every selected agent so that any team member can immediately start a spec-driven workflow with their preferred agent, with no manual cross-agent setup.

**Why this priority**: The ability to configure and use multiple agents is the primary differentiator of spec-n-roll from existing spec-driven toolkits. Without this, every other workflow step is blocked or degraded.

**Independent Test**: A developer can run `init`, select two agents, then open the project in both agent environments and verify that the full slash-command workflow (`/spec-n-specify`, `/spec-n-plan`, `/spec-n-tasks`, `/spec-n-implement`, `/spec-n-roll`) is available in each without additional configuration.

**Acceptance Scenarios**:

1. **Given** a project with no agent configuration, **When** the developer runs initialization and selects multiple agents, **Then** agent-specific rule files and skill files are created for each selected agent and the core workflow commands are available in all of them.
2. **Given** a multi-agent project already initialized, **When** a new agent is added via a configuration command, **Then** the toolkit generates rules and skills for the new agent without breaking the configuration of existing agents.
3. **Given** two developers using different agents on the same project, **When** each runs a workflow command, **Then** both receive consistent behavior, artifact naming, and file structure outcomes.
4. **Given** no supported AI agent is installed on the developer's machine, **When** the developer runs initialization and selects agents to configure, **Then** initialization completes successfully and agent-specific files are generated for the selected agents without any installation verification.

---

### User Story 2 — Platform-Appropriate Script Execution (Priority: P1)

A developer on any platform (Windows, macOS, Linux) can run spec-n-roll automation scripts without manually selecting the right script type. During setup, the developer opts into bash (`.sh`), PowerShell (`.ps1`), or both. At runtime, if both are configured, the toolkit detects the current platform and runs the correct script variant automatically.

**Why this priority**: Cross-platform reliability is a foundational requirement. Broken scripts on any platform destroy trust in the toolkit and block the entire workflow.

**Independent Test**: A developer on Windows can run a workflow that triggers automation scripts and verify that the `.ps1` variant executes; the same project on macOS runs the `.sh` variant without any configuration change.

**Acceptance Scenarios**:

1. **Given** only `.sh` scripts are configured, **When** the developer runs a workflow that triggers a script on a platform without a configured script runtime, **Then** the toolkit fails with a clear error identifying the missing variant and remediation steps.
2. **Given** both `.sh` and `.ps1` scripts are configured, **When** the toolkit runs on Windows, **Then** it automatically selects and executes the `.ps1` variant.
3. **Given** both scripts are configured, **When** the toolkit runs on macOS or Linux, **Then** it automatically selects and executes the `.sh` variant.
4. **Given** a developer explicitly overrides the script variant, **When** the workflow runs, **Then** the explicitly chosen variant is used regardless of detected platform.

---

### User Story 3 — Interactive Specification via Iterative Questioning (Priority: P1)

A developer describes a feature in plain language to start a `/spec-n-specify` session, which creates a new task spec directory. Rather than producing a complete spec from the first prompt alone, the agent interviews the developer with targeted, one-at-a-time questions — drilling into ambiguous areas, resolving branches of the decision tree, and suggesting answers — until the specification is complete and the developer is satisfied. The resulting spec is recorded as a formal artifact. `/spec-n-clarify` is a separate follow-up step for additional clarifications on an existing spec, using its own iterative interview process.

**Why this priority**: High-quality specifications are the foundation of all downstream work. An iterative, interactive session produces significantly higher quality specs than a single-prompt approach, reducing rework in planning and implementation.

**Independent Test**: A developer provides a vague one-sentence feature description. After a structured interview, a complete, unambiguous specification artifact is produced that passes all quality checklist items without manual editing.

**Acceptance Scenarios**:

1. **Given** a minimal feature description, **When** the specification session starts, **Then** the agent identifies the most ambiguous aspect and asks exactly one targeted question with suggested answers before proceeding.
2. **Given** the developer answers a question, **When** the answer is recorded, **Then** the agent moves to the next unresolved aspect of the spec — not re-asking resolved questions.
3. **Given** all critical questions are answered, **When** the session concludes, **Then** a complete specification artifact is written to the feature directory with no unresolved placeholders.
4. **Given** a sufficiently detailed initial description, **When** the session starts, **Then** the agent may skip questions it can answer confidently using reasonable defaults, noting those assumptions.

---

### User Story 4 — Complexity-Based Workflow Triage and Zero-Knowledge Continuation (Priority: P2)

When a developer starts a new workflow run, the toolkit internally assesses the complexity of the described task and routes it to the appropriate workflow tier — selected from the available named workflow definitions in the project configuration. A simple papercut bug fix proceeds directly to a combined plan-and-tasks step. A medium change combines specification and clarification into a single session. A complex feature triggers the full specify → clarify → plan → tasks → implement workflow.

The developer can always use `/spec-n-roll` as a single entry point: it determines the current workflow and state and advances to the next appropriate step automatically, without the developer needing to know which workflow is active or what phase is in progress.

**Why this priority**: Running a full spec-driven workflow for a typo fix creates friction and erodes developer trust. Scaling the workflow to task complexity ensures the toolkit feels natural for all task sizes. `/spec-n-roll` removes the cognitive overhead of navigating multi-step workflows.

**Independent Test**: Three feature descriptions of clearly different complexity (one-line bug fix, medium feature addition, major cross-cutting feature) each route to the correct workflow tier. Running `/spec-n-roll` repeatedly on a mid-workflow project advances it through each remaining step in order, with no manual step-selection required.

**Acceptance Scenarios**:

1. **Given** a feature description that matches low-complexity heuristics (e.g., single-file bug, UI copy change), **When** the developer initiates a workflow, **Then** the toolkit proposes the streamlined tier and proceeds after confirmation.
2. **Given** a feature description indicating high complexity (cross-cutting concerns, new subsystems, multi-actor interactions), **When** the workflow is initiated, **Then** the full multi-step workflow is selected and the developer is informed of all phases.
3. **Given** the toolkit selects a workflow tier, **When** the developer disagrees with the selection, **Then** the developer can explicitly override the triage decision and choose any available tier.
4. **Given** an empty or too-ambiguous feature description, **When** the toolkit cannot confidently triage, **Then** it presents all available workflow tiers and requires the developer to pick one manually, skipping triage.
5. **Given** a workflow in progress with some steps completed, **When** the developer runs `/spec-n-roll`, **Then** the toolkit identifies the next incomplete step and executes it without prompting the developer to identify the step manually.
6. **Given** a completed workflow, **When** the developer runs `/spec-n-roll`, **Then** the toolkit informs the developer that the workflow is complete and no further steps remain.
7. **Given** multiple Active task specs exist, **When** the developer runs a pre-implement workflow command, **Then** the developer MUST supply an explicit task ID to identify which spec to advance.

---

### User Story 5 — Living Specification Maintenance (Priority: P2)

The project maintains a set of living specification files written in Cucumber Gherkin syntax in a dedicated user-owned directory (e.g., `living-specs/`), with one `.feature` file per application domain or capability area. These living specs always reflect the full, current, accepted behavior of the application across all delivered features. When a new feature implementation begins, the living specs are created or updated to incorporate the new feature's scenarios before any test or production code is written — the tasks step lists living spec updates as its first task(s). The living specs serve as the source of truth for what the application is and does.

**Why this priority**: Living specs provide persistent, human-readable documentation of application behavior that survives agent sessions, team changes, and codebase refactors. They are the bedrock of the TDD approach.

**Independent Test**: After three separate feature implementation cycles, a developer can read the living specs and understand the full current behavior of the application — with no stale scenarios — without inspecting the code. Behavioral contradictions are surfaced by Cucumber test runs, not a separate toolkit conflict-detection step.

**Acceptance Scenarios**:

1. **Given** no living specs exist, **When** the first feature implementation begins, **Then** the toolkit creates the initial Gherkin feature files representing the new feature's behavior.
2. **Given** living specs already exist, **When** a new feature implementation begins, **Then** the toolkit updates the existing Gherkin files to add new scenarios and amends any scenarios that the new feature changes, without removing unrelated scenarios.
3. **Given** a feature is removed or deprecated, **When** the corresponding living spec scenarios are updated, **Then** the removed scenarios are deleted from living spec files and the record is preserved in version control history only.
4. **Given** a living spec file, **When** a developer reads it without any other context, **Then** the scenarios are written in plain language sufficient for a non-technical stakeholder to understand what the system does.
5. **Given** a task spec with ID `001`, **When** the toolkit creates or updates living spec Gherkin scenarios for that task, **Then** each new or modified scenario is tagged with `@task-001` so that the test runner can filter and execute only the tests relevant to that task.
6. **Given** living spec scenarios tagged with multiple task IDs, **When** a developer instructs the test runner to execute tests for task `002`, **Then** only scenarios tagged `@task-002` are included in that run.
7. **Given** a scenario already tagged `@task-001`, **When** task `002` modifies that scenario, **Then** the scenario retains `@task-001` and gains `@task-002` — the prior tag is never removed.

---

### User Story 6 — Three-State Task Spec Lifecycle (Priority: P2)

Each workflow run creates a task-focused specification directory under `specs/{numeric-id}-{slug}/` (spec, plan, tasks, workflow state) scoped to that specific implementation. The numeric ID is unique and auto-assigned; the slug is optional and need not be unique. The directory progresses through three states: **Active** while the workflow runs, **Complete** when the final step executes (allowing any workflow command until locking), and **Locked** (fully immutable) when locking is triggered.

Multiple task specs may coexist in Active or Complete state simultaneously — `/spec-n-specify` does not lock prior specs. Only one Active task spec may be in the implement phase at a time. When `/spec-n-clarify` adds new un-implemented requirements to a Complete spec, the spec reverts to Active. Other Complete specs remain unlocked until the reverted spec begins a non-specify step or a different task spec begins a non-specify step. Locked task specs serve as a permanent, tamper-proof record of what was planned and built.

**Why this priority**: A three-state lifecycle balances audit trail integrity with post-completion flexibility. Locking at the start of the next implementation run (rather than at completion) gives developers a window to take additional actions on a finished spec before it is permanently sealed.

**Independent Test**: A developer completes a workflow run. They re-run test analysis (post-completion action) — the spec is not yet locked. They then start a new implementation-phase step — the prior spec locks. Any subsequent write attempt to the locked spec directory is rejected with a clear error.

**Acceptance Scenarios**:

1. **Given** a task spec in Active state, **When** the toolkit executes the final workflow step successfully, **Then** the task spec transitions to Complete state and the developer is informed they may still perform additional actions.
2. **Given** a task spec in Complete state, **When** the developer runs any workflow command that does not add new un-implemented requirements (e.g., re-run tests, `/spec-n-analyze`), **Then** the action executes and the spec remains in Complete state — it is not locked.
3. **Given** a task spec in Complete state, **When** the developer runs `/spec-n-clarify` and adds new un-implemented requirements, **Then** the requirements are appended and the task spec reverts to Active state; other Complete specs remain Complete.
4. **Given** one or more task specs in Complete state, **When** a different task spec begins any step beyond `/spec-n-specify`, **Then** all Complete task specs transition to Locked state before the new step proceeds.
5. **Given** a Complete spec that reverted to Active via clarify, **When** that spec begins a non-specify step, **Then** all other Complete task specs transition to Locked state before the step proceeds.
6. **Given** a task spec in Locked state, **When** any workflow command attempts to write to that spec directory, **Then** the toolkit raises a clear error and declines to modify the locked spec.
7. **Given** a Locked task spec, **When** a developer reads it, **Then** they can see the original requirements, plan, and task list exactly as they were when the spec was locked.
8. **Given** multiple `/spec-n-specify` invocations before any implementation step, **When** a developer inspects the project, **Then** multiple Active task spec directories coexist and none of the previously created specs have been locked.
9. **Given** one task spec is already in the implement phase, **When** a developer attempts to begin implementation on a different Active task spec, **Then** the toolkit declines with a clear error indicating only one implementation may be active at a time.

---

### User Story 7 — TDD Cucumber Test Suite Workflow (Priority: P2)

When implementation begins for a feature, the toolkit uses the living specification Gherkin `.feature` files in `living-specs/` as the Cucumber feature source and generates or updates step definitions and support code in the project's standard test location. Tests are written first (failing), then code is written to make them pass, following the red-green-refactor cycle. Unmapped Gherkin steps receive clearly marked stub step definitions. The toolkit guides the developer through each phase and reports test results at each cycle.

**Why this priority**: TDD with living-spec-driven Cucumber tests ensures that the application always behaves as specified, that regressions are caught immediately, and that the test suite documents real behavior — not implementation details.

**Independent Test**: A developer runs the implementation workflow for a feature with living spec Gherkin scenarios. Before writing any code, a failing test suite exists. After implementation, all tests pass. The tests are written against the public interface of the application, not internal implementation.

**Acceptance Scenarios**:

1. **Given** living spec Gherkin scenarios for a feature, **When** implementation begins, **Then** a failing test suite (red) exists — Cucumber runs against the living spec `.feature` files with step definitions (including stubs for unmapped steps) in the standard test location — before any production code is written.
2. **Given** a failing test suite, **When** the developer implements the feature, **Then** the toolkit tracks which tests are now passing and presents progress until all tests go green.
3. **Given** all tests passing, **When** the developer refactors, **Then** the toolkit validates that tests remain green after each refactor step.
4. **Given** a test generated from a Gherkin scenario, **When** the implementation changes internally without changing behavior, **Then** the test continues to pass without modification (tests are behavior-focused, not implementation-focused).

---

### User Story 8 — Extensible and Configurable Workflow Definitions (Priority: P3)

A developer or tooling author can replace or extend any individual step in the spec-n-roll workflow with a custom implementation, without forking or modifying the toolkit core. Workflow variants — named, ordered compositions of steps — are defined in project configuration files. Multiple workflow definitions can coexist and share steps. A triage or selector step can be included in a workflow to choose between other workflow variants at runtime. Extensions are a first-class feature documented as thoroughly as the built-in workflow.

**Why this priority**: Extensibility is what transforms spec-n-roll from a fixed workflow tool into a platform. Teams with unique processes (JIRA-triggered specs, compliance gates, custom triage logic) can integrate without maintaining forks. Configurable workflow files make the system inspectable and adjustable without code changes.

**Independent Test**: A developer defines two named workflow variants in a config file — one short (plan + tasks only) and one full (specify → clarify → plan → tasks → implement). They register a triage step that selects between them based on the feature description. Running `/spec-n-roll` on a simple task selects the short workflow; on a complex task it selects the full workflow. Both variants share the same built-in `plan` and `tasks` step implementations.

**Acceptance Scenarios**:

1. **Given** a custom workflow step registered as an extension, **When** the toolkit processes that phase, **Then** the custom step is invoked instead of the built-in step.
2. **Given** multiple extensions contributing to the same phase, **When** the workflow runs, **Then** priority ordering determines which extension is active and the developer is informed of the active step for each phase.
3. **Given** an extension is disabled, **When** the workflow runs, **Then** the built-in step for that phase executes without any intervention from the disabled extension.
4. **Given** a workflow variant definition that combines a custom specification step with the built-in plan and tasks steps, **When** the developer runs that variant, **Then** the correct mix of custom and built-in steps executes in the defined order.
5. **Given** multiple named workflow variants defined in the project configuration, **When** a triage selector step evaluates the current task, **Then** it selects one workflow variant and the remaining steps of that variant are executed in order.
6. **Given** a freshly initialized project, **When** the developer inspects the workflow configuration, **Then** a default workflow definition is present that covers the full specify → clarify → plan → tasks → implement sequence.
7. **Given** two workflow variants that both include the `plan` and `tasks` steps, **When** both are defined in the configuration, **Then** they reference the shared step definition rather than duplicating it.

---

### User Story 9 — CLI-Based Toolkit Setup, Update, and Configuration (Priority: P2)

A developer uses a TypeScript CLI application as the primary non-agent interface for managing their spec-n-roll installation. The CLI handles the initial setup of the toolkit in a project, upgrades to newer toolkit versions, and modification of the toolkit configuration (e.g., adding agents, switching script variants). The CLI is the authoritative tool for any operation that modifies toolkit-owned files.

**Why this priority**: A dedicated CLI separates toolkit management concerns from workflow execution, provides a reliable upgrade path, and ensures that configuration changes are performed through a validated interface rather than by hand-editing files.

**Independent Test**: A developer uses the CLI to initialize a project, later runs an update command to apply a new toolkit version, and confirms that their user-owned config files are preserved while toolkit-owned files are updated to the new version.

**Acceptance Scenarios**:

1. **Given** an empty project directory, **When** the developer runs the CLI setup command, **Then** all toolkit-owned files are written to the project, a default workflow config is created, and the developer is prompted to select agents and script variants.
2. **Given** an initialized project on an older toolkit version, **When** the developer runs the CLI update command, **Then** toolkit-owned files are updated to the new version and all user-owned files (config, extensions, custom steps) are preserved without modification.
3. **Given** a developer who wants to add a new agent to an existing project, **When** they run the CLI modify command, **Then** the toolkit generates the appropriate rules and skill files for the new agent without altering any other existing configuration.
4. **Given** a toolkit update that includes a config schema change, **When** the developer runs the update command, **Then** the CLI reads all user-owned config files using the tolerant reader, migrates them to the current schema, writes them back to disk, and reports which files were updated.
5. **Given** a project with a locally installed CLI version, **When** the developer invokes the globally installed CLI from within that project directory, **Then** the global CLI detects the local version and delegates execution to it transparently.
6. **Given** a developer who needs to run the global CLI version regardless of local installation, **When** they invoke the CLI with the `--global` flag, **Then** the global version executes directly and the local version is not consulted.

---

### User Story 10 — Versioned Toolkit with Safe Update Model (Priority: P2)

Every release of the spec-n-roll toolkit carries a version identifier. Files in the project are classified as either toolkit-owned (updated when the toolkit version changes) or user-owned (always preserved on update). The classification is unambiguous — a file cannot be in both categories. Config files use a versioned schema that guarantees backward compatibility: projects on older config schemas continue to work after updating, and the CLI provides migration assistance when breaking schema changes are unavoidable.

**Why this priority**: Without a clear ownership boundary and versioning model, toolkit updates are dangerous — they risk silently overwriting user customizations. A safe update model is prerequisite to teams trusting the toolkit enough to keep it current.

**Independent Test**: A developer customizes their workflow config file and registers a custom extension. After a toolkit update that includes both a core skill file change and a config schema version bump, their custom config and extension are untouched and the project still works. The updated skill file reflects the new version.

**Acceptance Scenarios**:

1. **Given** the toolkit is at a known version, **When** the developer queries the CLI, **Then** the current installed version is reported and the latest available version is shown for comparison.
2. **Given** toolkit-owned files and user-owned files coexist in the project, **When** a toolkit update is applied, **Then** only toolkit-owned files are modified and user-owned files remain byte-for-byte identical to their pre-update state.
3. **Given** a config file written for an older schema version, **When** the developer runs a CLI update, **Then** the CLI reads the old config using the tolerant reader, migrates it to the current schema, and writes the updated config back to disk — all on-disk configs are at the current schema version when the update completes.
4. **Given** a toolkit update that introduces a breaking config schema change, **When** the developer applies the update, **Then** the CLI presents a migration plan and requires explicit confirmation before modifying any user-owned config files.
5. **Given** an installed extension whose manifest targets an older toolkit version, **When** the developer runs a CLI update to a newer toolkit version, **Then** the CLI evaluates the extension against the toolkit's compatibility declarations, and if a mismatch is found, reports it as a warning in the update summary — the update completes and the extension continues to execute without being blocked.
6. **Given** a developer has locally modified a toolkit-owned file, **When** a toolkit update would overwrite that file, **Then** the CLI saves a `.bak` copy of the modified file alongside it, overwrites the file with the new toolkit version, and reports the conflict in the update summary so the developer can reconcile their changes.

---

### Edge Cases

- **No agents installed at init**: Initialization completes based on developer-selected agents; no installation verification is performed.
- **No script runtime on platform**: The toolkit fails with a clear error naming the missing variant and remediation steps.
- **Interrupted workflow**: Partial artifacts are preserved. `/spec-n-roll` re-presents the three-choice prompt (restart / cancel / force-clean). Cancelling leaves artifacts in place for inspection.
- **Living spec scenario conflicts**: No toolkit conflict-detection step. Contradictions are surfaced by automated Cucumber test runs.
- **Empty or ambiguous feature description**: All workflow tiers are presented; the developer must pick one manually, skipping triage.
- **Unmapped Gherkin step definitions**: Stub step definitions are generated in the failing test suite, clearly marked as stubs.
- **State file vs. artifact mismatch**: The state file wins when present and parseable; the developer is warned and must confirm once before proceeding.
- **Deleted `.bak` conflict file**: No other toolkit record exists; the developer must rely on version control history if the backup was deleted.
- **Extension runtime failure after upgrade warning**: The current workflow step fails with a clear error citing the extension and prior warning. Warnings are not retroactively upgraded to block startup.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The toolkit MUST support configuration of one or more AI coding agents during initialization based on developer selection, generating agent-specific rules and skill files for each selected agent. The toolkit MUST NOT verify that selected agents are installed.
- **FR-002**: The toolkit MUST allow seamless use of any configured agent on a project — switching between agents MUST NOT require manual reconfiguration of workflow commands.
- **FR-003**: Automation scripts MUST be available in both shell (`.sh`) and PowerShell (`.ps1`) variants; the developer MUST be able to opt into one or both during setup.
- **FR-004**: When both script variants are configured, the toolkit MUST automatically detect the current platform and execute the correct script variant without developer intervention. When no configured script runtime is available on the current platform, the toolkit MUST fail with a clear error identifying the missing variant and remediation steps.
- **FR-005**: The toolkit MUST support interactive, iterative specification sessions where the agent asks one targeted question at a time, provides suggested answers, and waits for developer input before proceeding. `/spec-n-specify` MUST include this interview when creating a new task spec. `/spec-n-clarify` MUST run a separate interview for follow-up clarifications on an existing spec.
- **FR-006**: The toolkit MUST include an internal triage step that evaluates task complexity and selects an appropriate workflow tier before the developer begins the main workflow. When the feature description is empty or too ambiguous to triage, the toolkit MUST present all available workflow tiers and require the developer to pick one manually, skipping triage.
- **FR-007**: The developer MUST be able to override the triage-selected workflow tier.
- **FR-008**: Living specifications MUST be authored and maintained as Cucumber Gherkin `.feature` files in a dedicated user-owned directory (e.g., `living-specs/`), with one file per application domain or capability area. They MUST represent the complete, current accepted behavior of the application. Deprecated scenarios MUST be removed from living spec files; version control history is the archival record.
- **FR-009**: Living specification files MUST be updated at implementation entry before any test or production code is written. The tasks step MUST list updating living specs as its first task(s). The toolkit MUST attempt to update all relevant living specs as new functionality is defined. Behavioral contradictions MUST be surfaced by automated Cucumber test runs — not a separate toolkit conflict-detection step.
- **FR-010**: Task-focused specification files (spec, plan, tasks) MUST be created as a new directory under `specs/{numeric-id}-{slug}/` for each workflow run. The toolkit MUST auto-assign a unique, sequential, zero-padded numeric ID. The developer MAY provide an optional slug; if omitted, the toolkit MUST derive a kebab-case slug from the feature description. Slugs are not required to be unique.
- **FR-011**: Task-focused specification directories follow a three-state lifecycle: Active → Complete → Locked. The toolkit MUST transition a task spec to Complete automatically when the final workflow step executes. Any workflow command MAY run against a Complete spec until locking. When `/spec-n-clarify` adds new un-implemented requirements, the spec MUST revert from Complete to Active. The toolkit MUST transition all Complete task specs to Locked when a different task spec begins any step beyond `/spec-n-specify`, or when a reverted spec begins a non-specify step. `/spec-n-specify` MUST NOT trigger locking of prior task specs. Only one Active task spec MAY be in the implement phase at a time. Locked task specs MUST be immutable — the toolkit MUST refuse any write attempts to a Locked task spec directory.
- **FR-012**: When implementation begins, Cucumber MUST run against the living spec Gherkin `.feature` files directly. Step definitions and executable test code MUST reside in the project's standard test location. The toolkit MUST generate stub step definitions for unmapped Gherkin steps, clearly marked as stubs. Tests MUST be failing (red) before any production code is written.
- **FR-013**: Generated tests MUST target the public behavior interface of the application, not internal implementation details, so they survive internal refactors without modification.
- **FR-014**: Every workflow step MUST be independently replaceable by an extension, without modifying the toolkit core.
- **FR-015**: The toolkit MUST provide a documented extension mechanism that supports registering custom workflow steps, hooks, triage/selector steps, and workflow variant definitions in project configuration files.
- **FR-016**: Documentation MUST be treated as a first-class deliverable of the toolkit. It MUST comprehensively cover: the overall workflow (all steps and their interactions), the extension/plugin mechanism (step replacement, hooks, workflow variant definition, triage steps), multi-agent setup and switching, platform configuration (script variant selection), CLI usage (setup, update, modify), and the versioning and migration model. Documentation MUST be sufficient for a developer to adopt and extend the toolkit without consulting source files. Documentation MUST be authored as Markdown files residing in the toolkit's own repository; documentation is NOT installed into user projects and is NOT subject to the file ownership classification. Extension/plugin documentation MUST include, at minimum: a quick-start guide, a reference section covering the manifest schema, hook events, and step interfaces, and at least one fully worked extension example.
- **FR-017**: All agent workflow commands MUST use the `spec-n-` prefix (e.g., `/spec-n-specify`, `/spec-n-plan`, `/spec-n-tasks`, `/spec-n-implement`, `/spec-n-clarify`, `/spec-n-analyze`, `/spec-n-roll`).
- **FR-018**: A `/spec-n-roll` meta-command MUST exist that determines the current workflow and its progress, then executes the next appropriate step — without requiring the developer to know which workflow tier is active or which step was last completed. At implement time, `/spec-n-roll` MUST use the versioned project metadata file to identify the current task spec. When multiple Active task specs exist, pre-implement workflow commands MUST require an explicit task ID.
- **FR-019**: When a task spec creates or updates living specification Gherkin scenarios, the task spec directory ID tag (e.g., `@task-001`) MUST be added to every new or modified scenario. Tags MUST be additive — if a scenario is later modified by task `002`, the `@task-001` tag MUST be preserved and `@task-002` MUST be added alongside it. Tags are never removed from a scenario. This enables test runners to filter by any task that created or modified a scenario, and supports "which tasks touched this scenario?" queries.
- **FR-020**: Named workflow variants MUST be definable in project configuration files. A default workflow definition MUST be written to the project during initialization. Steps MUST be reusable across multiple workflow variant definitions without duplication. A triage or selector step MUST be a first-class step type that can choose between workflow variants at runtime.
- **FR-021**: The toolkit MUST write a workflow state file to the task spec directory after each step completes, recording the active workflow variant and the last completed step. When the state file is present and parseable but conflicts with artifacts on disk, the state file MUST take precedence; the toolkit MUST warn the developer and require a single confirmation before proceeding. If the state file is absent or unreadable when `/spec-n-roll` is invoked, the toolkit MUST fall back to artifact detection to infer the current workflow position before proceeding.
- **FR-022**: When `/spec-n-roll` detects that the next step to execute has partial artifacts on disk (indicating a prior interrupted run), it MUST warn the developer and present a three-choice prompt: **restart** (overwrite all partial artifacts and restart the step from the beginning), **cancel** (leave all partial artifacts in place for manual inspection — the workflow remains in a paused state resumable via `/spec-n-roll`), or **force-clean** (delete all partial artifacts, then restart the step from the beginning). One prompt covers all artifacts for that step — the toolkit MUST NOT prompt per-artifact.
- **FR-023**: The toolkit MUST provide a TypeScript CLI application as the primary interface for toolkit management. The CLI MUST support at minimum: initial project setup, version update, and configuration modification (adding agents, changing script variants). The CLI MUST be the only supported mechanism for applying toolkit updates. During project initialization, the CLI MUST install a local copy of itself into the project directory. On every invocation, the globally installed CLI MUST check the working directory for a local version and delegate execution to it if found; if no local version exists, the global CLI executes directly. A `--global` flag MUST allow the developer to bypass local version detection and force execution of the globally installed version.
- **FR-024**: Every toolkit release MUST carry a version identifier following semantic versioning (MAJOR.MINOR.PATCH). A breaking change to any extension interface — including step contracts, hook event shapes, or the manifest schema — MUST trigger a toolkit major version bump. Extension authors rely on the toolkit's semver guarantee; extension interfaces are not individually versioned. The CLI MUST be able to report the currently installed version and the latest available version, and MUST provide a command to apply updates. Each extension manifest MUST declare the specific toolkit version it was designed for. The toolkit MUST maintain a compatibility declaration listing toolkit version / extension version combinations it knows to be incompatible. During a CLI update, the CLI MUST evaluate all installed extensions against these compatibility declarations and report any mismatches as warnings. Version mismatch warnings MUST NOT block the update or block subsequent workflow execution.
- **FR-025**: Every file written to a project by the toolkit MUST be classified as either toolkit-owned or user-owned, with the two categories being mutually exclusive. Documentation files are excluded from this classification entirely — they reside only in the toolkit's own repository and are never written to user projects. The classification MUST be communicated through directory location: toolkit-owned files MUST reside in designated toolkit directories; user-owned files MUST reside in separate, designated user directories. A file's location determines its ownership class — there is no per-file override. Toolkit-owned files are overwritten on update; user-owned files are never modified by the toolkit update process. Before overwriting any toolkit-owned file, the CLI MUST check whether it has been locally modified; if so, it MUST save a `.bak` copy before overwriting and report the conflict in the update summary.
- **FR-026**: All config files MUST carry a schema version identifier. The CLI MUST maintain an additive-only "read schema" (tolerant reader) capable of parsing config files written for any prior schema version. Schema migration MUST occur at CLI update time: the CLI reads all user-owned config files using the tolerant reader, migrates them to the current schema, and writes the updated configs back to disk before completing the update. Breaking schema changes between toolkit versions are permitted. At runtime (outside of CLI update), the toolkit MAY assume all configs conform to the current schema version.
- **FR-027**: The toolkit MUST maintain a versioned project-level metadata file identifying the current task spec for implementation. This metadata MUST be validated and set when the implement step begins.
- **FR-028**: `/spec-n-analyze` MUST perform cross-artifact consistency and quality analysis across the current task spec's spec, plan, tasks, and optionally living specs, producing a non-destructive report of gaps, contradictions, and checklist failures.
- **FR-029**: When an extension fails at runtime after an upgrade-time compatibility warning, the toolkit MUST fail the current workflow step with a clear error citing the extension and prior warning, with remediation guidance. Upgrade warnings MUST NOT be retroactively upgraded to block startup.

### Key Entities

- **Agent Configuration**: Represents a configured AI coding agent, including its rules files, skill files, and command mappings.
- **Living Specification**: A Cucumber Gherkin `.feature` file in the dedicated `living-specs/` directory representing the current accepted behavior of one domain area of the application. These files are the direct Cucumber feature source. Evolves with the application; deprecated scenarios are removed with version control as the archival record.
- **Task Spec**: A directory at `specs/{numeric-id}-{slug}/` containing the spec, plan, tasks, and workflow state file for a single workflow run. The numeric ID is unique and auto-assigned; the slug is optional and need not be unique. Follows a three-state lifecycle: **Active** (workflow in progress), **Complete** (final workflow step executed — any workflow command permitted until locking; clarify with new requirements reverts to Active), **Locked** (fully immutable — triggered when a different task spec or a reverted spec begins a non-specify step).
- **Project Metadata**: A versioned file at the project level identifying the current task spec for implementation. Validated and set when the implement step begins. Used by `/spec-n-roll` at implement time.
- **Workflow Step**: A single phase in the spec-driven development process (e.g., specify, clarify, plan, tasks, implement). Independently replaceable via extensions.
- **Workflow Variant**: A named, ordered composition of workflow steps defined in a project configuration file, potentially mixing built-in and custom steps. Multiple variants can share step definitions. A variant may include a triage/selector step that chooses between other variants at runtime.
- **Workflow State**: The persisted record of the active workflow variant and the last completed step for the current task spec. Stored as an explicit state file in the task spec directory, written after each step completes. Used by `/spec-n-roll` to determine the next step without developer input. If the state file is absent or unreadable, the toolkit falls back to artifact detection (presence/absence of `spec.md`, `plan.md`, `tasks.md`, etc.) to infer the current position.
- **Extension**: A registered, self-contained module that provides a custom implementation of one or more workflow steps or hooks. Each extension manifest MUST declare the specific toolkit version it was designed for. This declaration is used at upgrade time to surface compatibility warnings — it does not block execution.
- **Triage/Selector Step**: A special step type that evaluates the current task and selects a workflow variant to execute. Can be placed at any position in a workflow and is configurable as any other step.
- **Triage Assessment**: The output of a triage/selector step — the evaluation of a feature description that determines which workflow variant to activate (e.g., low / medium / high complexity tier).
- **Script Variant**: A platform-specific automation script (`.sh` for Unix-like, `.ps1` for Windows) that performs the same logical operation.
- **CLI Tool**: The TypeScript command-line application provided by spec-n-roll for toolkit management (setup, update, configuration). Distinct from the AI agent workflow commands — the CLI manages the toolkit installation itself, not the development workflow.
- **Toolkit Version**: A release identifier following semantic versioning (MAJOR.MINOR.PATCH) attached to every toolkit distribution. A breaking change to any extension interface requires a major version bump. Recorded in the project after initialization and updated by the CLI on upgrade. Used to detect when project files are out of sync with the installed toolkit. Extension authors rely on the toolkit's semver guarantee to know which toolkit versions are safe to target without breaking changes.
- **File Ownership Class**: The classification of every project file as either toolkit-owned (overwritten on toolkit update) or user-owned (preserved on toolkit update). Communicated through directory location — toolkit-owned files live in designated toolkit directories; user-owned files live in separate designated user directories. The two classes are mutually exclusive and the directory structure makes the classification self-evident without consulting a separate manifest. Documentation files are excluded from this classification — they reside only in the toolkit's own repository and are never installed into user projects.
- **Config Schema Version**: A version identifier embedded in every config file recording which toolkit schema version it conforms to. During a CLI update, the CLI reads all configs using an additive-only tolerant reader, migrates them to the current schema, and writes the result back to disk. After an update completes, all on-disk configs are at the current schema version. Runtime toolkit code may assume configs are at the current version.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can initialize spec-n-roll with multiple agents and run a full workflow command in each configured agent environment within 5 minutes of initialization, with no additional setup steps.
- **SC-002**: A developer on Windows and a developer on macOS can clone the same spec-n-roll project and execute a script-driven workflow step without modifying any configuration files.
- **SC-003**: An interactive specification session produces a complete, checklist-passing specification artifact for a complex feature in 3 or fewer iterative question rounds.
- **SC-004**: After 3 feature implementation cycles, the living specification files accurately describe 100% of delivered feature behaviors with no stale scenarios. Behavioral contradictions are detected by Cucumber test runs.
- **SC-005**: A simple bug-fix workflow (low-complexity triage) completes from description to implementation in fewer steps than the full specify → clarify → plan → tasks → implement workflow.
- **SC-006**: A custom extension step can be registered and used in a workflow run without modifying any file in the toolkit's core directory.
- **SC-007**: All generated Cucumber tests remain passing after an internal refactor that does not change observable application behavior, with zero test modifications required.
- **SC-008**: A developer unfamiliar with spec-n-roll can understand the full workflow and the extension mechanism by reading the documentation alone, without consulting source files.
- **SC-009**: A developer can initialize a project, apply a toolkit update, and add a new agent to an existing project using only CLI commands, with no manual file editing required.
- **SC-010**: After a toolkit update, all user-owned config files and custom extensions remain fully functional with zero manual intervention, provided no breaking schema changes were introduced.
- **SC-011**: A project initialized with an older toolkit version can apply a new version's update without data loss — user-owned files are byte-identical before and after the update (excluding migrations explicitly confirmed by the developer).

---

## Assumptions

- Developers select which supported AI coding agents to configure (Cursor, Claude Code, GitHub Copilot, or equivalent) during initialization; the toolkit does not verify that selected agents are installed.
- The project will be used in environments with Git installed; version control integration (branching, commit hooks) is in scope but not required for core workflow functionality.
- Cucumber/Gherkin tooling for test execution is the responsibility of the project under development, not the toolkit itself; the toolkit generates Gherkin files and step scaffolding but does not bundle a test runner.
- Multi-agent support targets agents that can be configured via rules files and/or skills files in a project directory; agents requiring proprietary configuration formats beyond this model are out of scope for v1.
- Platform auto-detection covers Windows (PowerShell) and Unix-like systems (bash/sh); other shell environments (fish, zsh-specific features) are not required for the initial release.
- The iterative specification session (grill-me style) operates within a single agent conversation session; persistence of session state across multiple conversations is desirable but not required for v1.
- The CLI tool requires a Node.js/TypeScript runtime on the developer's machine; this is treated as a prerequisite for CLI-based setup and update operations.
- The toolkit is designed for use within a project directory; the CLI tool handles both initial bootstrapping and subsequent update/modification operations from within or targeting the project directory.
