# Feature Specification: Instance-Aware Ink Screens

**Feature Branch**: `005-ink-instance-screens`

**Created**: 2026-06-13

**Status**: Draft

**Input**: User description: "The ink CLI app should show different options based on whether it's running as the local or global instance."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Global Instance Home and Installation Management (Priority: P1)

A toolkit maintainer launches the CLI from the global installation and immediately sees the install source (remote npm or local path), the current global version, whether an update is available, the detected project directory, and whether it has been initialized. They can update the global installation, initialize a new project, remove Spec N' Roll from a project, or re-initialize an existing project, all from the home screen.

**Why this priority**: The global instance is the entry point for all toolkit management. Without a distinct global home, the operator cannot tell whether they are managing the tool itself or a project. All installation, initialization, and removal actions depend on this context being visible and correct.

**Independent Test**: Can be fully tested by launching the CLI as the global instance against a project directory that is and is not initialized, verifying that the home screen displays the correct install source, version, latest-version comparison, project root, and project status, and that each option is enabled or disabled according to the rules.

**Acceptance Scenarios**:

1. **Given** the CLI starts as the global instance with a remote install source, **When** the home screen renders, **Then** the content area shows install source as "Remote", the current global version suffixed "(global)", the latest npm version or "Up to date", the detected project root, and the project initialization status.
2. **Given** the install source is local (linked from a source directory), **When** the home screen renders, **Then** the install source shows "Local" and the absolute path to the source project directory, and the latest version is compared against the source package version.
3. **Given** the project is not initialized, **When** the home screen renders, **Then** the "Remove Spec N' Roll" and "Re-install Spec N' Roll" options are disabled.
4. **Given** the install source is remote and the version is up to date, **When** the home screen renders, **Then** the "Update Spec N' Roll" option is disabled.
5. **Given** the install source is local, **When** the "Update Spec N' Roll" option is selected, **Then** the CLI builds from the local source directory and reloads.
6. **Given** the install source is remote and an update is available, **When** the "Update Spec N' Roll" option is selected, **Then** the CLI installs the latest version from the npm registry and reloads.

---

### User Story 2 - Local Instance Home and Project Navigation (Priority: P1)

A developer launches the CLI from the project-local installation and sees the local version, whether the global installation has a newer version, the detected project root, the next task spec ID, the last metadata update timestamp, and optionally the active current task with its creation and implementation start times. They can navigate to project management, agents, workflows, or Spec N' Roll installation management.

**Why this priority**: The local instance is the primary day-to-day interface for developers. Surfacing version freshness, project status, and the active task on the home screen eliminates context-switching to separate commands just to orient the session.

**Independent Test**: Can be fully tested by launching the local instance with an initialized project that has an active task, verifying that the home screen shows the correct version, latest-version comparison, project info, and task info with accurate timestamps, and that all navigation options route to the correct screens.

**Acceptance Scenarios**:

1. **Given** the CLI starts as the local instance, **When** the home screen renders, **Then** the content area shows the local version suffixed "(local)", the latest-version line comparing to the global install version, and the detected project root.
2. **Given** the project has a current task that is not completed, **When** the home screen renders, **Then** the content area includes the current task ID and title (from title-cased slug), its creation timestamp, and—if implementation has started but not finished—its implementation start timestamp; all timestamps are read from the task spec metadata file.
3. **Given** the project has no current task or the current task is completed, **When** the home screen renders, **Then** no current-task section appears in the content area.
4. **Given** the global version is newer than the local version, **When** the home screen renders, **Then** the "Latest Version" line shows the global version number; otherwise it shows "Up to date".
5. **Given** the developer selects "Project", **When** the selection is confirmed, **Then** the new Project screen opens.
6. **Given** the developer selects "Agents", **When** the selection is confirmed, **Then** the existing agents screen opens.
7. **Given** the developer selects "Workflows", **When** the selection is confirmed, **Then** the existing workflows screen opens.
8. **Given** the developer selects "Extensions", **When** the selection is attempted, **Then** the option is disabled and does not navigate.

---

### User Story 3 - Project Screen and Specification Summary (Priority: P2)

A developer opens the new Project screen from the local home and sees a summary of project health: the most recent specification with its status, and counts of specifications in each lifecycle state. They can navigate to the task specs browser, the project metadata editor, or return home.

