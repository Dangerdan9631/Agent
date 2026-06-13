# Implementation Plan: Instance-Aware Ink Screens

**Branch**: `005-ink-instance-screens` | **Date**: 2026-06-13 | **Spec**: `specs/005-ink-instance-screens/spec.md`

**Input**: Feature specification from `specs/005-ink-instance-screens/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Replace the single flat main menu with instance-aware home screens: global operators see install source, version freshness, and project lifecycle actions (update, init, remove, re-install); local developers see version comparison, project/task orientation, and navigation hubs for Project, Agents, Workflows, and Manage. Add Project hub and Manage screens, double-press quit confirmation, per-task metadata timestamps, a shared project-remove orchestrator with CLI parity, and a build-time linked-source marker for global update flows—all on the existing Ink 5 route layout from feature 004.

## Technical Context

**Language/Version**: TypeScript on Node.js LTS (Node 20+ baseline).

**Primary Dependencies**: Ink 5 + React 18; existing `src/cli/ink/` app shell, `RouteContentLayout`, `SelectableList`, `ConfirmDialog`; Commander for new `remove` subcommand; `semver` for version comparison; Vitest + `ink-testing-library`.

**Storage**: New per-task file `specs/{id}-{slug}/.spec-n-roll/task-metadata.json`; build artifact `dist/cli/.source-package-root` (dev/link only); existing project metadata and workflow config unchanged except stopping writes of `implementationStartedAt` to project metadata.

**Testing**: Unit tests for version comparison, home content read models, quit confirmation hook, remove orchestrator, task metadata writers; integration tests for global/local home routing, navigation Back rows, and CLI `remove`; fixtures under `tests/fixtures/interactive-multi-spec`.

**Target Platform**: Windows, macOS, and Linux ANSI terminals.

**Project Type**: TypeScript CLI — interactive presentation layer + small core/CLI orchestration extensions.

**Performance Goals**: Home screens render static content immediately; registry/global version checks resolve asynchronously without blocking first paint; quit timer accuracy within 100ms of 3s spec.

**Constraints**: Instance branching at launch only; home/manage content static (not focus-driven); reload after binary update via spawn-and-exit; remove must not delete user `specs/` or `living-specs/`; Back as last menu item on non-home routes; legacy `main-menu` and top-level `setup-menu` removed from primary navigation.

**Scale/Scope**: Four new/changed home routes, two hub screens, one CLI command, one core metadata module, build script change, navigation/route registry update, Back row migration across list routes, quit hook in app shell, task metadata migration in specify/implement paths.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Documentation Standards | New modules, schemas, route components, and any new `src/` subdirs include multiline doc comments and README updates | PASS |
| II. Clean Code Is Part of Delivery | Shared remove/update/version read models; instance homes stay thin; no duplicate removal logic | PASS |
| III. Local Reasoning and Expressive Design | Instance type drives root route; static content components separate from menu builders | PASS |
| IV. Boundary Discipline | Ink screens call existing init/update/remove orchestrators; npm/registry IO isolated in read-model adapter | PASS |
| V. Test Discipline and Validation | Contracts in `contracts/`; quickstart defines unit/integration validation commands | PASS |

No justified violations. Complexity Tracking documents mitigations only.

## Project Structure

### Documentation (this feature)

```text
specs/005-ink-instance-screens/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── interactive-instances.md
│   ├── cli-remove-command.md
│   └── task-metadata.schema.json
└── tasks.md             # Phase 2 output (/speckit-tasks - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── cli/
│   ├── commands/
│   │   ├── remove.ts                    # NEW: runProjectRemove + Commander register
│   │   └── version.ts                   # extend: install source + registry latest helpers
│   ├── ink/
│   │   ├── app/
│   │   │   ├── App.tsx                  # quit confirmation hook; route switch for new ids
│   │   │   ├── navigation.ts            # new route ids, titles, root stack per instance
│   │   │   └── session-context.tsx      # optional: rootRouteId or derive from binaryContext
│   │   ├── hooks/
│   │   │   └── use-quit-confirmation.ts # NEW: double-q + home esc
│   │   ├── read-models/
│   │   │   ├── version-comparison.ts    # NEW: npm / linked / global compare
│   │   │   ├── install-source.ts        # NEW: read build marker
│   │   │   ├── local-home-content.ts    # NEW: blocks for local home
│   │   │   ├── global-home-content.ts   # NEW: blocks for global home
│   │   │   └── project-hub.ts           # NEW: spec summary aggregation
│   │   ├── components/
│   │   │   ├── StaticContentBlock.tsx     # NEW: labeled bold field lines
│   │   │   └── menu/back-menu-item.ts     # NEW: shared Back row builder
│   │   ├── screens/
│   │   │   ├── global-home.tsx          # NEW
│   │   │   ├── local-home.tsx           # NEW
│   │   │   ├── project/project-hub.tsx  # NEW
│   │   │   ├── manage/manage-local.tsx  # NEW
│   │   │   └── project/project-metadata-view.tsx  # rename titles to Project Metadata
│   │   └── reload.ts                    # NEW: spawn interactive restart helper
│   ├── interactive/
│   │   └── launch.ts                    # select root route from binaryContext
│   └── local-binaries.ts                # reuse installProjectBinaries for manage update
├── core/
│   └── task-metadata.ts                 # NEW: read/write per-task metadata
├── specs/
│   └── specify.ts                       # write createdAt on new task
└── core/project-metadata.ts             # claimImplementSlot writes task metadata; stop project impl timestamp

