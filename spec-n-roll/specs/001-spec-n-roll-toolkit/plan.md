# Implementation Plan: Spec-n-Roll Toolkit

**Branch**: `001-spec-n-roll-toolkit` | **Date**: 2026-06-10 (revised — agent MCP config on init/add-agent/update) | **Spec**: `specs/001-spec-n-roll-toolkit/spec.md`

**Input**: Feature specification from `specs/001-spec-n-roll-toolkit/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Build `spec-n-roll` as a TypeScript toolkit with a three-binary CLI architecture (global dispatcher, project-local full CLI, project-local MCP server) over a shared core library that owns all deterministic mutations. Agent workflow commands bring a Spec Kit-style specification-driven workflow to multiple AI coding agents via extensions. `init`, `config add-agent`, and `update` each run agent-extension generators that create or idempotently update project-local native MCP configuration files (per extension manifest targets) so every configured agent references `.spec-n-roll/cli/bin/spec-n-roll-mcp` without manual setup. The implementation centers on versioned workflow artifacts, three default workflow tiers (papercut/quick/full) with triage embedded in the `specify` step, on-demand clarify/analyze steps, living Cucumber Gherkin specifications at `living-specs/{domain}.feature` (agent-managed, outside MCP/CLI), task spec lifecycle in `spec.md` frontmatter (MCP/CLI-only), step output template instantiation via MCP/CLI before agent prose edits, split-root file ownership (`.spec-n-roll/` + `.agents/`), in-process Node extension handlers with open `stepId` registration and dynamic `before_{stepId}`/`after_{stepId}` hook events, and a CLI-managed update/configuration model. Every MCP tool has a matching non-interactive CLI subcommand invoking the same core-library operation (SC-012). Development will follow behavior-first TDD: one observable workflow behavior at a time, using public CLI/MCP/workflow interfaces and the red-green-refactor loop rather than bulk test generation.

## Technical Context

**Language/Version**: TypeScript on Node.js LTS (Node 20+ baseline)

**Primary Dependencies**: Ink + React for interactive CLI UI, Commander for command routing, `@modelcontextprotocol/sdk` for MCP server (stdio transport), Zod for config/schema validation, yaml for workflow/config parsing, fs-extra for file operations, semver for toolkit/extension compatibility checks, Cucumber/Gherkin packages for living spec parsing/scaffolding where needed

**Storage**: File-system artifacts in project repositories:

- **Toolkit-owned**: `.spec-n-roll/` (CLI at `cli/bin/`, scripts, `AGENTS.md`, `compatibility.json`, `bundled-extensions/`) and `.agents/` (generated skills)
- **User-owned**: `.spec-n-roll/config/` (`workflow.config.json`, `project-metadata.json`, `extensions/`), `specs/{id}-{slug}/` (including `workflow-state.json`), `living-specs/`
- **Backups**: `.bak` siblings for locally modified toolkit-owned files on update

**Testing**: Vitest for TypeScript unit/integration tests; Cucumber feature execution/scaffolding tests for living spec behavior; Ink testing utilities for interactive CLI flows; fixture-based integration tests that exercise the public CLI, MCP tools, and generated workflow commands; contract tests asserting MCP/CLI parity for core-library mutations

**Target Platform**: Windows, macOS, and Linux developer machines; PowerShell automation on Windows and shell automation on Unix-like systems

**Project Type**: TypeScript CLI/toolkit with generated agent integrations and file-based workflow engine

**Performance Goals**: Initialization and command dispatch should complete within SC-001's 5-minute adoption window; workflow state detection and artifact checks should be interactive-latency operations for normal project sizes; updates should produce a clear summary without hiding long-running file operations

**Constraints**: Bare `spec-n-roll` spawns interactive Ink; `spec-n-roll <subcommand> [args]` is non-interactive and exits synchronously; the global npm artifact is a lightweight dispatcher only — it exec's the resolved full CLI binary and MUST NOT load full CLI/core/MCP code when dispatching local; MCP always targets `.spec-n-roll/cli/bin/spec-n-roll-mcp`; machine-readable state (`workflow-state.json`, `spec.md` frontmatter, `project-metadata.json`, `tasks.md` checkboxes) is written only by the core library via MCP tools or parallel CLI subcommands; step output files are instantiated from templates via MCP/CLI before agent prose edits; living specs remain agent-direct; specification creation must use a grill-me style one-question-at-a-time interview; tests must verify behavior through public interfaces rather than implementation details; update logic must never modify user-owned files except explicit, confirmed config migrations; one Active implementation task at a time; locked task specs are immutable

**Scale/Scope**: v1 supports agent extensions only (cursor, claude-code, copilot, codex bundled OOTB at `.spec-n-roll/bundled-extensions/`), each declaring MCP config target path(s) and merge rules in its manifest; `init`/`config add-agent`/`update` generate or refresh project-local agent MCP config entries, default papercut/quick/full tiers (shared `specify` ref + tail) with triage embedded in specify, on-demand clarify/analyze, numeric `taskSpecId` + required `slug` in JSON with `@spec-n-roll-{id}` Gherkin tags, `nextTaskSpecId` counter, lifecycle in `spec.md` frontmatter (MCP/CLI-only writes), tier-skipped artifacts omitted, built-in step output manifest for partial detection, step output templates with MCP/CLI instantiate commands, interactive multi-spec task selection prompts, shared core library with MCP/CLI parity (SC-012), three-binary CLI (dispatcher + full CLI + MCP), in-process extension handlers with open `stepId` and pattern-validated hook events (warn/skip unknown step IDs at load), no CLI update hooks, paired `.sh`/`.ps1` platform scripts with runtime auto-selection (no config field or CLI command)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution at `.specify/memory/constitution.md` still contains unresolved template placeholders, so there are no ratified project-specific gates to enforce yet.

Interim gates derived from the feature spec and referenced guidance:

- **Spec-first workflow**: PASS. The plan keeps `spec.md`, `plan.md`, `tasks.md`, living specs, and state files as first-class artifacts.
- **Interactive specification**: PASS. `/spec-n-specify` and `/spec-n-clarify` are planned as one-question-at-a-time interviews with recommended answers, exploring the repository before asking questions that code can answer.
- **TDD discipline**: PASS. Implementation tasks must use vertical red-green-refactor slices and behavior tests through public CLI/workflow interfaces.
- **Interactive CLI**: PASS. CLI management flows are planned around Ink.
- **Safe update boundary**: PASS. Toolkit-owned and user-owned paths are modeled separately, with backup-on-overwrite only for toolkit-owned local modifications.
- **Deterministic state boundary**: PASS. Machine-readable mutations are centralized in the core library and exposed via MCP tools with matching CLI subcommands; living specs and prose bodies remain agent-editable after template instantiation.

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
│   ├── mcp-tools.md
│   ├── agent-mcp-config.md
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
│   ├── dispatcher.ts          # global npm entry — resolution + exec only
│   ├── index.ts               # full CLI entry (subcommands + Ink)
│   ├── commands/
│   └── ink/
├── mcp/
│   └── server.ts              # stdio MCP server entry
├── core/                      # shared deterministic mutations (CLI + MCP)
│   ├── workflow-state.ts
│   ├── task-lifecycle.ts
│   ├── project-metadata.ts
│   ├── task-checkboxes.ts
│   ├── templates.ts
│   └── frontmatter.ts
├── templates/                 # toolkit-owned step output templates
│   ├── spec.md
│   ├── plan.md
│   └── tasks.md
├── workflow/
│   ├── engine.ts
│   ├── state.ts
│   ├── artifacts.ts
│   └── step-manifest.ts
├── specs/
│   ├── specify.ts
│   ├── triage.ts
│   ├── interview.ts
│   ├── clarify.ts
│   └── quality.ts
├── living-specs/
│   ├── gherkin.ts
│   ├── tags.ts
│   └── step-stubs.ts
├── agents/
│   ├── extension-loader.ts
│   ├── mcp-config.ts          # merge/upsert Spec-N-Roll MCP entry per agent targets
│   └── generators/
├── extensions/
│   ├── manifest.ts
│   ├── hooks.ts
│   └── compatibility.ts
├── updates/
│   ├── ownership.ts
│   ├── migration.ts
│   └── backup.ts
└── config/
    ├── schema.ts
    └── reader.ts

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

**Structure Decision**: Use a single TypeScript package with focused modules for dispatcher, full CLI, MCP server, shared core library, workflow, living specs, agent extension generation, extensions, updates, config, and templates. Toolkit-authored documentation lives in the repository root `docs/` directory only — it is not part of `src/` and is not installed into user projects by `init` or `update`. The dispatcher, full CLI, and MCP server are separate build outputs; core library logic is never duplicated across interfaces. This keeps the v1 toolkit easy to install and test while preserving clear module boundaries for future package extraction if needed.

### Installed Project Layout

```text
project-root/
├── .spec-n-roll/                    # toolkit-owned (except config/)
│   ├── cli/bin/
│   │   ├── Spec-N-Roll              # full CLI binary (+ .cmd on Windows)
│   │   └── spec-n-roll-mcp          # MCP server binary (+ .cmd on Windows)
│   ├── scripts/                     # .sh and .ps1 automation
│   ├── AGENTS.md                    # canonical agent rules
│   ├── compatibility.json           # extension compatibility matrix
│   └── bundled-extensions/          # OOTB agent + toolkit extensions
│       ├── cursor/
│       ├── claude-code/
│       ├── copilot/
│       └── codex/
├── .spec-n-roll/config/             # user-owned
│   ├── workflow.config.json
│   ├── project-metadata.json
│   └── extensions/{id}/manifest.json
├── .agents/                         # toolkit-owned generated skills
│   └── skills/
├── specs/{numeric-id}-{slug}/       # user-owned task specs
│   ├── spec.md                      # YAML frontmatter: status Active|Complete|Locked
│   ├── plan.md                      # tier-applicable only (full)
│   ├── tasks.md                     # tier-applicable only (quick, full)
│   └── workflow-state.json          # taskSpecId + slug + operational status
└── living-specs/                    # user-owned Gherkin features
    └── {kebab-case-domain}.feature
