# Feature Specification: Versioned Self-Contained Local CLI

**Feature Branch**: `006-versioned-local-cli`

**Created**: 2026-06-13

**Status**: Draft

**Input**: User description: "The 'local' cli should include the actual js files, not just the wrappers that point to the global install. Multiple projects should all be able to have their own versioned install. The dispatcher is the single entry point on the users path that needs to be able to work with any version of the cli in order to support the user using the version controlled version with their project."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Project-Locked CLI Version (Priority: P1)

A developer works on two repositories that were initialized with different toolkit versions. Each project carries its own complete local command-line installation. When the developer runs the toolkit from either project directory, that project’s pinned version executes—not whichever version happens to be installed globally.

**Why this priority**: Independent per-project versioning is the core problem. Without self-contained local installs, teams cannot reproduce workflows or share a repo whose behavior depends on a specific toolkit release.

**Independent Test**: Initialize two projects with different toolkit versions, run the same command in each from its root, and verify each reports and behaves according to its own pinned version without cross-project interference.

**Acceptance Scenarios**:

1. **Given** Project A was initialized with toolkit version 1.0.0 and Project B with 1.2.0, **When** the developer runs a version-reporting command from each project root, **Then** each project reports its own pinned version.
2. **Given** a project with a self-contained local install, **When** the global installation is upgraded or removed, **Then** commands run from that project still use the project’s bundled version.
3. **Given** a project’s local install is present, **When** the developer runs any supported subcommand from that project directory, **Then** execution uses only files within the project’s local installation (no dependency on an external toolkit package root).

---

### User Story 2 - Dispatcher Delegates to Any Local Version (Priority: P1)

A developer has only the global dispatcher on their system path. From any initialized project, typing the standard command name runs that project’s local full installation automatically, regardless of how old or new that local version is relative to the dispatcher.

**Why this priority**: The dispatcher is the sole path entry users rely on. It must remain a thin, stable entry point that hands off to whatever full CLI version a project owns.

**Independent Test**: Install only the dispatcher globally, initialize a project with an older local toolkit version, invoke the global command from the project directory, and confirm the local (older) version runs and produces correct output.

**Acceptance Scenarios**:

1. **Given** a globally installed dispatcher and a project with a local self-contained install, **When** the developer invokes the toolkit command from the project directory without flags, **Then** the dispatcher locates and runs the project’s local full CLI without loading full CLI logic in the dispatcher process.
2. **Given** a project local install at version N and a dispatcher at version N+2, **When** the developer invokes the toolkit from the project, **Then** version N executes and the version report identifies local execution and the local binary location.
3. **Given** no local install exists in the project tree, **When** the developer invokes the toolkit command, **Then** the dispatcher runs the global full CLI as today’s fallback behavior.
4. **Given** the developer passes an explicit global override flag, **When** a local install exists, **Then** the global full CLI runs instead of the local one.

---

### User Story 3 - Initialize and Update Produce Complete Local Install (Priority: P2)

A developer initializes a new project or updates an existing project’s toolkit. The operation copies or refreshes a complete, runnable local installation—including all runtime files needed by the full CLI and the project-local agent server—so the result is self-contained and version-recorded.

**Why this priority**: Self-contained installs must be created and maintained through existing lifecycle commands; otherwise adoption depends on manual steps.

**Independent Test**: Run project initialization, delete or relocate the global toolkit source, and confirm all standard commands and the agent server still work from the project.

**Acceptance Scenarios**:

1. **Given** a fresh project directory, **When** the developer runs initialization, **Then** a complete local installation is written under the project’s managed toolkit area with a recorded version identifier.
2. **Given** an existing project with a local install at version 1.0.0, **When** the developer runs a project upgrade to 1.1.0, **Then** the local installation is replaced with 1.1.0’s complete runtime files and the recorded version updates accordingly.
3. **Given** a local install produced by initialization, **When** the developer inspects the installation, **Then** it contains the executable entry points and bundled runtime artifacts—not thin scripts that reference an external package location as the sole source of truth.

---

### User Story 4 - Agent Integration Uses Local Bundled Server (Priority: P2)

A developer configures coding agents to use the project-local agent server binary. That server is part of the same self-contained local install as the CLI and matches the project’s pinned toolkit version.

**Why this priority**: Agents must stay version-aligned with the CLI; a wrapper that points elsewhere reintroduces the same coupling this feature removes.

**Independent Test**: After initialization, point an agent configuration at the project-local server path, invoke a deterministic mutation tool, and verify behavior matches the pinned local CLI version.

**Acceptance Scenarios**:

1. **Given** a project with a self-contained local install, **When** agent configuration is generated or refreshed, **Then** it references the project-local server entry point bundled alongside the CLI.
2. **Given** two projects on different pinned versions, **When** each agent session uses its respective project’s server, **Then** each session operates against that project’s version without sharing runtime files.

---

### User Story 5 - Version Transparency (Priority: P3)

A developer needs to confirm which toolkit version is running—dispatcher, delegated target, and local pin—especially when debugging version skew across machines.

**Why this priority**: Transparency supports trust and troubleshooting but depends on the self-contained install and dispatcher behavior being correct first.

**Independent Test**: Run the version-reporting command from a project with a pinned local install and verify the report lists dispatcher version, executed binary version, local/global target, and local install location.

**Acceptance Scenarios**:

1. **Given** delegation from dispatcher to a local self-contained install, **When** the developer requests version information, **Then** the report includes dispatcher version, executed binary version, `local` target, and absolute path to the local entry point.
2. **Given** execution with global override or no local install, **When** the developer requests version information, **Then** the report identifies `global` execution appropriately.

---

### Edge Cases

- What happens when a local install is incomplete or corrupted (missing runtime files)? The system reports a clear, actionable error and does not silently fall back to global unless the user explicitly requests global execution.
- What happens when a project is checked out on a machine with no global full CLI—only the dispatcher? Local self-contained installs must still run all project commands.
- What happens when two nested directories each contain a local install? The nearest install walking upward from the working directory wins, consistent with current resolution behavior.
- What happens on Windows versus Unix-like platforms? Both receive equivalent entry points (including platform-appropriate launchers) that run the same bundled runtime.
- What happens when a local install is version-controlled in git? Cloning the repository on another machine yields a runnable pinned version without re-running initialization, provided platform entry points are present.
- What happens when disk space is limited? Local installs are larger than thin wrappers; upgrade and init flows should report approximate footprint or failure when writes cannot complete.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Project initialization MUST install a self-contained local toolkit runtime under the project’s managed area, including all files required to run the full CLI and project-local agent server without referencing an external toolkit package root.
- **FR-002**: Each project’s local installation MUST record its toolkit version in project metadata so operators can identify the pinned release.
- **FR-003**: Multiple projects on the same machine MUST be able to hold different pinned versions simultaneously without sharing mutable runtime files.
- **FR-004**: The globally installed dispatcher MUST remain the only artifact required on the user’s path for routine invocation.
- **FR-005**: The dispatcher MUST locate the nearest project local entry point by walking parent directories from the working directory and MUST execute it as a separate process without loading full CLI or agent-server logic in-process.
- **FR-006**: The dispatcher MUST successfully delegate to local installs whose full CLI version differs from the dispatcher’s own version (forward and backward compatibility within supported major release boundaries).
- **FR-007**: When no local install is found, the dispatcher MUST fall back to the global full CLI using existing behavior.
- **FR-008**: When the user supplies an explicit global override, the dispatcher MUST run the global full CLI even if a local install exists.
- **FR-009**: Project upgrade operations MUST replace the local runtime with the target version’s complete bundled files and update the recorded version identifier.
- **FR-010**: Local entry points (`spec-n-roll`, short alias, and project-local agent server) MUST invoke the bundled runtime within the project install, not spawn to an external package location recorded as the sole source of truth.
- **FR-011**: Agent configuration generation and refresh MUST reference the project-local bundled agent server entry point.
- **FR-012**: Version reporting MUST continue to show dispatcher version, executed binary version, local/global target, and local entry path when applicable.
- **FR-013**: If a local install is found but cannot be executed (missing files, permission denied, corrupt install), the system MUST fail with a clear error and MUST NOT silently fall back to global unless the user explicitly requests global execution.
- **FR-014**: Remove and re-initialize flows MUST delete the self-contained local runtime along with other managed project toolkit files, restoring predictable cleanup behavior.

### Key Entities

- **Dispatcher**: The lightweight global entry point on the user’s path. Responsible only for resolving local vs global execution and spawning the appropriate full CLI process. Version-stable and independent of any single project’s pinned release.
- **Local Install**: The project-scoped, self-contained toolkit runtime including entry scripts, bundled executable artifacts, version metadata, and the agent server. Fully runnable without the global full CLI package.
- **Install Manifest**: Project metadata recording the pinned toolkit version and install integrity facts (e.g., install date, source of install). Does not replace bundled runtime files as the execution source.
- **Global Full CLI**: The complete toolkit installed with the dispatcher package, used when no local install applies or when the user forces global execution.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a two-project fixture with different pinned versions, 100% of command invocations from each project root execute the correct pinned version as reported by the version command.
- **SC-002**: After removing or upgrading the global full CLI on a machine that retains only the dispatcher, 100% of supported commands still succeed from a project with a self-contained local install.
- **SC-003**: Dispatcher delegation succeeds for local installs at least two minor versions behind and one minor version ahead of the installed dispatcher in integration tests.
- **SC-004**: Initialization produces a local install that contains zero references to an external toolkit package root as the sole execution target (verified by install inspection checks in automated tests).
- **SC-005**: Version report output allows a developer to identify dispatcher version, executed binary version, and local vs global target in a single command without reading log files.
- **SC-006**: Project upgrade from version A to version B completes with all post-upgrade smoke commands passing using only project-local files, without touching the global full CLI install.

## Assumptions

- The dispatcher and global full CLI continue to ship as a single globally installable package; only the local install model changes from thin wrappers to bundled runtime.
- Supported compatibility window for dispatcher-to-local version skew follows semantic versioning: dispatcher delegates to any local install sharing the same major version; cross-major delegation may fail with a clear message prompting project upgrade.
- Bundled local installs include whatever runtime dependencies the toolkit normally requires so that only the documented host runtime (not a separate global toolkit package) is needed on the machine.
- Existing resolution rules (nearest walk-up from working directory, global override flag, MCP always targeting project-local server) remain unchanged in behavior—only the local artifact layout changes.
- Disk footprint increase per project is acceptable for reproducibility; typical local install size stays within a reasonable bound for version-controlled repositories (exact size targets deferred to planning).
- Platform-specific launcher shims (e.g., Windows batch wrappers) may remain as thin platform adapters but MUST invoke the bundled runtime within the project tree, not an external package root.
