# Research: Instance-Aware Ink Screens

## Decision: Branch home screen on existing `VersionInvocationTarget`

**Rationale**: `buildVersionReport()` already distinguishes `local` vs `global` via `SPEC_N_ROLL_LOCAL_PIN`, executed binary path comparison, and `findLocalCli()` tree walk. `launchInteractiveApp()` passes `binaryContext` into session state. Replacing the single `main-menu` route with `global-home` and `local-home` routes selected at startup avoids duplicating detection logic and matches the spec's instance-type entity.

**Alternatives considered**:

- Single main menu with conditional menu items: rejected because global and local menus differ in structure, content blocks, and option counts; a unified menu would hide intent behind large conditional trees.
- Detect instance type inside each screen: rejected because home routing is a session-level concern and would repeat branching across screens.

## Decision: Replace flat main menu with instance-specific home routes plus hub screens

**Rationale**: Spec 005 restructures navigation: local home exposes Project / Agents / Workflows / Extensions / Manage / Quit; global home exposes Update / Init / Remove / Re-install / Quit. The existing `setup-menu` and flat five-item main menu become obsolete for the primary entry path. New routes `global-home`, `local-home`, `project-hub`, and `manage-local` (names TBD in implementation) replace `main-menu` as the navigation root while reusing existing child routes (`agents-list`, `workflows-list`, `specs-list`, `project-metadata-view`).

**Alternatives considered**:

- Keep `main-menu` and add sub-menus: rejected because spec defines distinct home screens, not a shared menu with hidden items.
- Retain setup-menu as a separate route: rejected because global home absorbs init/update/remove/re-install; local Manage screen absorbs binary update and upgrade project.

## Decision: Static content blocks replace focus-driven context on home and manage screens

**Rationale**: Spec requires the content area to always show the same instance metadata regardless of which menu option is focused. This differs from feature 003/004 list routes where focused option drives `SelectedOptionContext`. Home and manage screens should render a dedicated static content component (version lines, project root, task summary) above the selection list, not swap content on focus change.

**Alternatives considered**:

- Reuse focus-driven `ContextContent` with identical context on every item: rejected because it couples menu rows to display data they do not own and obscures the "always visible" requirement.
- Move metadata to status bar: rejected because spec defines explicit content-area layout with labeled fields.

## Decision: Build-time source path marker excluded from npm publish

**Rationale**: Global linked installs need a file adjacent to the running package that records the absolute path to the source `package.json`. Write this during `npm run build` (e.g. `dist/cli/.source-package-root`) and exclude it from the `"files"` publish manifest. At runtime, presence of this file means install source is Local; absence means Remote.

**Alternatives considered**:

- Infer linked source from `npm root -g` heuristics: rejected because npm link layouts vary and are unreliable across platforms.
- Store path in environment variable: rejected because it is not persisted across reload and requires manual setup.

## Decision: Version comparison via small dedicated read-model module

**Rationale**: Three comparison modes share structure (current version, latest label, enabled/disabled rules) but differ in data sources: npm registry (`npm view spec-n-roll version` or HTTPS registry fetch), linked source `package.json`, and global install manifest via `resolveGlobalCliPath()` + `readToolkitVersionFromRoot()`. A `version-comparison.ts` read-model isolates async registry IO and semver comparison (`semver` already a dependency) from Ink components.

**Alternatives considered**:

- Inline fetch logic in each screen: rejected because global home, local home, and manage screen duplicate the same rules.
- Block home render until registry responds: rejected because spec requires immediate render with loading/unavailable state.

## Decision: Process reload via spawn-and-exit pattern

**Rationale**: Update actions on global and local instances must "reload" the CLI after mutation. The existing local launcher already uses `spawnSync(process.execPath, [entry, ...process.argv.slice(2)])`. Reload helper re-spawns the interactive app with preserved cwd and argv, then exits the Ink parent via `useApp().exit()` followed by outer process exit. Matches platform behavior without requiring `exec` on Windows.

**Alternatives considered**:

- In-process state refresh only: rejected because binary/version changes require a new process to pick up updated files.
- `process.execPath` replace via undocumented APIs: rejected for portability.