```

Per-agent native pointer files (e.g., root `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/`) reference `.spec-n-roll/AGENTS.md` — they are generated and toolkit-owned. Per-agent project-local MCP configuration files (e.g., `.cursor/mcp.json`) are created or idempotently updated by agent extension generators on `init`, `config add-agent`, and refreshed on `update` — see `contracts/agent-mcp-config.md`.

Toolkit-authored documentation (`docs/` at the toolkit repository root) is **not** part of the installed project layout. Developers read it from the Spec-N-Roll repository or npm package source; `init` and `update` do not copy it into user projects.

### Default Workflow Tiers

`specify` is always step 1 of every tier variant. Triage is embedded at the start of `specify` (before the interview) and selects the tier; `workflowVariantId` is persisted before the interview proceeds.

| Tier | Config steps (shared refs) | Triage heuristic (built-in) |
|------|---------------------------|----------------------------|
| `papercut` | specify → implement | Single-file fix, copy change, trivial bug |
| `quick` | specify → tasks → implement | New behavior without architecture change |
| `full` | specify → plan → tasks → implement | Cross-cutting, new subsystem, multi-actor |

`defaultWorkflowId` pre-selects a tier in the manual/override picker only (ambiguous descriptions). Tier-skipped artifacts are omitted.

`/spec-n-clarify` and `/spec-n-analyze` are on-demand between tier steps — not in default tiers; `/spec-n-roll` skips them unless explicitly invoked.

### CLI Architecture

| Binary | Install location | Role |
|--------|------------------|------|
| **Dispatcher** | Global npm package | Walk `cwd`→parents for `.spec-n-roll/cli/bin/spec-n-roll`; exec resolved full CLI as child process; never loads full CLI/core/MCP in-process when dispatching local; forwards `-v`/`--version` unchanged |
| **Full CLI** | `.spec-n-roll/cli/bin/spec-n-roll` (local) or co-bundled with dispatcher (global fallback / `--global`) | Argument parsing, subcommands, Ink UI, update/config; bare `spec-n-roll` → interactive Ink; `spec-n-roll <subcommand>` → non-interactive sync exit |
| **MCP server** | `.spec-n-roll/cli/bin/spec-n-roll-mcp` only (never global) | stdio MCP transport; thin interface over shared core library; referenced from each configured agent's project-local MCP config file(s) via `init` / `config add-agent`; paths refreshed on `update` |

Version report (`-v`/`--version`): full CLI prints dispatcher version, executed binary version, `local`/`global` target, and absolute local binary path when applicable. Direct full CLI invocation (no dispatcher) reports binary version and indicates direct invocation.

### Core Library Mutations (MCP + CLI parity)

All deterministic writes go through `src/core/` — never duplicated in CLI or MCP layers:

- `workflow-state.json` transitions
- `spec.md` YAML frontmatter (`status` lifecycle)
- `project-metadata.json` updates (`nextTaskSpecId`, current implementation task)
- `tasks.md` completion checkbox toggles
- Step output template instantiation (copy template → task spec directory)
- Frontmatter field updates after instantiation

Living spec `.feature` files under `living-specs/` are **outside** this boundary — agent-managed only.

### Agent MCP Config Setup

| Command | MCP config action |
|---------|-------------------|
| `init` | For each selected agent extension: create or merge project-local MCP config file(s) with Spec-N-Roll server entry → `.spec-n-roll/cli/bin/spec-n-roll-mcp` (stdio) |
| `config add-agent` | Same for the newly added agent only; existing agents unchanged |
| `update` | Refresh Spec-N-Roll MCP binary path/wrapper in all configured agents' MCP config files |

Each bundled agent extension manifest declares `agentSetup.mcpConfig.targets[]` (project-relative paths + format) and `agentSetup.mcpConfig.serverId` (stable merge key). Merge is idempotent: upsert Spec-N-Roll entry only; preserve unrelated MCP servers.

### Entry Points

- **New spec**: `/spec-n-specify <description>` → specify (embedded triage → interview) (primary); instantiate `spec.md` via MCP/CLI before prose edits
- **Continue/advance**: `/spec-n-roll` with intent detection (description → new spec; task-selection prompt when multiple Active specs; "new or continue?" when ambiguous)
- **Developer CLI**: `spec-n-roll` (Ink) or `spec-n-roll <subcommand>` (non-interactive) via dispatcher → full CLI
- **Agent mutations**: MCP tools on `.spec-n-roll/cli/bin/spec-n-roll-mcp` (parallel CLI subcommands for developers)

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Extension-only multi-agent model | Agents are delivered as extensions (cursor, claude-code, copilot, codex) with `.agents/` skills and canonical `.spec-n-roll/AGENTS.md` rules | Hard-coded agent registry would block the extension-first model and OOTB extensibility |
| Extension and workflow registry | Workflows must be configurable, replaceable, and able to share steps across named variants; step IDs and hook events must not be closed enums | Hard-coded workflow step lists would fail extensibility requirements and force forks |
| Versioned update/migration subsystem | Safe updates, config schema migration, toolkit/user ownership, backups, and compatibility warnings are explicit P2 requirements | Manual update instructions would not satisfy CLI-authoritative update guarantees |
| Living Gherkin specs plus Cucumber scaffolding | Living specs are the source of truth and tests must be generated from public behavior | Plain markdown scenarios would not provide executable behavioral validation |
| Shared core library with MCP + CLI interfaces | Deterministic state must have a single writer; agents use MCP, developers use CLI; SC-012 requires parity | Allowing direct agent file edits for machine-readable state would cause races and contract drift |
| Three-binary CLI (dispatcher / full / MCP) | Global dispatcher stays lightweight; local version pinning; MCP never via global artifact | In-process global delegation would load wrong toolkit version and blur ownership boundaries |

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
- MCP/CLI parity and deterministic mutation boundaries are documented in `contracts/mcp-tools.md` and `contracts/cli-commands.md`.
- Agent MCP config generation and merge rules are documented in `contracts/agent-mcp-config.md` and extension manifest `agentSetup`.
