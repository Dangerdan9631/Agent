# Quickstart: Instance-Aware Ink Screens

## Prerequisites

- Node.js 20 or newer.
- `npm install` and `npm run build` completed in the toolkit repository.
- Features 002–004 interactive scaffolding in place (`RouteContentLayout`, app shell, read models).

## Build Source Marker

After build, verify the linked-source marker exists locally but is not published:

```powershell
npm run build
Test-Path dist/cli/.source-package-root
```

Expected: `True` in dev tree; file contains absolute path to repo root.

## Unit Tests — Instance Home Read Models

```powershell
npm test -- tests/unit/interactive/read-models/version-comparison.test.ts
npm test -- tests/unit/interactive/read-models/local-home-content.test.ts
npm test -- tests/unit/interactive/read-models/project-hub.test.ts
```

Expected:

- Version comparison resolves npm, linked-source, and global-install targets.
- Local home content omits current-task block when task complete or absent.
- Task timestamps read from `task-metadata.json`, not project metadata.
- Project hub aggregates status counts and picks most recent spec.

## Unit Tests — Quit Confirmation

```powershell
npm test -- tests/unit/interactive/quit-confirmation.test.ts
```

Expected:

- First `q` shows confirmation message.
- Second `q` within 3s exits.
- Other key or timeout cancels without exit.
- Home `esc` triggers quit flow; sub-screen `esc` pops route.

## Unit Tests — Remove Orchestrator

```powershell
npm test -- tests/unit/cli/remove.test.ts
```

Expected:

- `runProjectRemove()` deletes managed `.spec-n-roll` paths and launchers.
- Confirmation required without `--yes`.
- `specs/` content preserved.

## Integration — Global Home

Use fixture project without local pin:

```powershell
npm test -- tests/integration/interactive-global-home.test.ts
```

Expected:

- Root route is `global-home` when invoked via global binary context.
- Content shows Install Source, Version (global), Project, Project Status.
- Update disabled when remote and up to date.

## Integration — Local Home

Use `tests/fixtures/interactive-multi-spec` with local pin:

```powershell
npm test -- tests/integration/interactive-local-home.test.ts
```

Expected:

- Root route is `local-home`.
- Content shows version (local), next task id, optional current task block.
- Project → `project-hub`; Manage → `manage-local`.

## Integration — Navigation Back Rows

```powershell
npm test -- tests/integration/interactive-browse.test.ts
```

Expected (extended assertions):

- Non-home list routes expose Back as last option.
- Back returns to prior route without file mutations on read-only paths.

## Non-Interactive Remove

```powershell
npm test -- tests/integration/cli-non-interactive.test.ts
```

Expected: new `remove --yes` scenario removes managed files from initialized fixture.

## Manual Smoke — Local Instance

From an initialized project with local binary:

```powershell
.\tests\fixtures\interactive-multi-spec\.spec-n-roll\cli\bin\spec-n-roll.cmd
```

Verify:

1. Home shows six options; Extensions disabled.
2. Project hub shows spec summary and links to Specs / Project Metadata.
3. Manage shows update disabled when versions match.
4. Press `q` once → confirmation; wait 3s → stays open.
5. Press `q` twice quickly → exits.

## Manual Smoke — Global Instance

From repo root via global/dispatcher entry with `--global` if local exists:

```powershell
node dist/cli/index.js --global
```

Verify global home five options and install source line.

## Contract References

- UI routes and content: `contracts/interactive-instances.md`
- Remove command: `contracts/cli-remove-command.md`
- Task metadata schema: `contracts/task-metadata.schema.json`
- Data entities: `data-model.md`