**Why this priority**: The Project screen consolidates project-level visibility behind a single menu entry, replacing the previously flat navigation that mixed project metadata with top-level spec access.

**Independent Test**: Can be fully tested by opening the Project screen with a project that has specifications in multiple states, verifying that the content area shows the most recent spec name and status, counts per state, and that Specs and Project Metadata navigate to the existing respective screens.

**Acceptance Scenarios**:

1. **Given** the developer is on the local home screen and selects "Project", **When** the Project screen opens, **Then** the content area shows the most recent specification and its status, and the count of specifications in each lifecycle state.
2. **Given** the developer selects "Specs" from the Project screen, **When** the selection is confirmed, **Then** the existing task specs browser opens.
3. **Given** the developer selects "Project Metadata" from the Project screen, **When** the selection is confirmed, **Then** the existing project metadata screen opens. It is renamed "Project Metadata" wherever it previously appeared as "Project".
4. **Given** the developer selects "Back" from the Project screen, **When** the selection is confirmed, **Then** the local home screen is restored.

---

### User Story 4 - Local Installation Manage Screen (Priority: P2)

A developer opens the Manage screen from the local home and can update the local binary from the global installation, run the full project upgrade workflow, remove Spec N' Roll from the project, or re-initialize it, with options enabled or disabled based on whether the local and global versions differ and whether the project is initialized.

**Why this priority**: Separating binary-level maintenance from project-level navigation gives developers a clear, intentional path to update or replace their local installation without accidentally triggering project mutations from the home screen.

**Independent Test**: Can be fully tested by opening the Manage screen with both matching and mismatched local/global versions and both initialized and uninitialized states, verifying option availability and behavior for each combination.

**Acceptance Scenarios**:

1. **Given** the local and global versions are the same, **When** the Manage screen renders, **Then** the "Update Spec N' Roll" option is disabled.
2. **Given** the global version is newer, **When** the developer selects "Update Spec N' Roll", **Then** the global binary files are copied to the local project directory and the CLI reloads; project metadata and configuration files are not changed.
3. **Given** the developer selects "Upgrade Project", **When** the selection is confirmed, **Then** the update workflow runs: the local binary is refreshed, MCP server paths in all configured agents are updated, configuration is migrated, and any extension version incompatibilities are reported as warnings.
4. **Given** the project is initialized and the developer selects "Remove Spec N' Roll", **When** the selection is confirmed, **Then** a confirmation prompt appears; after the user confirms, the project installation and all Spec N' Roll managed files are removed.
5. **Given** the project is initialized and the developer selects "Re-install Spec N' Roll", **When** the selection is confirmed, **Then** the project is removed and the initialization workflow is run to restore it.
6. **Given** the project is not initialized, **When** the Manage screen renders, **Then** "Remove Spec N' Roll" and "Re-install Spec N' Roll" are disabled.
7. **Given** the developer selects "Back", **When** the selection is confirmed, **Then** the local home screen is restored.

---

### User Story 5 - Safe Quit with Double-Press Confirmation (Priority: P2)

A developer presses `q` (or `esc` on the home screen) to exit the CLI and is shown a confirmation prompt. If they press `q` again within three seconds the application exits; if they press any other key or wait longer, the quit is cancelled and the previous state is restored.

**Why this priority**: Accidental exits from a running interactive session can disrupt a developer's workflow. A lightweight two-press guard with a short timeout adds safety without being burdensome.

**Independent Test**: Can be fully tested by pressing `q` once and verifying the confirmation message appears, pressing `q` again within three seconds to confirm exit works, pressing a different key to verify cancellation, and waiting more than three seconds to verify timeout cancellation—on both the home screen and sub-screens.

**Acceptance Scenarios**:

1. **Given** the developer is on any screen, **When** `q` is pressed, **Then** the confirmation message "Press q again to quit" appears.
2. **Given** the confirmation message is visible, **When** `q` is pressed within three seconds, **Then** the application exits cleanly.
3. **Given** the confirmation message is visible, **When** any key other than `q` is pressed, **Then** the confirmation message disappears and the screen returns to its previous state.
4. **Given** the confirmation message is visible, **When** three seconds pass without any key press, **Then** the confirmation message disappears and the screen returns to its previous state.
5. **Given** the developer is on the home screen, **When** `esc` is pressed, **Then** the same confirmation flow as `q` is triggered.
6. **Given** the developer is on a sub-screen (not home), **When** `esc` is pressed, **Then** `esc` continues to function as a back-navigation key and does not trigger the quit confirmation.

