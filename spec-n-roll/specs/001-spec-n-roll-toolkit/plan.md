# Implementation Plan: Spec-n-Roll Toolkit

**Branch**: `001-spec-n-roll-toolkit` | **Date**: 2026-06-10 | **Spec**: `specs/001-spec-n-roll-toolkit/spec.md`

**Input**: Feature specification from `specs/001-spec-n-roll-toolkit/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Build `spec-n-roll` as a TypeScript toolkit and interactive Ink CLI that brings a Spec Kit-style specification-driven workflow to multiple AI coding agents. The implementation centers on versioned workflow artifacts, configurable workflow definitions, agent-specific generated commands/skills/rules, living Cucumber Gherkin specifications, and a CLI-managed update/configuration model. Development will follow behavior-first TDD: one observable workflow behavior at a time, using public CLI/workflow interfaces and the red-green-refactor loop rather than bulk test generation.

## Technical Context

**Language/Version**: TypeScript on Node.js LTS (Node 20+ baseline)

**Primary Dependencies**: Ink + React for interactive CLI UI, Commander for command routing, Zod for config/schema validation, yaml for workflow/config parsing, fs-extra for file operations, semver for toolkit/extension compatibility checks, Cucumber/Gherkin packages for living spec parsing/scaffolding where needed

**Storage**: File-system artifacts in project repositories: `specs/`, `living-specs/`, toolkit-owned directories, user-owned config directories, versioned project metadata, workflow state files, extension manifests, and `.bak` overwrite backups

**Testing**: Vitest for TypeScript unit/integration tests; Cucumber feature execution/scaffolding tests for living spec behavior; Ink testing utilities for interactive CLI flows; fixture-based integration tests that exercise the public CLI and generated workflow commands

**Target Platform**: Windows, macOS, and Linux developer machines; PowerShell automation on Windows and shell automation on Unix-like systems

**Project Type**: TypeScript CLI/toolkit with generated agent integrations and file-based workflow engine

**Performance Goals**: Initialization and command dispatch should complete within SC-001's 5-minute adoption window; workflow state detection and artifact checks should be interactive-latency operations for normal project sizes; updates should produce a clear summary without hiding long-running file operations

**Constraints**: CLI interactions must be interactive using Ink; specification creation must use a grill-me style one-question-at-a-time interview; tests must verify behavior through public interfaces rather than implementation details; update logic must never modify user-owned files except explicit, confirmed config migrations; one Active implementation task at a time; locked task specs are immutable

**Scale/Scope**: v1 supports multiple configured agents, multiple named workflow variants, task specs under `specs/{numeric-id}-{slug}/`, living specs under `living-specs/`, script variants for PowerShell and shell, and extensibility for custom steps/hooks/triage selectors

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution at `.specify/memory/constitution.md` still contains unresolved template placeholders, so there are no ratified project-specific gates to enforce yet.

Interim gates derived from the feature spec and referenced guidance:

- **Spec-first workflow**: PASS. The plan keeps `spec.md`, `plan.md`, `tasks.md`, living specs, and state files as first-class artifacts.
- **Interactive specification**: PASS. `/spec-n-specify` and `/spec-n-clarify` are planned as one-question-at-a-time interviews with recommended answers, exploring the repository before asking questions that code can answer.
- **TDD discipline**: PASS. Implementation tasks must use vertical red-green-refactor slices and behavior tests through public CLI/workflow interfaces.
- **Interactive CLI**: PASS. CLI management flows are planned around Ink.
- **Safe update boundary**: PASS. Toolkit-owned and user-owned paths are modeled separately, with backup-on-overwrite only for toolkit-owned local modifications.

Risk: before implementation, the placeholder constitution should be replaced with ratified principles so future plans have enforceable governance gates.

## Project Structure

### Documentation (this feature)

```text
specs/001-spec-n-roll-toolkit/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── cli-commands.md
│   ├── workflow-config.schema.json
│   ├── extension-manifest.schema.json
│   ├── workflow-state.schema.json
│   └── project-metadata.schema.json
└── tasks.md
```

### Source Code (repository root)

```text
package.json
tsconfig.json
src/
├── cli/
│   ├── index.ts
│   ├── dispatcher.ts
│   ├── commands/
│   └── ink/
├── workflow/
│   ├── engine.ts
│   ├── triage.ts
│   ├── state.ts
│   └── artifacts.ts
├── specs/
│   ├── interview.ts
│   ├── clarify.ts
│   └── quality.ts
├── living-specs/
│   ├── gherkin.ts
│   ├── tags.ts
│   └── step-stubs.ts
├── agents/
│   ├── registry.ts
│   └── generators/
├── extensions/
│   ├── manifest.ts
│   ├── hooks.ts
│   └── compatibility.ts
├── updates/
│   ├── ownership.ts
│   ├── migration.ts
│   └── backup.ts
├── config/
│   ├── schema.ts
│   └── reader.ts
└── docs/

tests/
├── features/
├── step-definitions/
├── integration/
├── contract/
├── fixtures/
└── unit/

docs/
├── workflow.md
├── cli.md
├── multi-agent.md
├── platform-scripts.md
├── extension-quickstart.md
├── extension-reference.md
├── extension-example.md
└── updates-and-migrations.md
```

**Structure Decision**: Use a single TypeScript package with focused modules for CLI, workflow, living specs, agent generation, extensions, updates, config, and documentation. This keeps the v1 toolkit easy to install and test while preserving clear module boundaries for future package extraction if needed.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Multi-agent generation | The core differentiator is consistent workflow behavior across Cursor, Claude Code, GitHub Copilot, and equivalent agents | A single-agent implementation would fail P1 initialization requirements |
| Extension and workflow registry | Workflows must be configurable, replaceable, and able to share steps across named variants | Hard-coded workflow phases would fail extensibility requirements and force forks |
| Versioned update/migration subsystem | Safe updates, config schema migration, toolkit/user ownership, backups, and compatibility warnings are explicit P2 requirements | Manual update instructions would not satisfy CLI-authoritative update guarantees |
| Living Gherkin specs plus Cucumber scaffolding | Living specs are the source of truth and tests must be generated from public behavior | Plain markdown scenarios would not provide executable behavioral validation |

## Phase 0 Output

See `specs/001-spec-n-roll-toolkit/research.md`.

## Phase 1 Outputs

See:

- `specs/001-spec-n-roll-toolkit/data-model.md`
- `specs/001-spec-n-roll-toolkit/contracts/`
- `specs/001-spec-n-roll-toolkit/quickstart.md`

## Post-Design Constitution Check

No ratified constitution gates are available yet. The design still satisfies the interim gates above:

- Spec-first artifacts remain the primary workflow interface.
- Interactive specification and clarification are modeled as one-question-at-a-time sessions.
- TDD validation is expressed as behavior-first, vertical red-green-refactor cycles.
- Ink is the CLI interaction layer.
- Ownership and update boundaries are explicit in the data model and contracts.
