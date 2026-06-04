# Implementation Plan: Overmind Current Application State (Baseline)

**Branch**: `001-current-application-state` | **Date**: 2026-06-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-current-application-state/spec.md`

## Summary

Document and close the gap between the **baseline spec** (what Overmind promises vs
what the canonical trio delivers today). The canonical workspace now provides
service lifecycle, config bootstrap, cerebrate control, attach streaming, and the
full `OvermindIpcApi` surface. The technical approach was an **incremental
migration**: port behavior into `packages/overmind`, extend `overmind-sdk` IPC and
handlers, keep `overmind-cli` thin, then remove the legacy packages.

## Technical Context

**Language/Version**: TypeScript on Node.js 24+ (ESM)

**Primary Dependencies**: commander, chalk, tsyringe, kkrpc, robot3, zod, yaml

**Storage**: File-based config under user config directory (`overmind-config.yaml`,
`cerebrates/<name>/cerebrate-config.yaml`, task markdown files per legacy design)

**Testing**: Vitest unit tests from `overmind/src`; add IPC integration tests as
contracts expand

**Target Platform**: Local developer machines (Windows named pipes, Unix domain
sockets under `/tmp`)

**Project Type**: CLI + detached service (multi-package npm workspace)

**Performance Goals**: Service start detected within 5s (existing); attach stream
latency suitable for interactive CLI (sub-second event delivery on local IPC)

**Constraints**: Constitution v1.1.0 — three canonical packages only; no UI/MCP
in this feature; one cerebrate instance per name; credentials in config/env only

**Scale/Scope**: Single-machine, single operator; tens of cerebrates max; canonical
three-package workspace without new surfaces

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Pre-design | Post-design |
|-----------|------------|-------------|
| I. Package boundaries | PASS — plan targets only `overmind`, `overmind-cli`, `overmind-sdk` | PASS |
| II. Thin CLI | PASS — no new business logic in CLI | PASS |
| III. Service + IPC | PASS — cerebrate state stays in service | PASS — attach/streaming on IPC |
| IV. Contract-first config | PARTIAL — loaders planned M1 | PASS — types in SDK, loaders in service |
| V. Tests | PARTIAL — expand with milestones | PASS — test tasks per milestone |

**Deferred (documented, not violations)**: Electron UI, MCP, external agent CLIs
(FR-018–FR-020) remain out of scope per spec.

## Project Structure

### Documentation (this feature)

```text
specs/001-current-application-state/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1
│   ├── ipc-service-api.md
│   ├── sdk-client-api.md
│   └── cli-commands.md
├── spec.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
overmind/
├── src/
│   ├── package.json                 # workspace root (build/test/lint)
│   └── packages/
│       ├── overmind-sdk/            # contracts, IPC client, Start/Shutdown ops
│       │   └── src/
│       │       ├── api/             # request/response types
│       │       ├── ipc/             # OvermindIpcApi, OvermindIpcClient
│       │       └── operations/      # OvermindApiHandler
│       ├── overmind/                # service process (npm: overmind-service)
│       │   └── src/
│       │       ├── service/         # OvermindService, OvermindIpcServer
│       │       └── di/
│       └── overmind-cli/            # commander commands → SDK
│           └── src/commands/
├── specs/
└── .specify/
```

**Structure Decision**: npm workspace under `overmind/src` with three canonical
packages only.

## Complexity Tracking

No constitution violations requiring justification. UI/MCP excluded by spec scope.

## Phase 0: Research

Completed in [research.md](./research.md). All technical-context items resolved.

## Phase 1: Design

| Artifact | Path |
|----------|------|
| Data model | [data-model.md](./data-model.md) |
| IPC contract | [contracts/ipc-service-api.md](./contracts/ipc-service-api.md) |
| SDK contract | [contracts/sdk-client-api.md](./contracts/sdk-client-api.md) |
| CLI contract | [contracts/cli-commands.md](./contracts/cli-commands.md) |
| Operator guide | [quickstart.md](./quickstart.md) |

**Post-design constitution**: PASS — contracts live in SDK; service owns runtime;
CLI unchanged in responsibility.

## Implementation Roadmap (for `/speckit-tasks`)

Work is ordered by user-story priority in the spec. Each milestone is independently
verifiable.

### Milestone M0 — Baseline hardening (US1, US2)

**Goal**: Make current capabilities reliable and testable.

- Add duplicate-start detection (IPC already listening → clear error, no second process)
- Unit tests: `StartOperation`, `ShutdownOperation`, `OvermindIpcClient`, service `getStats`/`shutdown`
- Integration test: start → stats → shutdown (Windows + Linux CI matrix if available)
- Align README with actual config bootstrap status

**Exit**: SC-001, SC-002 satisfied; FR-001–FR-010 verified by automation.

### Milestone M1 — Config bootstrap (FR-016)

**Goal**: First `start` creates config layout described in README.

- Port/adapt `overmind-config-loader` and `cerebrate-config-loader` from legacy
  `packages/service` into `packages/overmind` (no legacy imports)
- On service boot: ensure `overmind-config.yaml` (min `version: 1`) and example
  `cerebrates/hello/cerebrate-config.yaml` when missing
- Validate with zod; surface parse errors over logs/IPC where applicable

**Exit**: Operator can point at empty directory and get valid config tree.

### Milestone M2 — IPC contract expansion (FR-010, FR-011)

**Goal**: Service exposes full cerebrate RPC surface matching SDK types.

- Extend `OvermindIpcApi` in `overmind-sdk` with `startCerebrate`, `stopCerebrate`,
  `sendCerebrateCommand`, and streaming `attach` (+ `terminateAttach` if required
  by kkrpc bidirectional pattern — see research.md)
- Implement handlers in `packages/overmind` delegating to application layer
- Extend `OvermindIpcClient` / handler wiring for new methods

**Exit**: IPC-level smoke tests call each method (may return errors until M3).

### Milestone M3 — Cerebrate runtime port (US3, FR-012–FR-017, FR-014–FR-015)

**Goal**: Working cerebrates with robot3 FSM and registry.

- Port domain/application layers from legacy `packages/service`:
  - `Cerebrate` robot3 machine, registry, task repository, output buffer
  - Use cases: start/stop/send/attach/get-stats (consolidated stats)
- Enforce single instance per cerebrate name (FR-017)
- Populate `GetStatsResponse.cerebrates` with live `CerebrateStats`

**Exit**: All cerebrate CLI commands succeed end-to-end; stats shows running agents.

### Milestone M4 — SDK client completion (US4, FR-013)

**Goal**: Remove `Method not implemented` from `OvermindApiHandler`.

- Implement `attach`, `startCerebrate`, `stopCerebrate`, `sendCerebrateCommand` in
  `OvermindApiHandler` via `OvermindIpcClient` (and local attach channel adapter)
- Match `AttachChannel` event semantics to legacy attach use case

**Exit**: SC-003 inverted — all seven CLI commands work; SDK integration tests green.

### Milestone M5 — Legacy removal (SC-005)

**Goal**: Constitution-compliant workspace only.

- Remove dependencies on `packages/api`, `cli`, `core`, `service` from workspace
- Delete legacy directories; update `tsconfig.base.json`, root `package.json` workspaces
- Final docs pass on README + quickstart

**Exit**: No live legacy package paths remain outside historical migration notes in
this spec set.

**Historical note**: Remaining references to `packages/api`, `packages/cli`,
`packages/core`, and `packages/service` are documentation-only and limited to this
spec set where they explain migration history or legacy behavioral provenance.

### Future milestones (separate features)

| Item | Spec refs | Notes |
|------|-----------|-------|
| Electron UI | FR-018, TEMP.md | SDK-only; Vayeate guidelines |
| MCP server | FR-019 | Same SDK contracts |
| Agent providers | FR-020 | Provider chain behind service port |
| `list-agents` command | TEMP.md | May alias `stats` or thin list command |

## Risk & Mitigation

| Risk | Mitigation |
|------|------------|
| kkrpc attach differs from legacy RPC | Spike in M2; document in ipc contract; port `AttachToOutputUseCase` behavior |
| Large service migration | Milestone per layer; remove legacy packages only after canonical tests are green |
| Windows pipe stale after crash | Document `--force` in quickstart; M0 integration test |
| npm name `overmind-service` vs dir `overmind` | Separate rename task; not blocking M0–M4 |

## Next Command

Run **`/speckit-tasks`** to generate `tasks.md` from milestones M0–M5 grouped by
user story (P1 → P2).
