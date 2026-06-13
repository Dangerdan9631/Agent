# Implementation Plan: Ink Route Layout and App Scaffolding

**Branch**: `004-ink-route-layout` | **Date**: 2026-06-13 | **Spec**: `specs/004-ink-route-layout/spec.md`

**Input**: Feature specification from `specs/004-ink-route-layout/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Restructure the Ink interactive application shell so fixed-height status bar and centered key hint overlay frame a route-owned content slot, then introduce a reusable route content layout that places a selection list sized to option count beneath a flexible content area. Migrate list-based routes to own their full slot interior while preserving read-only focus context, existing navigation, and mutation flows from features 002 and 003.

## Technical Context

**Language/Version**: TypeScript on Node.js LTS (Node 20+ baseline).

**Primary Dependencies**: Ink 5 + React 18; existing modules under `src/cli/ink/` including `App.tsx`, `ContextContent.tsx`, `SelectableList.tsx`, `SelectionRegion.tsx`, `KeyHintOverlay.tsx`, and routed screens; Vitest + `ink-testing-library` for terminal rendering tests.

**Storage**: No new persistence. Layout and context derive from in-memory route/session state and existing read models.

**Testing**: Vitest + `ink-testing-library` for scaffolding sizing, route content layout sizing, centered key hints, focus/read-only safety, and integration browse flows; fixtures under `tests/fixtures/interactive-multi-spec`.

**Target Platform**: Windows, macOS, and Linux terminals with ANSI support.

**Project Type**: TypeScript CLI interactive presentation layer refactor.

**Performance Goals**: Route and focus updates visible within one render cycle; terminal resize preserves navigation state; layout allocation remains pure and inexpensive on each redraw.

**Constraints**: Region order status bar > route content > key hint overlay; status and key hint heights fixed; route owns middle slot; selection list sizes to option count inside route content layout; focus-only changes must not mutate files; CLI parity from feature 002 unchanged; minimum-size message for undersized terminals.

**Scale/Scope**: Shell refactor in `App.tsx`, new route layout module(s), key hint overlay update, migration of six list/menu routes to `RouteContentLayout`, retention of form/detail routes on full-slot pattern, and expanded layout test coverage.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Documentation Standards | New layout types/components and any new `src/` subdirectory include multiline doc comments and README updates | PASS |
| II. Clean Code Is Part of Delivery | Refactor preserves behavior; shell responsibilities narrow; route layouts own their composition | PASS |
| III. Local Reasoning and Expressive Design | Two-stage allocation (scaffolding, then route content) with small focused modules | PASS |
| IV. Boundary Discipline | Ink layout concerns stay in `src/cli/ink/`; no core mutation boundary changes | PASS |
| V. Test Discipline and Validation | Contract tests planned for scaffolding, route layout, key hints, and read-only focus | PASS |

No justified violations. Complexity Tracking remains empty.

## Project Structure

### Documentation (this feature)

```text
specs/004-ink-route-layout/
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
│   │   │   ├── App.tsx                      # scaffolding: fixed chrome + route slot host
│   │   │   ├── navigation.ts                # route titles and optional route hints
│   │   │   └── session-context.tsx
│   │   ├── components/
│   │   │   ├── StatusBar.tsx                # fixed top chrome
│   │   │   ├── KeyHintOverlay.tsx           # fixed bottom chrome, centered hints
│   │   │   ├── RouteContentLayout.tsx       # NEW: content + selection inside route slot
│   │   │   ├── ContextContent.tsx           # content renderer; allocation helpers refactored
│   │   │   ├── SelectableList.tsx
│   │   │   └── SelectionRegion.tsx          # row reporting for route-level selection
│   │   ├── hooks/
│   │   │   └── use-terminal-size.ts
│   │   ├── read-models/
│   │   └── screens/                         # routes own slot via RouteContentLayout or full slot
│   └── interactive/
│       └── launch.ts
└── core/                                    # unchanged

tests/
├── integration/
│   ├── interactive-browse.test.ts
│   └── interactive-read-only.test.ts
└── unit/
    └── interactive/
        ├── layout.test.ts                     # scaffolding fixed chrome tests
        ├── route-content-layout.test.ts       # NEW
        ├── key-hint-overlay.test.ts           # NEW
        └── screens/
            └── keyboard-components.test.ts
```

**Structure Decision**: Extend the existing single-package Ink app. `AppShell` shrinks to scaffolding only. `RouteContentLayout` encapsulates the content-plus-selection pattern for list routes. `ContextContent` becomes the upper-region renderer used inside route layouts rather than a shell sibling. Form/detail routes render directly into the route slot without `RouteContentLayout`.

## Complexity Tracking

> No constitution violations requiring justification.

| Concern | Mitigation |
|---------|------------|
| Shell refactor could break all screens at once | Migrate list routes in one pass behind `RouteContentLayout`; keep form routes on full-slot pattern |
| Fixed key-hint rows when hidden may feel wasteful on small terminals | Include hint rows in minimum-size calculation; document trade-off in layout constants |
| Row reporting could regress if selection moves inside routes | Reuse `SelectionRowProvider` inside `RouteContentLayout`; test option-count resizing |
| Duplication between old and new allocation helpers | Rename/split `allocateFullscreenLayout` into scaffolding and route-content allocators with clear types |

## Phase 0 Output

See `specs/004-ink-route-layout/research.md`.

## Phase 1 Outputs

See:

- `specs/004-ink-route-layout/data-model.md`
- `specs/004-ink-route-layout/contracts/ui-layout.md`
- `specs/004-ink-route-layout/quickstart.md`

## Post-Design Constitution Check

| Principle | Post-design status |
|-----------|-------------------|
| I. Documentation Standards | New `RouteContentLayout` and allocation types will carry doc comments; component README updated |
| II. Clean Code | Shell no longer mixes global context with route selection; routes own composition |
| III. Local Reasoning | Two-level layout model matches spec vocabulary (scaffolding vs route content layout) |
| IV. Boundary Discipline | Presentation-only refactor; mutations remain in existing screen/orchestration paths |
| V. Test Discipline | quickstart.md defines scaffolding, route layout, overlay, and integration validation commands |

All gates pass. Ready for `/speckit-tasks`.
