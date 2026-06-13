# Implementation Plan: Ink Context Content Area

**Branch**: `003-ink-content-area` | **Date**: 2026-06-13 | **Spec**: `specs/003-ink-content-area/spec.md`

**Input**: Feature specification from `specs/003-ink-content-area/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add a fullscreen shell layout to the existing Ink interactive application so the terminal is divided into a persistent status bar, a dynamically sized context content area, and the active user selection area. The content area presents read-only information about the current route and focused option, updating as list selection changes while preserving all existing navigation and mutation flows from `specs/002-ink-interactive-cli`.

## Technical Context

**Language/Version**: TypeScript on Node.js LTS (Node 20+ baseline).

**Primary Dependencies**: Ink 5 + React 18 for terminal UI; existing interactive app modules under `src/cli/ink/`; existing read models under `src/cli/ink/read-models/`; `ink-testing-library` and Vitest for terminal rendering tests.

**Storage**: No new persistence. Context content is assembled from existing in-memory route/session state and existing on-disk read models for task specs, workflows, agents, project metadata, and setup state.

**Testing**: Vitest + `ink-testing-library` for layout, selection-focus, terminal-height, and read-only navigation tests; existing integration fixtures under `tests/fixtures/interactive-multi-spec`.

**Target Platform**: Windows, macOS, and Linux terminals with ANSI support.

**Project Type**: TypeScript CLI interactive presentation layer.

**Performance Goals**: Selection focus updates should be visible within one render cycle; resizing should preserve navigation state; context derivation should use already loaded screen/read-model data where practical and avoid extra filesystem reads for simple focus movement.

**Constraints**: Must preserve region order status bar > context content > selection area; content area is the only flexible-height region; focus-only changes must not mutate files; existing CLI parity and mutation routing from feature 002 remain unchanged; small terminals must show a clear minimum-size message rather than overlapping controls.

**Scale/Scope**: One shell-level layout enhancement, one reusable context content component/model, updates across the five top-level navigation sections plus representative detail/action screens, and test coverage for small/medium/tall terminal sizes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution at `.specify/memory/constitution.md` still contains unresolved template placeholders, so there are no ratified project-specific gates to enforce yet.

Interim gates from the current repo instructions and feature 002 plan:

- **Interactive CLI behavior preserved**: PASS. The feature changes presentation only; bare invocation still launches the Ink app and subcommands remain non-interactive.
- **Core-library mutation boundary**: PASS. Context focus is read-only and does not introduce new mutation paths.
- **CLI/MCP parity preserved**: PASS. Existing interactive operation mappings continue to own mutations; the content area only describes available context.
- **TDD discipline**: PASS. Plan calls for layout and focus tests before implementation tasks.
- **Reuse over rewrite**: PASS. The plan extends `AppShell`, `StatusBar`, `SelectableList`, screens, and read models rather than creating a second terminal app.
- **Clean code and doc comments**: PASS. Any new top-level types, functions, values, and schema fields must receive multiline doc comments; new `src/` subdirectories require `README.md`.

Risk: placeholder constitution should be ratified before implementation merges to enforce governance gates on future features.

## Project Structure

### Documentation (this feature)

```text
specs/003-ink-content-area/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ui-layout.md
└── tasks.md             # Phase 2 output (/speckit-tasks - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── cli/
│   ├── ink/
│   │   ├── app/
│   │   │   ├── App.tsx                 # fullscreen shell composition and routed screen host
│   │   │   ├── navigation.ts           # route ids and titles used for context labels
│   │   │   └── session-context.tsx     # route state and selected task spec state
│   │   ├── components/
│   │   │   ├── StatusBar.tsx           # persistent top region
│   │   │   ├── SelectableList.tsx      # keyboard focus and selection reporting
│   │   │   └── ContextContent.tsx      # new flexible middle region
│   │   ├── read-models/                # existing read-only summaries for context content
│   │   └── screens/                    # existing screens provide selected-option context
│   └── interactive/
│       └── launch.ts
└── core/                               # unchanged mutation boundary

tests/
├── integration/
│   ├── interactive-browse.test.ts      # read-only context behavior and no mutations
│   └── interactive-read-only.test.ts
└── unit/
    └── interactive/
        ├── layout.test.ts              # new fullscreen sizing contract tests
        └── screens/
            └── keyboard-components.test.ts
```

**Structure Decision**: Extend the current single-package interactive app. `AppShell` owns the fixed region order and minimum-size behavior; screens continue to own route-specific data loading and selection controls; `SelectableList` gains a focus-change contract so focused rows can update a shell-level context model without triggering selection actions.

## Complexity Tracking

> No constitution violations requiring justification. The feature adds a shared presentation component and a small context model but does not introduce persistence, new mutation paths, or a separate application shell.

| Concern | Mitigation |
|---------|------------|
| Screen-specific context could spread ad hoc formatting across many screens | Define a compact `SelectedOptionContext` shape and reusable `ContextContent` renderer |
| Fullscreen sizing can make tests brittle | Test stable text order and minimum/flexible-height behavior with controlled terminal rows rather than exact decorative frames |
| Selection focus callbacks could accidentally trigger mutations | Keep focus reporting separate from `onSelect` and cover focus-only navigation with file snapshot tests |

## Phase 0 Output

See `specs/003-ink-content-area/research.md`.

## Phase 1 Outputs

See:

- `specs/003-ink-content-area/data-model.md`
- `specs/003-ink-content-area/contracts/ui-layout.md`
- `specs/003-ink-content-area/quickstart.md`

## Post-Design Constitution Check

No ratified constitution gates are available yet. The design satisfies interim gates:

- The existing interactive entry and non-interactive command routing remain unchanged.
- Focus context is query-only and cannot write project files by design.
- Context contracts reuse existing route/read-model terminology from the interactive CLI.
- Tests are planned for layout, focus updates, resize preservation, and read-only mutation safety.
- The design keeps framework-specific rendering in `src/cli/ink/` and does not leak Ink concerns into `src/core/`.