scripts/
└── write-source-package-root.mjs        # NEW: invoked from build

tests/
├── unit/
│   ├── cli/remove.test.ts
│   └── interactive/
│       ├── quit-confirmation.test.ts
│       └── read-models/
│           ├── version-comparison.test.ts
│           ├── local-home-content.test.ts
│           └── project-hub.test.ts
└── integration/
    ├── interactive-global-home.test.ts
    └── interactive-local-home.test.ts
```

**Structure Decision**: Extend the single-package Ink app from feature 004. New read-models feed static content components inside `RouteContentLayout`. Core gains `task-metadata.ts`; CLI gains `remove.ts`. Build pipeline writes linked-source marker. `main-menu.tsx` and primary `setup-menu` navigation are superseded but setup init/update flows remain as orchestrators invoked from global/manage actions.

## Complexity Tracking

| Concern | Mitigation |
|---------|------------|
| Replacing main menu breaks existing integration tests | Update fixtures and tests to expect `local-home`/`global-home`; keep route ids for child screens stable |
| Async version check flicker on home | Show `Checking…` then update; cache result for session |
| Remove scope ambiguity (managed vs user files) | Document explicit path list in `runProjectRemove()`; test that `specs/` remains |
| Task metadata backfill for old projects | Omit display lines when absent; no migration required per spec |
| Reload during Ink session | Unmount Ink, spawn child with same argv, exit parent with child exit code |

## Phase 0 Output

See `specs/005-ink-instance-screens/research.md`.

## Phase 1 Outputs

See:

- `specs/005-ink-instance-screens/data-model.md`
- `specs/005-ink-instance-screens/contracts/interactive-instances.md`
- `specs/005-ink-instance-screens/contracts/cli-remove-command.md`
- `specs/005-ink-instance-screens/contracts/task-metadata.schema.json`
- `specs/005-ink-instance-screens/quickstart.md`

## Post-Design Constitution Check

| Principle | Post-design status |
|-----------|-------------------|
| I. Documentation Standards | New read-models, hooks, screens, `task-metadata.ts`, and `remove.ts` will carry doc comments; ink/screens README updated for hub routes |
| II. Clean Code | Single remove orchestrator; version comparison extracted from screens |
| III. Local Reasoning | Instance → root route → hub → existing child screens is a shallow navigation tree |
| IV. Boundary Discipline | Registry/npm spawn isolated in version-comparison adapter; screens invoke command orchestrators |
| V. Test Discipline | quickstart.md lists unit/integration commands for homes, quit, remove, and task metadata |

All gates pass. Ready for `/speckit-tasks`.