---

### User Story 6 - Task Spec Timestamps Owned by Task Spec Metadata (Priority: P2)

A developer's current-task timestamps (creation time and implementation start time) are stored in and read from the task spec metadata file, not the project metadata file. The first time a task is created or implementation begins, the timestamps are recorded in the correct location. Pre-existing project metadata entries for these fields are no longer used.

**Why this priority**: Task-specific attributes belong to the task, not the project. Correcting the storage location removes an implicit coupling between the project-level record and individual task lifecycles, and makes each task's provenance self-contained.

**Independent Test**: Can be fully tested by creating a new task and starting implementation, then reading the task spec metadata file to confirm both timestamps appear there, and verifying the project metadata file does not contain them.

**Acceptance Scenarios**:

1. **Given** a new task spec is created, **When** the task file is written, **Then** a `createdAt` timestamp is recorded in the task spec metadata file.
2. **Given** implementation of a task has begun, **When** the implementation state is recorded, **Then** an `implementationStartedAt` timestamp is written to the task spec metadata file.
3. **Given** an existing project metadata file contains `createdAt` or `implementationStartedAt` fields, **When** the CLI reads task state, **Then** those project-metadata fields are ignored in favor of the task spec metadata fields; no data migration is required for existing projects.
4. **Given** the task spec metadata file does not yet contain a timestamp field for a completed past action, **When** the CLI reads the value, **Then** it treats the field as absent and omits the corresponding display line rather than showing an error.

---

### Edge Cases

- What happens when the project root cannot be detected via the tree walk? The current working directory is used as the fallback for global instance; local instance always has an explicit project root.
- What happens when the npm registry is unreachable during version check? The "Latest Version" line shows a loading or unavailable indicator rather than blocking the home screen.
- What happens when the local source file (pointing to the npm-linked source directory) is missing during a global update? The CLI falls back to a registry install rather than failing silently.
- What happens if the terminal reloads while a three-second quit timer is active? The timer is cancelled and the screen returns to its prior state.
- What happens when neither a current task nor project metadata exists? Each absent section is simply omitted; no error state is shown.
- What happens when the global installation is absent when the local instance checks the latest version? The "Latest Version" line shows "Global not found" or equivalent unavailable state.

## Requirements *(mandatory)*

### Functional Requirements

**Global Home Screen**

- **FR-001**: The global home screen content area MUST always display install source, current version (suffixed "(global)"), latest version comparison, detected project root, and project initialization status regardless of which menu option is selected.
- **FR-002**: The install source MUST be determined by inspecting a local file written at build time that records the absolute path to the source package; if that file exists, the source is "Local ({path})"; otherwise the source is "Remote".
- **FR-003**: When the install source is Remote, the latest version comparison MUST query the npm registry and display the registry version if it differs from the installed version, or "Up to date" if they match.
- **FR-004**: When the install source is Local, the latest version comparison MUST read the source package version and display that version if it differs from the running version, or "Up to date" if they match.
- **FR-005**: The project root MUST be detected via the existing CLI tree-walk logic starting from the current working directory; if no project root is detected the current working directory MUST be used.
- **FR-006**: Project initialization status MUST reflect whether the detected project root contains a valid Spec N' Roll initialization.
- **FR-007**: The global home screen MUST offer options: "Update Spec N' Roll", "Init Project", "Remove Spec N' Roll", "Re-install Spec N' Roll", and "Quit".
- **FR-008**: "Update Spec N' Roll" on the global home MUST be disabled when the install source is Remote and the version is up to date; it MUST always be enabled when the install source is Local.
- **FR-009**: "Remove Spec N' Roll" and "Re-install Spec N' Roll" MUST be disabled when the project is not initialized.
- **FR-010**: When the global "Update Spec N' Roll" is activated and the install source is Local, the CLI MUST run the build process in the source directory and then reload.
- **FR-011**: When the global "Update Spec N' Roll" is activated and the install source is Remote, the CLI MUST install the latest package version from the registry globally and then reload.
- **FR-012**: "Remove Spec N' Roll" on the global home MUST present a confirmation prompt before removing the project installation and all managed files.
- **FR-013**: "Re-install Spec N' Roll" on the global home MUST remove the project installation and then run the initialization workflow.
- **FR-014**: "Init Project" on the global home MUST run the initialization workflow in the current working directory.
- **FR-015**: "Quit" on the global home MUST trigger the double-press quit confirmation flow defined in FR-043 through FR-047.

