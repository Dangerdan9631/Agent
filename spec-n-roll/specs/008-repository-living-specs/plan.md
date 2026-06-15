# Implementation Plan: Repository Living Specs

**Branch**: `008-repository-living-specs` | **Date**: 2026-06-14 | **Spec**: `specs/008-repository-living-specs/spec.md`

**Input**: Feature specification from `specs/008-repository-living-specs/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add repository onboarding and repository drift workflow types for already-initialized Spec-n-Roll projects. Each workflow performs bounded repository discovery, maps code/tests/docs/living specs into evidence, injects that evidence into the normal specify interview, produces exactly one forward specify-stage output, and writes a durable run report without mutating `living-specs/` or tests during specify.

## Technical Context

**Language/Version**: TypeScript on Node.js 22+ (`package.json` engine), ESM modules, existing tsup/Vitest/Cucumber stack.

**Primary Dependencies**: Commander CLI (`src/cli/index.ts`), MCP SDK (`src/mcp/tools.ts`), Ink (`src/cli/ink/`), Zod schemas (`src/config/schema.ts`), YAML workflow/extension loading, existing specify/clarify interview primitives (`src/specs/specify.ts`, `src/specs/interview.ts`), living-spec utilities (`src/living-specs/`), workflow extension registry (`src/extensions/hooks.ts`).

**Storage**: On-disk project artifacts. Workflow config and scaffolding remain under `.spec-n-roll/config/`; feature outputs remain under `specs/{id}-{slug}/`; living specs remain under `living-specs/` and are not written by these workflows during specify. Completed repository runs write reports under the produced task spec directory, with discovery/evidence captured in specify-stage output and report artifacts.

**Testing**: Vitest unit tests for discovery planning, evidence classification, drift categorization, specify injection serialization, and init-required guards; contract tests for CLI/MCP workflow-type parity; integration fixtures covering onboarding, drift, no-tests, conflicting evidence, large bounded scope, and no mutation of `living-specs/` / tests during specify; Cucumber validation stays downstream of implementation.

**Target Platform**: Windows, macOS, Linux with existing filesystem and command execution portability rules.

**Project Type**: TypeScript CLI/MCP toolkit with core library modules, generated agent skills, Ink read-models/screens, and behavior-driven living-spec support.

**Performance Goals**: Recommended discovery plan generation completes in <200ms for repository metadata-only inspection; bounded discovery of configured scope completes within maintainer-selected limits; drift comparison is O(n) over in-scope living-spec scenarios and evidence records.

**Constraints**: Requires prior `spec-n-roll init`; workflow ends after specify; no direct writes to living specs or tests during specify; conflicts have no default authority; unresolved ambiguity is recorded rather than blocking output; repository onboarding and drift are separate workflow types for scoped runs; standard specify headings, quality checklist, clarify compatibility, and downstream plan/tasks/implement contract must remain intact.

**Scale/Scope**: New repository workflow domain in `src/repository/`; specify injection support in `src/specs/`; workflow-type metadata in config/extensions; CLI/MCP commands for starting onboarding/drift and reading reports; Ink read-models/screens for repository workflow status; generated agent skill guidance for repository onboarding and drift.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Documentation Standards | New `src/repository/` and touched `src/specs/`, CLI, MCP, Ink types/functions get multiline doc comments; new `src/` directory gets README | PASS |
| II. Clean Code Is Part of Delivery | Discovery, evidence mapping, specify injection, and reporting are separated instead of overloading `runSpecify` | PASS |
| III. Local Reasoning and Expressive Design | Workflow type selection, discovery plans, evidence records, and reports are named concepts with small focused APIs | PASS |
| IV. Boundary Discipline | CLI/MCP/Ink call core repository workflow services; filesystem scans and command probes stay behind repository adapters | PASS |
| V. Pre-1.0 API Design Freedom | Adds intended workflow-type API without compatibility aliases for earlier ad-hoc onboarding ideas | PASS |
| VI. Test Discipline and Validation | Contract and integration tests planned for specify-only boundaries, evidence mapping, drift categories, and no-mutation guarantees | PASS |

No justified violations.

### Post-Design Re-check

Design artifacts (`research.md`, `data-model.md`, `contracts/`, `quickstart.md`) keep repository discovery, specify-stage injection, and reporting as separate responsibilities. Constitution gates remain PASS.

## Project Structure

### Documentation (this feature)

```text
specs/008-repository-living-specs/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── repository-workflows.md
│   ├── specify-injection.md
│   ├── evidence-report.md
│   └── mcp-cli-parity.md
└── tasks.md             # Phase 2 (/speckit-tasks - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── repository/                    # NEW - repository discovery, evidence, drift, reports
│   ├── README.md
│   ├── discovery-plan.ts
│   ├── evidence.ts
│   ├── drift.ts
│   ├── report.ts
│   └── workflow-run.ts
├── specs/
│   ├── specify.ts                 # MODIFY - accepts workflow-provided specify injection
│   ├── interview.ts               # MODIFY - includes injected ambiguity/evidence topics
│   └── quality.ts                 # MODIFY - validates preserved headings with injection content
├── workflow/
│   ├── engine.ts                  # MODIFY - routes repository onboarding/drift workflow types
│   └── artifacts.ts               # MODIFY - repository run artifact path helpers
├── config/
│   └── schema.ts                  # MODIFY - workflow type and specify injection schemas
├── extensions/
│   └── hooks.ts                   # EXTEND - reusable specify-stage injection assembly
├── mcp/
│   └── tools.ts                   # EXTEND - repository workflow tools
├── cli/
│   ├── index.ts                   # MODIFY - register repository workflow commands
│   └── commands/
│       └── repository-workflow.ts  # NEW - onboarding/drift command group
├── agents/generators/
│   └── workflow-skills.ts         # MODIFY - generated repository workflow skill guidance
└── cli/ink/
    ├── read-models/
    │   └── repository-workflows.ts # NEW - report and status read-models
    └── screens/
        └── repository-workflows/   # NEW - run/report views

tests/
├── contract/
│   ├── repository-workflows.test.ts # NEW
│   └── mcp-cli-parity.test.ts       # EXTEND
├── integration/
│   ├── repository-onboarding.test.ts # NEW
│   └── repository-drift.test.ts      # NEW
└── unit/
    ├── repository-discovery.test.ts  # NEW
    ├── repository-evidence.test.ts   # NEW
    └── specify-injection.test.ts     # NEW
```

**Structure Decision**: Core repository workflow behavior belongs in `src/repository/` so code scanning, evidence normalization, drift categorization, and reporting can be tested without CLI/MCP/Ink concerns. `src/specs/` remains the only layer that creates specify-stage output; repository workflows inject context into it instead of creating a parallel spec format.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | - | - |
