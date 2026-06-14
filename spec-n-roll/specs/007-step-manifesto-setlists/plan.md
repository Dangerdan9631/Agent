# Implementation Plan: Step Manifestos and Set Lists

**Branch**: `007-step-manifesto-setlists` | **Date**: 2026-06-14 | **Spec**: `specs/007-step-manifesto-setlists/spec.md`

**Input**: Feature specification from `specs/007-step-manifesto-setlists/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Introduce deterministic **step lifecycle** boundaries (`step init` / `step finalize`) as the authoritative agent execution surface (MCP + CLI parity), returning manifesto context and hook call instructions before and after step work. Add **Spec Manifesto** authoring via standalone `/spec-n-manifesto` (global + per-step scope, interview-driven like constitution). Replace hard-coded **papercut/quick/full** complexity triage with configurable **set lists** (name, triage description, workflow reference, priority, enabled) seeded as data with no runtime name branches. Extend CLI, MCP, Ink, and generated agent skills for management surfaces; add `author: spec-n-roll` and toolkit `version` metadata to all managed skills.

## Technical Context

**Language/Version**: TypeScript on Node.js 20+ (tsup target node24), existing Vitest test stack.

**Primary Dependencies**: Zod (`src/config/schema.ts`), Commander CLI (`src/cli/index.ts`), MCP SDK (`src/mcp/tools.ts`), Ink (`src/cli/ink/`), existing extension registry (`src/extensions/hooks.ts`), interview primitives (`src/specs/interview.ts` if present or extracted from specify flow).

**Storage**: On-disk under `.spec-n-roll/config/` — `set-lists.json` (new), `manifesto/global.md`, `manifesto/steps/{stepId}.md`; evolve `workflow.config.json` step references; per-spec `workflow-state.json` gains lifecycle fields. Templates copied on init from `src/templates/manifesto-*.md`.

**Testing**: Vitest unit tests for lifecycle ordering, manifesto scope, hook instruction assembly, set-list triage/priority/disabled; contract tests extending `tests/contract/mcp-cli-parity.test.ts`; integration scenarios in `tests/integration/quickstart-scenarios.test.ts` and new lifecycle/set-list fixtures per `quickstart.md`.

**Target Platform**: Windows, macOS, Linux — CLI/MCP/Ink parity preserved.

**Project Type**: TypeScript CLI toolkit — core library modules + thin CLI/MCP adapters + Ink read-models/screens + agent skill generator updates.

**Performance Goals**: Step init/finalize MCP round-trips complete in &lt;200ms on SSD for typical manifesto/hook payloads; set-list triage evaluation O(n) over enabled entries with n &lt; 50.

**Constraints**: MCP is authoritative deterministic agent surface; CLI mirrors core APIs; `/spec-n-manifesto` remains outside workflow lifecycle; no hard-coded branches on `papercut|quick|full` after migration; managed skill metadata refresh must not overwrite user-owned skills; pre-1.0 breaking rename of user-facing "complexity/workflow variant" → "set list" is acceptable with migration guidance.

**Scale/Scope**: New modules `src/manifesto/`, `src/setlists/`, `src/core/step-lifecycle.ts`; refactor `src/specs/triage.ts`, `src/workflow/engine.ts`, `src/workflow/step-manifest.ts`, `src/agents/generators/workflow-skills.ts`; new CLI commands and MCP tools; Ink screens for set lists and manifesto; six user stories (P1–P3).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Documentation Standards | New `src/manifesto/`, `src/setlists/`, `src/core/step-lifecycle.ts` get doc comments + directory READMEs; schema fields documented | PASS |
| II. Clean Code Is Part of Delivery | Replace `WorkflowTierId` union and scattered `'quick'` fallbacks with config-driven set lists; split lifecycle orchestration from CLI/MCP | PASS |
| III. Local Reasoning and Expressive Design | `runStepInit` / `runStepFinalize` as focused orchestrators; hook instruction collection separate from auto-dispatch | PASS |
| IV. Boundary Discipline | Ink/CLI/MCP call `src/core/*` and domain modules only; YAML hook reading behind adapter | PASS |
| V. Pre-1.0 API Design Freedom | Rename complexity → set list; centralize completion through finalize instead of ad-hoc `workflow_state_write` in skills | PASS |
| VI. Test Discipline and Validation | Contracts + quickstart cover SC-001–SC-010; FR-038 test coverage planned | PASS |

No justified violations.

### Post-Design Re-check

Design artifacts (`data-model.md`, `contracts/`, `quickstart.md`) keep lifecycle, manifesto, and set-list concerns in separate modules with shared validation. Constitution gates remain PASS.

## Project Structure

### Documentation (this feature)

```text
specs/007-step-manifesto-setlists/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── step-lifecycle.md
│   ├── set-lists.md
│   ├── manifesto.md
│   └── mcp-cli-parity.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── manifesto/                    # NEW — read/write/validate global + step manifestos
│   ├── index.ts
│   ├── paths.ts
│   ├── validation.ts
│   └── README.md
├── setlists/                     # NEW — schema, CRUD, triage evaluation
│   ├── index.ts
│   ├── schema.ts
│   ├── triage.ts
│   └── README.md
├── core/
│   └── step-lifecycle.ts         # NEW — runStepInit, runStepFinalize, lifecycle state
├── config/
│   └── schema.ts                 # MODIFY — setListSchema, lifecycle fields on workflow state
├── specs/
│   └── triage.ts                 # REPLACE — delegate to set-list triage (remove WorkflowTierId union)
├── extensions/
│   └── hooks.ts                  # EXTEND — collectHookInstructions() for agent-facing payloads
├── workflow/
│   ├── engine.ts                 # MODIFY — lifecycle integration; remove hard-coded tier fallbacks
│   └── step-manifest.ts          # MODIFY — config-only step resolution
├── mcp/
│   └── tools.ts                  # EXTEND — step_init, step_finalize, set_list_* tools
├── cli/
│   ├── index.ts                  # MODIFY — register new command groups
│   └── commands/
│       ├── step-init.ts          # NEW
│       ├── step-finalize.ts      # NEW
│       └── set-list.ts           # NEW — list/show/create/update/enable/disable/remove/validate
├── agents/generators/
│   └── workflow-skills.ts        # MODIFY — metadata, init/finalize instructions, manifesto skill
└── cli/ink/
    ├── read-models/
    │   ├── set-lists.ts          # NEW
    │   └── manifesto.ts          # NEW
    └── screens/
        ├── set-lists/            # NEW — list, detail, edit
        └── manifesto/            # NEW — view, edit (optional v1: view-only + CLI for edit)

src/templates/
├── manifesto-global.md           # NEW — init template
└── manifesto-step.md             # NEW — init template

tests/
├── contract/
│   ├── mcp-cli-parity.test.ts    # EXTEND
│   ├── step-lifecycle.test.ts    # NEW
│   └── set-lists.test.ts         # NEW
└── integration/
    ├── step-lifecycle.test.ts    # NEW
    └── set-lists-triage.test.ts  # NEW

.spec-n-roll/config/              # Runtime (per project)
├── set-lists.json
├── manifesto/
│   ├── global.md
│   └── steps/{stepId}.md
└── workflow.config.json          # EVOLVE — workflows referenced by set lists
```

**Structure Decision**: Domain logic in `src/manifesto/` and `src/setlists/`; lifecycle orchestration in `src/core/step-lifecycle.ts` following existing MCP/CLI parity pattern (`src/core/workflow-state.ts` → thin adapters). Ink uses read-models + screens consistent with `project-metadata-edit.tsx`. Agent skills generated from `workflow-skills.ts` with new `spec-n-manifesto` skill.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | — | — |
