# Data Model: Instance-Aware Ink Screens

## Instance Type

Describes which CLI installation is running the interactive session.

**Fields**:

- `invocation`: Either `global` or `local`. Must match `VersionInvocationTarget` from version report.
- `localBinaryPath`: Absolute path to project-local launcher when `invocation` is `local`; absent for global.

**Validation Rules**:

- Set once at session startup from `buildVersionReport()`; immutable for the session unless reload creates a new process.
- Determines root route id: `global-home` vs `local-home`.

## Install Source (global only)

Describes how the global CLI package was installed.

**Fields**:

- `kind`: `remote` or `local`.
- `sourcePath`: Absolute path to linked source package root when `kind` is `local`; absent when remote.
- `markerPath`: Absolute path to build-time marker file checked at runtime.

**Validation Rules**:

- `kind` is `local` only when marker file exists and `sourcePath` inside resolves to readable `package.json`.
- Otherwise `kind` is `remote`.

## Version Comparison

Pairing of running version against the applicable latest target.

**Fields**:

- `currentVersion`: Semver of running CLI (suffix `(global)` or `(local)` in display only).
- `latestLabel`: One of `Up to date`, a semver string, `Checking…`, or `Unavailable`.
- `isUpToDate`: Boolean derived from semver equality when both sides known.
- `comparisonTarget`: `npm-registry`, `linked-source`, or `global-install`.

**Validation Rules**:

- Global remote: compare `currentVersion` to npm registry latest for package name `spec-n-roll`.
- Global local: compare `currentVersion` to version in linked source `package.json`.
- Local instance: compare local version to global install version from global CLI package root.
- When comparison target unreachable, `latestLabel` is `Unavailable` and update actions follow disabled/enabled rules using last known state.

## Project Context (home/manage content)

Project directory and initialization state shown on home and manage screens.

**Fields**:

- `projectRoot`: Absolute detected project directory.
- `isInitialized`: Whether workflow configuration is readable at project root.
- `detectionSource`: `tree-walk` or `cwd-fallback`.

**Validation Rules**:

- Global instance: walk upward from cwd via existing `findLocalCli` / workflow-config detection; fallback to cwd when no initialized root found.
- Local instance: use session `projectRoot` from launch (already resolved).

## Local Home Task Summary

Task-oriented block on local home content area.

**Fields**:

- `nextTaskSpecId`: Integer from project metadata; omitted when metadata absent.
- `metadataUpdatedAt`: Formatted `HH:mm:ss YYYY-MM-DD` from project metadata `updatedAt`.
- `currentTask`: Optional nested object when current task exists and is not completed.

**Nested `currentTask` fields**:

- `taskSpecId`: Zero-padded id from project metadata.
- `slug`: Kebab-case slug from project metadata.
- `title`: Title-cased display derived from slug.
- `createdAt`: Formatted timestamp from task metadata file; line omitted when absent.
- `implementationStartedAt`: Formatted timestamp from task metadata; line omitted when task not in started-but-incomplete implement state.

**Validation Rules**:

- Current task section omitted when `currentTaskSpecId` is null or workflow/lifecycle indicates completed implement.
- `implementationStartedAt` line omitted when field absent or implement already complete.
- Timestamps never read from project metadata `implementationStartedAt` (legacy field ignored).

## Task Spec Metadata (new persistence)

Per-task provenance stored beside each task spec.

**Location**: `specs/{taskSpecId}-{slug}/.spec-n-roll/task-metadata.json`

**Fields**:

- `createdAt`: ISO-8601 datetime set when task spec directory is first created.
- `implementationStartedAt`: ISO-8601 datetime set when implement slot is claimed for this task.

**Validation Rules**:

- File created on first write; both fields optional on read.
- Writers: `specify` flow sets `createdAt`; `claimImplementSlot` sets `implementationStartedAt` on the active task's file.
- Project metadata MUST NOT receive new writes to `implementationStartedAt`; existing values ignored for display.

## Project Hub View

Summary for the Project screen content area.

**Fields**:

- `mostRecentSpec`: Optional `{ directoryName, taskSpecId, slug, lifecycleStatus, operationalStatus }`.
- `statusCounts`: Map of lifecycle status → count (includes `unknown` bucket).
- `totalSpecCount`: Count of recognized task spec directories.

**Validation Rules**:

- Most recent spec is recognized directory with highest numeric `taskSpecId`.
- Status counts include only recognized directories.

## Menu Option State

Selectable home/manage/project menu row with enablement rules.

**Fields**:

- `id`: Stable option identifier.
- `key`: Numeric shortcut shown in label.
- `label`: Display text including number prefix.
- `disabled`: Whether selection is blocked.
- `routeId`: Target route when enabled and selected.

**Global home enablement**:

| Option | Disabled when |
|--------|----------------|
| Update Spec N' Roll | Remote install AND up to date |
| Init Project | Never |
| Remove / Re-install | Project not initialized |
| Quit | Never |

**Local manage enablement**:

| Option | Disabled when |
|--------|----------------|
| Update Spec N' Roll | Local version equals global version |
| Upgrade Project | Never (may warn if uninitialized) |
| Remove / Re-install | Project not initialized |

## Quit Confirmation State (session UI)

Transient app-shell state for double-press quit.

**Fields**:

- `pending`: Whether confirmation message is visible.
- `startedAt`: Monotonic or wall time when first `q`/`esc` (home) received.
- `timeoutMs`: Fixed 3000.

**Validation Rules**:

- Second `q` while `pending` and within timeout → exit app.
- Any other key while `pending` → clear pending, restore prior UI.
- Timeout expiry → clear pending without exit.
- `esc` on home routes triggers same flow as `q`; `esc` on non-home routes calls `popRoute()` and does not enter quit flow.

## Navigation Stack Changes

**New route ids**:

- `global-home`: Global instance root.
- `local-home`: Local instance root.
- `project-hub`: Local project summary hub.
- `manage-local`: Local installation management.

**Renamed titles**:

- `project-metadata-view`: title becomes `Project Metadata` (was `Project`).

**Deprecated as root**:

- `main-menu`: replaced by instance homes; remove from `ROOT_NAVIGATION_STACK` default.

**Removed from primary navigation**:

- `setup-menu` and child setup routes remain callable internally from global home actions but are not top-level menu entries.

## Remove Operation Result

Outcome of project removal orchestrator.

**Fields**:

- `projectRoot`: Absolute path cleaned.
- `removedPaths`: List of deleted managed paths (for logging/display).
- `agentMcpCleaned`: Agent ids whose MCP entries were removed.

**Validation Rules**:

- Requires confirmation unless `--yes` on non-interactive CLI.
- Deletes `.spec-n-roll/` tree and project-local CLI binaries; does not delete user `specs/` or `living-specs/` content unless spec clarifies—all spec-n-roll *managed* files under `.spec-n-roll` and launcher scripts.