## Decision: Per-task metadata file at `specs/{id}-{slug}/.spec-n-roll/task-metadata.json`

**Rationale**: Spec moves `createdAt` and `implementationStartedAt` from project metadata to task-scoped storage. Co-locating under each task spec directory keeps task provenance self-contained and distinct from `workflow-state.json` (operational progress) and `spec.md` frontmatter (lifecycle status). Schema: `{ createdAt?: ISO8601, implementationStartedAt?: ISO8601 }`. Writers update on specify (create) and `claimImplementSlot` (implementation start); readers on local home use current task id/slug from project metadata to load the file.

**Alternatives considered**:

- Extend `workflow-state.json`: rejected because workflow state is operational, not provenance; mixing concerns complicates MCP/CLI contracts.
- Keep fields in project metadata with read redirect: rejected because spec explicitly requires task-owned storage and ignoring project-level copies.

## Decision: New `remove` orchestrator shared by CLI and interactive flows

**Rationale**: Remove and re-install require deleting `.spec-n-roll/` managed tree, project-local binaries, agent MCP entries, and extension artifacts—inverse of init/update boundaries. A `runProjectRemove()` in `src/cli/commands/remove.ts` centralizes deletion rules; interactive screens call it after `ConfirmDialog`; non-interactive `spec-n-roll remove` uses `--yes` skip or stdin confirmation.

**Alternatives considered**:

- Duplicate removal logic in Ink screens: rejected because FR-052 requires non-interactive parity and constitution boundary discipline favors one orchestrator.

## Decision: Global update from linked source runs `npm run build` in source root

**Rationale**: When install source is Local and source path file resolves, global update spawns `npm run build` in that directory (same as developer workflow), then reloads. When source path file is missing during update, fall back to `npm install -g spec-n-roll@latest` per spec edge case.

**Alternatives considered**:

- Always registry install: rejected because local linked development path is explicitly specified.

## Decision: Local binary update copies from global install only

**Rationale**: Manage screen "Update Spec N' Roll" calls `installProjectBinaries(projectRoot, globalToolkitRoot)` where `globalToolkitRoot` is derived from the global CLI's package root (`findToolkitPackageRoot` on global entry path). This overwrites launchers and `install.json` without touching `.spec-n-roll/config/*` or specs—matching FR-036 separation from "Upgrade Project" which runs full `runUpdate()`.

**Alternatives considered**:

- Re-run init: rejected because it would rewrite user configuration.

## Decision: Double-press quit as app-shell concern with 3-second timer

**Rationale**: FR-043–047 affect every route. Implement `useQuitConfirmation()` hook in `AppShell` that intercepts `q` before exit, sets pending state, shows overlay message in status or key-hint region, starts 3000ms timeout, and on home also maps `esc` to the same flow while sub-screens keep `esc` → `popRoute()`. Route id `global-home` / `local-home` determines home-screen esc behavior.

**Alternatives considered**:

- Per-screen quit handling: rejected because behavior must be global and consistent.
- Require typing "quit": rejected because spec defines double-`q` with timeout.

## Decision: Project hub content from aggregated task-spec read model

**Rationale**: Project screen needs most recent spec, its status, and counts per lifecycle state. Extend or compose `loadTaskSpecSummaryList()` from `read-models/task-specs.ts` with a `ProjectHubView` that picks the highest numeric id recognized spec and aggregates lifecycle counts. Timestamps for "most recent" use directory mtime or `updatedAt` from workflow state when present.

**Alternatives considered**:

- Duplicate filesystem scan in project screen: rejected because task-spec read model already enumerates specs.

## Decision: Back option as last SelectableList item on all list routes

**Rationale**: FR-041 requires explicit Back on every non-home screen. Prefer a shared `buildBackMenuItem()` helper appended as the last row with key matching list length (or `b` shortcut retained globally). Home screens use Quit instead. Global `b` and `esc` back shortcuts remain for keyboard parity alongside the visible Back row.

**Alternatives considered**:

- Back via keyboard only without menu row: rejected because spec requires Back as a selectable last option.