**Local Home Screen**

- **FR-016**: The local home screen content area MUST always display the current local version (suffixed "(local)"), latest version comparison against the global install, and the detected project root.
- **FR-017**: The latest version comparison on the local home MUST compare the local version to the global installation version; if the global version is newer it MUST display the global version number, otherwise "Up to date".
- **FR-018**: The local home content area MUST display the next task spec ID and the last-updated timestamp from project metadata, separated from the version/project block by a blank line.
- **FR-019**: When a current task exists and has not been completed, the local home content area MUST display the current task ID and title (title-cased from the slug), its creation timestamp, and—if implementation has started but not yet completed—its implementation start timestamp, each separated from the prior block by a blank line.
- **FR-020**: The creation timestamp and implementation start timestamp shown on the local home MUST be read from the task spec metadata file, not from project metadata.
- **FR-021**: The local home screen MUST offer options: "Project", "Agents", "Workflows", "Extensions", "Manage Spec N' Roll", and "Quit".
- **FR-022**: "Extensions" MUST always be shown as disabled.
- **FR-023**: "Quit" on the local home MUST trigger the double-press quit confirmation flow.
- **FR-024**: Selecting "Project" MUST open the new Project screen.
- **FR-025**: Selecting "Agents" MUST open the existing agents screen.
- **FR-026**: Selecting "Workflows" MUST open the existing workflows screen.
- **FR-027**: Selecting "Manage Spec N' Roll" MUST open the new Manage screen.

**Project Screen (new)**

- **FR-028**: The Project screen MUST display information about the project's specifications, including at minimum the most recent specification with its status and the count of specifications in each lifecycle state.
- **FR-029**: The Project screen MUST offer options: "Specs", "Project Metadata", and "Back".
- **FR-030**: Selecting "Specs" from the Project screen MUST open the existing task specs browser.
- **FR-031**: Selecting "Project Metadata" from the Project screen MUST open the screen previously known as "Project"; that screen MUST be renamed to "Project Metadata" in all labels and titles.
- **FR-032**: Selecting "Back" from the Project screen MUST return to the local home screen.

**Manage Screen (local)**

- **FR-033**: The Manage screen content area MUST always display the local version, the latest version comparison against the global install, and the project root.
- **FR-034**: The Manage screen MUST offer options: "Update Spec N' Roll", "Upgrade Project", "Remove Spec N' Roll", "Re-install Spec N' Roll", and "Back".
- **FR-035**: "Update Spec N' Roll" on the Manage screen MUST be disabled when the local and global versions are the same.
- **FR-036**: When "Update Spec N' Roll" on the Manage screen is activated, the global installation binary files MUST be copied to the local project directory, overwriting the local binary; project metadata and configuration files MUST NOT be changed; the CLI MUST reload after copying.
- **FR-037**: When "Upgrade Project" is activated, the update workflow MUST run: the local binary is refreshed, MCP server paths in all configured agents are updated, configuration files are migrated, and any extension version incompatibilities are reported as warnings.
- **FR-038**: "Remove Spec N' Roll" on the Manage screen MUST present a confirmation prompt before removing the project installation and all managed files; it MUST be disabled when the project is not initialized.
- **FR-039**: "Re-install Spec N' Roll" on the Manage screen MUST remove the project installation and then run the initialization workflow; it MUST be disabled when the project is not initialized.
- **FR-040**: Selecting "Back" from the Manage screen MUST return to the local home screen.

**Navigation and Back**

- **FR-041**: Every screen except the home screen MUST include a "Back" option as the last selectable item that returns the user to the previous screen.
- **FR-042**: The home screen MUST include "Quit" as the last selectable item instead of "Back".

**Double-Press Quit Confirmation**

