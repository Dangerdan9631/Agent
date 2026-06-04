# Research: 001-current-application-state

**Date**: 2026-06-02

## R1: Legacy migration source of truth

**Decision**: Port cerebrate runtime, config loaders, and RPC handlers from
`packages/service` (legacy) into `packages/overmind`, adapting imports to
`overmind-sdk` types only.

**Rationale**: Legacy service already implements robot3 cerebrates, attach streaming,
task persistence, provider chain behavior, and the unnamed/global attach path —
matching TEMP.md and FR-015–FR-017. Rewriting
would delay baseline closure without benefit.

**Alternatives considered**:

- **Greenfield in `packages/overmind`**: Rejected — duplicates tested logic.
- **Keep calling legacy packages from canonical**: Rejected — violates constitution I.

## R2: IPC stack (kkrpc vs legacy overmind-core RPC)

**Decision**: Standardize on **kkrpc** (`NodeIo` + `RPCChannel`) already used in
`OvermindIpcServer` / `OvermindIpcClient`. Extend `OvermindIpcApi` to match the
method set legacy exposed via `OvermindRpcApi`.

**Rationale**: Canonical packages already depend on kkrpc; switching RPC libraries
would touch all three packages without user value.

**Alternatives considered**:

- **Port overmind-core `createRpcChannel`**: Rejected — adds fourth conceptual
  dependency and conflicts with legacy deprecation.

**Attach streaming**: Legacy passes `AttachServerEventSink` callbacks on the same
connection (`attached`, `output`, `terminate`). When `AttachRequest.name` is omitted,
legacy subscribes to the global buffered logger channel (`bufferName ?? __global__`),
which is how service log output is attached without naming a cerebrate. kkrpc must
support bidirectional events or a dedicated attach connection pattern. **Action for
M2**: prototype attach on kkrpc; if unsupported, use secondary connection or port
legacy channel factory behind `OvermindIpcServer` adapter interface.

## R3: Type ownership

**Decision**: All cross-boundary types remain in **`overmind-sdk/src/api`**. Service
implements `overmind-sdk/ipc/overmind-ipc-api` (expanded). No new `overmind-api`
package.

**Rationale**: Constitution IV — single contract owner.

**Alternatives considered**:

- **Shared `overmind-api` package**: Rejected — legacy, deprecated.

## R4: Config bootstrap behavior

**Decision**: Service bootstraps config on first run (M1), matching README:

- `overmind-config.yaml` with `version: 1`
- `cerebrates/hello/cerebrate-config.yaml` example

**Rationale**: FR-016 and operator expectations; legacy loaders already implement
validation.

**Alternatives considered**:

- **CLI creates config before spawn**: Rejected — violates thin CLI; service owns
  config truth per Principle III.

## R5: Cerebrate state machine

**Decision**: Retain **robot3** FSM with states aligned to existing `CerebrateStats`
type: `initialize`, `idle`, `check-tasks`, `post-check`, `work`, `validate`,
`shutting down`.

**Rationale**: Constitution technology table; SDK types already match legacy domain.

**Alternatives considered**:

- **Simpler loop (TEMP.md “init, idle, process, terminate”)**: Deferred simplification
  until after port; map TEMP.md phases to existing states in docs.

## R6: Agent provider integrations

**Decision**: **Out of scope** for this feature. Port structure for `LlmRunner` /
provider chain from legacy but gate actual Cursor/Codex/Gemini adapters behind a
follow-up feature (FR-019).

**Rationale**: Spec explicitly excludes external agent backends; M3 can use stub or
hello-world provider for tests while the command contract remains documented for
legacy parity.

## R7: Duplicate service start

**Decision**: `StartOperation` MUST check IPC connectivity before spawn; if `getStats`
succeeds, return clear error (“service already running for this config”).

**Rationale**: Spec edge case; prevents orphaned duplicate processes.

## R8: Testing strategy

**Decision**:

- **Unit**: Vitest per package for operations, loaders, registry
- **Integration**: scripted start/stats/shutdown + cerebrate happy path under `src/`
- **Manual**: quickstart.md checklist

**Rationale**: Constitution V; IPC changes require integration coverage.

**Alternatives considered**:

- **E2E only**: Rejected — too slow for inner loop.
