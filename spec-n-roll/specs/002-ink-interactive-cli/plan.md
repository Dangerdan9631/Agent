# Implementation Plan: Interactive Ink CLI Application

**Branch**: `002-ink-interactive-cli` | **Date**: 2026-06-13 | **Spec**: `specs/002-ink-interactive-cli/spec.md`

**Input**: Feature specification from `specs/002-ink-interactive-cli/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Deliver a keyboard-first Ink terminal application as the default entry point when developers run bare `spec-n-roll` (no subcommand). The application navigates task specs, workflows, agents, project metadata, and setup/maintenance operations while routing every mutation through the existing `src/core/` library and `src/cli/commands/*` orchestration functions — achieving 100% parity with documented non-interactive CLI subcommands without duplicating business logic. Existing Ink prompts for init, update, and agent selection are composed into the new shell rather than reimplemented.

## Technical Context

**Language/Version**: TypeScript on Node.js LTS (Node 20+ baseline; same as base toolkit)

**Primary Dependencies**: Ink 5 + React 18 for terminal UI; existing Commander routing for non-interactive subcommands; shared `src/core/` mutations; existing `src/cli/commands/*` `run*` orchestrators; `ink-testing-library` (dev) for interactive flow tests; Zod-validated config readers already in the codebase

**Storage**: Read models assembled from on-disk project artifacts — no new persistence layer:

- `specs/{id}-{slug}/` (lifecycle frontmatter, workflow state, step artifacts)
- `.spec-n-roll/config/workflow.config.json`, `project-metadata.json`
- Bundled agent manifests under toolkit install path

**Testing**: Vitest + `ink-testing-library` for screen navigation and keyboard flows; integration tests comparing on-disk outcomes to non-interactive CLI for each supported mutation (SC-003); fixture projects with multiple task specs and configured agents

**Target Platform**: Windows, macOS, and Linux terminals with ANSI support (same as base toolkit)

**Project Type**: Interactive presentation layer on top of the existing TypeScript CLI/toolkit package

**Performance Goals**: Task spec list and detail views render within interactive latency for projects with up to 20 specs (SC-001: locate any spec within 30 seconds); read-model assembly should complete in under 500ms p95 for typical projects

**Constraints**: Bare `spec-n-roll` → Ink app (FR-001); `spec-n-roll <subcommand>` → non-interactive sync exit unchanged (FR-002); zero new mutation semantics — core library and CLI orchestrators remain source of truth (FR-009); agent slash commands out of scope (FR-016); destructive operations require explicit confirmation (FR-012); read-only screens must not write files (FR-013, SC-006); reuse existing Ink prompts where they exist (FR-010); unrecognized `specs/` directories surfaced with warnings (edge case)

**Scale/Scope**: One interactive shell with five top-level sections (specs, workflows, agents, project, setup/maintenance); 15 CLI operation mappings (see `contracts/cli-operation-map.md`); ~15–20 screens including list/detail/form flows; no new MCP tools; no extension manifest editor beyond existing `config agent add/remove`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution at `.specify/memory/constitution.md` still contains unresolved template placeholders, so there are no ratified project-specific gates to enforce yet.

Interim gates derived from the feature spec and base toolkit plan (`specs/001-spec-n-roll-toolkit/plan.md`):

- **Interactive CLI as default entry**: PASS. Bare invocation opens Ink; subcommands remain non-interactive.
- **Core-library mutation boundary**: PASS. Interactive flows call existing `run*` orchestrators and `src/core/` operations — no duplicated writers.
- **CLI/MCP parity preserved**: PASS. Feature adds presentation only; `contracts/cli-commands.md` and `contracts/mcp-tools.md` remain authoritative for mutation semantics.
- **TDD discipline**: PASS. Plan specifies ink-testing-library navigation tests and byte-equivalence integration tests per mutation.
- **Reuse over rewrite**: PASS. Existing init/update/agent Ink prompts and per-command files under `src/cli/commands/` are composed, not forked.
- **Safe confirmations**: PASS. Update, agent removal, and workflow overwrites route through existing confirmation patterns.

Risk: placeholder constitution should be ratified before implementation merges to enforce governance gates on future features.

## Project Structure

### Documentation (this feature)

```text
specs/002-ink-interactive-cli/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── interactive-app.md
│   └── cli-operation-map.md
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── cli/
│   ├── index.ts                    # detect bare invocation → launch interactive app
│   ├── commands/                   # unchanged non-interactive registrars + run* orchestrators
│   ├── ink/
│   │   ├── app/                    # shell: session provider, router, layout, keybindings
│   │   │   ├── App.tsx
│   │   │   ├── navigation.ts       # route ids, stack helpers
│   │   │   └── session-context.tsx
│   │   ├── components/             # shared list, detail, confirm, status bar, breadcrumbs
│   │   ├── screens/                # one module per top-level section + detail flows
│   │   │   ├── main-menu.tsx
│   │   │   ├── specs/
│   │   │   ├── workflows/
│   │   │   ├── agents/
│   │   │   ├── project/
│   │   │   └── setup/
│   │   ├── read-models/            # assemble TaskSpecSummary, AgentSummary, etc.
│   │   ├── init-prompts.tsx        # existing — reused
│   │   ├── update-prompts.tsx        # existing — reused
│   │   ├── add-agent-prompt.tsx      # existing — reused
│   │   └── partial-recovery-prompt.tsx
│   └── interactive/
│       └── launch.ts               # render entry + project root resolution
├── core/                           # unchanged — shared mutations
└── workflow/                       # reuse listTaskSpecIdentities, artifact readers

tests/
├── integration/
│   └── interactive-cli-parity.test.ts   # mutation byte-equivalence vs CLI
└── unit/
    └── interactive/
        ├── navigation.test.ts
        ├── read-models.test.ts
        └── screens/                     # ink-testing-library flows
```

**Structure Decision**: Extend the existing single-package layout under `src/cli/ink/` with three new subdirectories — `app/` (shell and routing), `screens/` (feature UI), and `read-models/` (query assembly). A thin `src/cli/interactive/launch.ts` isolates bare-invocation detection from Commander setup. Non-interactive command files remain one file per command/subcommand with local `register*Command` functions. Interactive screens never import Commander; they call `runInit`, `runUpdate`, `runConfigAgentAdd`, and core read/write functions directly.

## Complexity Tracking

> No constitution violations requiring justification. The interactive layer adds UI modules but does not introduce new persistence, agents, or mutation paths.

| Concern | Mitigation |
|---------|------------|
| Screen proliferation | Shared `components/` for lists, forms, confirmations; route table in `navigation.ts` |
| Duplicated CLI logic | `contracts/cli-operation-map.md` binds each screen action to one orchestrator |
| Test flakiness | Deterministic fixtures; mock filesystem via temp dirs; ink-testing-library for keyboard flows |

## Phase 0 Output

See `specs/002-ink-interactive-cli/research.md`.

## Phase 1 Outputs

See:

- `specs/002-ink-interactive-cli/data-model.md`
- `specs/002-ink-interactive-cli/contracts/`
- `specs/002-ink-interactive-cli/quickstart.md`

## Post-Design Constitution Check

No ratified constitution gates are available yet. The design satisfies interim gates:

- Interactive entry replaces bare Commander parse without affecting subcommand routing.
- Read models are queries; mutations delegate to existing orchestrators and `src/core/`.
- Navigation, keyboard bindings, and CLI operation parity are documented in `contracts/`.
- Quickstart scenarios validate browse, mutate, and setup flows against non-interactive CLI outcomes.