- **FR-043**: Pressing `q` on any screen MUST display a confirmation message "Press q again to quit" and start a three-second countdown.
- **FR-044**: If `q` is pressed again while the confirmation message is visible and within three seconds, the application MUST exit.
- **FR-045**: If any key other than `q` is pressed while the confirmation message is visible, the quit action MUST be cancelled and the screen MUST return to its previous state.
- **FR-046**: If three seconds elapse without any key press while the confirmation message is visible, the quit action MUST be cancelled and the screen MUST return to its previous state.
- **FR-047**: On the home screen, pressing `esc` MUST trigger the same confirmation flow as pressing `q`; on non-home screens `esc` MUST continue to function as back navigation and MUST NOT trigger the quit confirmation.

**Task Spec Timestamps**

- **FR-048**: The `createdAt` timestamp for a task spec MUST be written to the task spec metadata file when the task is first created.
- **FR-049**: The `implementationStartedAt` timestamp MUST be written to the task spec metadata file when the task enters the implementation-started state.
- **FR-050**: The project metadata file MUST NOT be used as the source of `createdAt` or `implementationStartedAt` for display or storage; if those fields exist there from prior versions, they MUST be ignored.
- **FR-051**: When a task spec metadata file does not contain a timestamp field for a past action, the CLI MUST treat the field as absent and omit the corresponding display line without reporting an error.

**Non-Interactive CLI Parity**

- **FR-052**: The non-interactive CLI MUST gain a "remove" command that removes the project installation of Spec N' Roll and all managed files; it MUST confirm with the user before proceeding.

### Key Entities

- **Install Source**: Whether the global CLI was installed from the npm registry ("Remote") or linked from a local source directory ("Local"), together with the path when Local. Determined by a build-time file that is excluded from the npm package but available via `npm link`.
- **Instance Type**: Whether the currently running CLI process is the global installation or the project-local installation. Determines which home screen and navigation structure to show.
- **Project Root**: The absolute path to the project directory that owns the session, detected by the existing tree-walk logic from the current working directory or falling back to the current working directory.
- **Project Status**: Whether the detected project root has been initialized with the toolkit (has valid workflow configuration).
- **Task Spec Metadata**: A per-task metadata file that records task-specific attributes including `createdAt` and `implementationStartedAt` timestamps.
- **Version Comparison**: The pairing of the currently running version against either the npm registry version (global remote), the source package version (global local), or the global installation version (local instance).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A global-instance operator can determine the install source, current version, latest available version, project root, and initialization status within three seconds of the home screen rendering—without running any additional commands.
- **SC-002**: A local-instance developer can determine the local version, whether an update is available, the project root, next task ID, and the active task with its timestamps within three seconds of the home screen rendering.
- **SC-003**: All navigable screens can be reached from the home screen in no more than two selections.
- **SC-004**: The quit confirmation flow completes—either exiting or cancelling—within a three-second window from the first `q` or `esc` press with no additional user action required.
- **SC-005**: Task creation and implementation-start events are recorded in the task spec metadata file with correct timestamps on 100% of invocations; the project metadata file is never updated for these fields.
- **SC-006**: All enabled options on global and local home screens correctly reflect their enabled/disabled state based on version parity and project initialization status on every render.
- **SC-007**: The "Remove Spec N' Roll" operation (interactive and non-interactive) leaves no Spec N' Roll managed files behind after a confirmed removal.

## Assumptions

- The CLI already has a reliable mechanism to detect whether the running process is the global or local instance (via `binaryContext` / `localBinaryPath` in session state); this feature uses that existing mechanism to branch home-screen behavior.
- The tree-walk logic for detecting the project root from the current working directory already exists and is reused unchanged.
- The npm registry is queried asynchronously; the home screen renders immediately with a loading state for the "Latest Version" field while the query is in flight.
- The local-source build-time file is a simple text or JSON file containing an absolute path; it is omitted from the npm published package via `.npmignore` and is present in the working directory when the package is linked with `npm link`.
- "Reload" means the CLI process restarts itself in place; the exact mechanism is determined during implementation and is consistent with the platform's process-replacement capability.
- Timestamp display format for all timestamps is `HH:mm:ss YYYY-MM-DD` in local time.
- Title-casing a task slug means splitting on hyphens, capitalizing the first letter of each word, and joining with spaces (e.g., `fix-payment-timeout` → "Fix Payment Timeout").
- The "Upgrade Project" workflow already exists; this feature exposes it as a Manage screen action without modifying its internals.
- Back navigation for all existing screens that currently lack a "Back" option will have one added as part of this feature.
- Mobile and browser environments are out of scope; all behavior targets ANSI terminal emulators on Windows, macOS, and Linux.
