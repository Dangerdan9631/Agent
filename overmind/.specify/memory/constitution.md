<!--
Sync Impact Report
- Version change: 1.0.0 → 1.1.0
- Modified principles:
  - I. Package Boundary Integrity → canonical trio + legacy deprecation
  - IV. Contract-First & Config-Driven → contracts live in overmind-sdk
- Added sections: Legacy Packages (under Technology Stack)
- Removed sections: None
- Templates: plan-template.md ✅ aligned
           spec-template.md ✅ aligned
           tasks-template.md ✅ aligned
           .specify/templates/commands/*.md ⚠ N/A
- Docs: README.md ✅ updated (package table, npm link paths)
- Deferred TODOs: Remove legacy dirs (api, cli, core, service) when migration complete
-->

# Overmind Constitution

## Core Principles

### I. Package Boundary Integrity

Overmind is a TypeScript npm workspace under `src/` with **exactly three**
canonical packages. Each MUST have a single, documented purpose and MUST NOT
absorb responsibilities belonging to another layer.

| Directory | npm name | Role |
|-----------|----------|------|
| `packages/overmind` | `overmind-service` (transitional) | Long-lived service process, IPC server, cerebrate runtime |
| `packages/overmind-cli` | `overmind-cli` | Human CLI (`overmind` binary); parse argv, format output |
| `packages/overmind-sdk` | `overmind-sdk` | Shared types, IPC client, programmatic API for CLI/UI/MCP |

**Legacy packages** (`packages/api`, `packages/cli`, `packages/core`,
`packages/service`, and npm names `overmind-api`, legacy `overmind-cli` under
`packages/cli`, `overmind-core`, `overmind-service2`) are **deprecated**. They
MUST NOT receive new features, imports, or documentation references. Migration
work moves behavior into the canonical trio, then deletes legacy directories.

- **SDK (`overmind-sdk`)** owns cross-boundary contracts and client operations;
  it MUST NOT embed CLI parsing, UI, or service lifecycle logic.
- **CLI (`overmind-cli`)** and future **UI/MCP** surfaces MUST depend on
  `overmind-sdk` only—not on legacy packages or duplicated service code.
- **Service (`packages/overmind`)** implements runtime state and IPC handling;
  it MUST NOT depend on `overmind-cli`.
- Dependency direction: `overmind-sdk` ← `overmind-cli`, `packages/overmind`.
- Specs, plans, tasks, and agents MUST reference only the three canonical paths
  unless documenting explicit legacy removal.

### II. Thin Control Surfaces

Human-facing CLIs and agent-facing MCP adapters are **control planes only**. They
MUST parse input, format output, and delegate to `overmind-sdk` operations.

- Commander (or equivalent) handles argv; chalk (or equivalent) handles presentation.
- No business rules, state machines, or cerebrate lifecycle logic in CLI/UI/MCP code.
- Errors surface on stderr; successful machine-readable output uses consistent
  JSON or plain text as documented per command.
- Every new command MUST be exercisable via `node packages/overmind-cli/dist/bin.js`
  without requiring the Electron UI.

### III. Service Process & IPC (NON-NEGOTIABLE)

The **service** (`packages/overmind`) runs as a separate long-lived process. CLI,
UI, and MCP communicate with it only through the documented IPC boundary exposed
via `overmind-sdk`.

- Starting/stopping the service is explicit (`start`, `shutdown`); clients MUST NOT
  fork duplicate service instances for the same config directory.
- At most **one running instance per cerebrate name**; attempts to violate this
  MUST fail with a clear error.
- Service owns runtime state (cerebrates, tasks, streams); clients observe or
  command via SDK, not by reading internal files directly during normal operation.
- IPC contract changes require updating `overmind-sdk` types and handlers together
  with the service implementation in `packages/overmind`.

### IV. Contract-First & Config-Driven Behavior

Behavior that crosses process boundaries MUST be expressed as typed contracts in
`overmind-sdk` and file-based configuration under a user-supplied **config
directory**.

- Request/response shapes and IPC contracts live in `overmind-sdk`; breaking
  changes follow semantic versioning and require migration notes.
- Service settings use `overmind-config.yaml` (minimum `version: 1`); cerebrates
  live under `cerebrates/<name>/cerebrate-config.yaml`.
- Features MUST document config keys they introduce and remain backward compatible
  within a major config version unless a migration path is specified.
- Agent backends (Cursor SDK, Codex CLI, Gemini CLI, etc.) integrate behind stable
  service abstractions—never as one-off branches in the CLI.

### V. Test Discipline, Observability & Simplicity

Quality is enforced by automated tests and observable runtime behavior, not by
scope expansion.

- Unit tests use **Vitest** from `overmind/src` (`npm test`); new logic in
  canonical packages MUST include tests when behavior is non-trivial or
  regression-prone.
- Prefer the smallest change that satisfies the spec; defer UI/Electron/MCP work
  until the `packages/overmind` + `overmind-cli` path is proven.
- Logging MUST be structured enough to diagnose IPC, cerebrate lifecycle, and
  command failures without attaching a debugger.
- Integration tests are required when changing IPC contracts, persistence formats,
  or multi-package flows; document how to run them in the feature plan.

## Technology Stack & Constraints

| Area | Requirement |
|------|-------------|
| Runtime | Node.js **24 LTS or newer** (ESM, `"type": "module"`) |
| Language | TypeScript across workspace packages |
| Workspace root | `overmind/src` — build/test/lint run from here |
| Canonical packages | `overmind`, `overmind-cli`, `overmind-sdk` only |
| DI | tsyringe in SDK and service boundaries where composition is needed |
| Lint | ESLint (`npm run lint`); fixes MUST not disable rules without justification |
| Service state | robot3 state machines for service and per-cerebrate loops (init → idle → process → terminate) |
| Planned surfaces | CLI (current), Electron UI, MCP — all via `overmind-sdk` + IPC per Principles II–III |

### Legacy Packages (deprecated)

The following exist only during migration and MUST NOT be extended:

- `packages/api`, `packages/cli`, `packages/core`, `packages/service`
- Associated npm workspace names: `overmind-api`, legacy CLI under `packages/cli`,
  `overmind-core`, `overmind-service2`

New specs and implementation tasks MUST target `packages/overmind`,
`packages/overmind-cli`, and `packages/overmind-sdk`. Removing legacy directories
is a tracked cleanup goal, not optional scope creep.

Performance and scale targets are feature-specific; plans MUST state them when
relevant. Security-sensitive operations (API keys, agent credentials) MUST stay in
config or environment—not hardcoded in source.

## Development Workflow

1. **Spec-driven delivery**: Features flow through Spec Kit — `speckit-specify` →
   optional `speckit-clarify` → `speckit-plan` → `speckit-tasks` →
   `speckit-implement`. Artifact paths live under `specs/<feature>/`.
2. **Constitution gate**: Every `plan.md` MUST complete the Constitution Check
   section before Phase 0 research and again after Phase 1 design. Violations
   require documented justification or spec/plan revision.
3. **Build before merge**: `npm run build` and `npm test` MUST pass for touched
   canonical packages; run `npm run lint` when TypeScript sources change.
4. **User stories drive tasks**: `tasks.md` groups work by independently testable
   user stories (P1, P2, …) per the spec template; avoid monolithic task lists.
5. **Documentation**: README and feature `quickstart.md` MUST stay aligned when
   commands, config layout, or package boundaries change.

Runtime development guidance: `README.md` at the repository root; feature-specific
notes in `specs/<feature>/quickstart.md` when generated by planning.

## Governance

This constitution supersedes ad-hoc conventions in specs, plans, and agent
sessions when they conflict. Amendments require:

1. A documented change with version bump (semver: MAJOR = principle removal or
   incompatible redefinition; MINOR = new principle or material expansion; PATCH =
   clarifications only).
2. Propagation to affected templates (`plan-template.md`, `spec-template.md`,
   `tasks-template.md`) and `README.md` when user-facing rules change.
3. A Sync Impact Report HTML comment at the top of this file listing template and
   doc status.

All pull requests and `/speckit-analyze` reviews MUST verify compliance with Core
Principles. Complexity beyond what the spec requires MUST be challenged in the
Constitution Check or analysis report.

**Version**: 1.1.0 | **Ratified**: 2026-06-02 | **Last Amended**: 2026-06-02
