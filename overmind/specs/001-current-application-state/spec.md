# Feature Specification: Overmind Current Application State (Baseline)

**Feature Branch**: `001-current-application-state`

**Created**: 2026-06-02

**Status**: Draft (baseline / as-is documentation)

**Input**: User description: "Create feature specifications that capture the current
state of the application. Base it off of TEMP.md, as well as the constitution, and
the current application state in overmind/overmind-cli/overmind-sdk."

## Purpose

This specification documents **what Overmind does today** in the three canonical
packages (`packages/overmind`, `packages/overmind-cli`, `packages/overmind-sdk`),
what is **declared but not yet implemented**, and what is **planned** per TEMP.md
and the project constitution. It is a baseline for `/speckit-plan`, gap analysis,
and migration away from legacy packages—not a net-new feature request.

## Scope

### In scope (canonical packages only)

- Service lifecycle: start (detach), graceful shutdown, force shutdown
- IPC between CLI/SDK clients and the service process
- CLI command surface and thin-delegation pattern
- SDK API contracts and client operations that exist today
- Configuration directory resolution and per-instance IPC naming
- Constitution constraints (package boundaries, IPC, config-driven design)

### Out of scope (documented as planned gaps)

- Legacy packages (`packages/api`, `cli`, `core`, `service`)
- Electron UI, MCP agent interface (TEMP.md)
- Full cerebrate runtime (state machines, message processing, provider integrations)
- Automatic creation of `overmind-config.yaml` and cerebrate configs on first start
  (described in README; not present in canonical service code yet)
- Listing running agents as a dedicated command (TEMP.md; partially covered by `stats`
  contract when implemented)
- External agent backends (Cursor SDK, Codex CLI, Gemini CLI, Claude, Copilot, Windsurf)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start and observe the service (Priority: P1)

An operator starts the Overmind service for a config directory, confirms it is
running, and reads basic runtime statistics.

**Why this priority**: Without a running service process and IPC path, no other
Overmind capability is reachable.

**Independent Test**: Run `start` with `--config-dir`, then `stats`; verify uptime
is reported and the CLI exits successfully while the service keeps running.

**Acceptance Scenarios**:

1. **Given** no service is listening on the config instance IPC endpoint,
   **When** the operator runs `overmind start --config-dir <path>`,
   **Then** a detached service process starts and the CLI reports success within
   a bounded startup window (currently 5 seconds).
2. **Given** the service is running,
   **When** the operator runs `overmind stats --config-dir <path>`,
   **Then** uptime is displayed in seconds and cerebrate count is shown (currently
   always zero with an empty cerebrate list).
3. **Given** `OVERMIND_CONFIG_DIR` is set and `--config-dir` is omitted,
   **When** the operator runs `stats`,
   **Then** the same instance is targeted as when the env var was used for `start`.

---

### User Story 2 - Shut down the service safely (Priority: P1)

An operator stops the service either cooperatively through IPC or forcibly when
the cooperative path is insufficient.

**Why this priority**: Clean shutdown prevents orphaned processes and locked IPC
endpoints on developer machines.

**Independent Test**: Start service, run `shutdown`, confirm stats/IPC calls fail
afterward; repeat with `--force` if cooperative shutdown leaves a process.

**Acceptance Scenarios**:

1. **Given** a running service,
   **When** the operator runs `overmind shutdown --config-dir <path>`,
   **Then** the service receives a shutdown request over IPC and stops accepting
   new connections.
2. **Given** a running or stuck service process,
   **When** the operator runs `overmind shutdown --force --config-dir <path>`,
   **Then** matching service processes for that config directory are terminated
   without requiring a successful IPC handshake.
3. **Given** the service is not running,
   **When** the operator runs cooperative `shutdown`,
   **Then** the operator receives a clear error (connection failure), not a silent
   success.

---

### User Story 3 - Control cerebrates via CLI (Priority: P2)

An operator uses CLI commands to start, stop, send commands to, and attach to
cerebrate output streams—matching the intended product surface from TEMP.md.

**Why this priority**: Cerebrates are the core unit of agent work; the CLI already
exposes commands for this journey.

**Independent Test**: Attempt each cerebrate command against a running service;
document expected vs actual behavior for baseline tracking.

**Acceptance Scenarios**:

1. **Given** a running service,
   **When** the operator runs `overmind start-cerebrate <name> --config-dir <path>`,
   **Then** **current behavior**: the SDK returns "Method not implemented" and the
   command fails; **target behavior**: a cerebrate instance starts and appears in
   `stats` with state and runtime fields populated.
2. **Given** a running cerebrate,
   **When** the operator runs `overmind send-command <cerebrate> <command> ...`,
   **Then** **current behavior**: not implemented in SDK; **target behavior**: command
   is delivered and output is returned or streamed.
3. **Given** a running cerebrate,
   **When** the operator runs `overmind attach <name> --config-dir <path>`,
   **Then** **current behavior**: not implemented in SDK; **target behavior**: the
   operator sees historical output (per `historyPlaybackSize`) and live stream events
   until terminate.
4. **Given** a running cerebrate,
   **When** the operator runs `overmind stop-cerebrate <name>`,
   **Then** **current behavior**: not implemented in SDK; **target behavior**: the
   cerebrate stops and is removed from running stats.

---

### User Story 4 - Programmatic control via SDK (Priority: P2)

A developer (CLI, future UI, or MCP) uses `overmind-sdk` to perform the same
operations without reimplementing IPC or process management.

**Why this priority**: Constitution requires all control surfaces to delegate to the
SDK; the SDK is the single contract owner.

**Independent Test**: Instantiate `OvermindApiFactory`, call each API method with
a running service, record implemented vs stub responses.

**Acceptance Scenarios**:

1. **Given** a valid config directory,
   **When** the developer calls `start({})` on `OvermindApi`,
   **Then** the service binary is spawned detached and startup is awaited via IPC
   health check (`getStats`).
2. **Given** a running service,
   **When** the developer calls `getStats({})`,
   **Then** a typed response includes uptime, `runningCerebrateCount`, and
   `cerebrates[]` (currently empty stub from service).
3. **Given** a running service,
   **When** the developer calls `attach`, `startCerebrate`, `stopCerebrate`, or
   `sendCerebrateCommand`,
   **Then** **current behavior**: calls throw not-implemented; contracts and CLI
   wiring exist for future implementation.

---

### User Story 5 - Planned multi-surface architecture (Priority: P3)

A product owner validates that TEMP.md vision is captured for future work without
being mistaken for shipped behavior.

**Why this priority**: Prevents scope creep in near-term tasks while preserving the
north-star design.

**Independent Test**: Review "Planned capabilities" requirements; confirm no
requirement in the "Current capabilities" set depends on UI/MCP/cerebrate FSM.

**Acceptance Scenarios**:

1. **Given** TEMP.md architecture notes,
   **When** stakeholders read this spec,
   **Then** they can distinguish CLI (shipped scaffolding), service IPC (partial),
   SDK (partial), UI (not started), and MCP (not started).
2. **Given** constitution Principle II–III,
   **When** UI or MCP is built,
   **Then** it MUST use `overmind-sdk` only and MUST NOT duplicate service logic.

---

### Edge Cases

- **Missing config directory**: CLI/SDK calls without `--config-dir` or
  `OVERMIND_CONFIG_DIR` fail with a dedicated config error.
- **Duplicate service start**: Starting when IPC already accepts connections should
  not spawn unbounded processes; second start attempts should fail or no-op clearly.
- **Stale IPC socket/pipe**: After crash, operator may need `--force` shutdown before
  restart on Unix; Windows named pipes behave similarly.
- **Platform paths**: IPC endpoint is OS-specific (Windows named pipe vs Unix socket
  under `/tmp`), derived from config directory hash.
- **Cerebrate name collision**: Constitution requires at most one instance per name;
  enforcement is **not yet implemented** in canonical service.
- **CLI registers cerebrate commands before SDK implements them**: Operators see
  command help but runtime failure—documented as known gap.

## Requirements *(mandatory)*

### Functional Requirements — Current capabilities

- **FR-001**: The system MUST expose a long-lived **service process**
  (`packages/overmind`, npm `overmind-service`) separate from the CLI.
- **FR-002**: The system MUST communicate over **IPC** using an OS-specific pipe or
  socket path uniquely identified by config directory (instance name + hash).
- **FR-003**: The SDK MUST resolve config directory from an explicit path or
  `OVERMIND_CONFIG_DIR` and MUST reject missing configuration with a clear error.
- **FR-004**: The CLI MUST register commands: `start`, `shutdown`, `stats`,
  `start-cerebrate`, `stop-cerebrate`, `send-command`, `attach`.
- **FR-005**: The CLI MUST delegate all operations to `overmind-sdk` and MUST limit
  itself to parsing, formatting (e.g., chalk), and logging—not service business logic.
- **FR-006**: `start` MUST spawn the service binary detached, wait up to 5 seconds for
  IPC availability, and report success or timeout failure.
- **FR-007**: Cooperative `shutdown` MUST invoke service `shutdown` over IPC; the
  service MUST stop its IPC server.
- **FR-008**: `shutdown --force` MUST terminate service processes matching the service
  binary and config directory without requiring IPC (platform-specific process scan).
- **FR-009**: `stats` MUST display service uptime and cerebrate summary fields from
  `GetStatsResponse` (service currently returns zero cerebrates).
- **FR-010**: The service IPC surface MUST implement at minimum `getStats` and
  `shutdown` handlers.

### Functional Requirements — Contract surface (declared, not implemented)

- **FR-011**: The SDK `OvermindApi` MUST define operations for `attach`,
  `startCerebrate`, `stopCerebrate`, and `sendCerebrateCommand` with typed
  request/response models (present today).
- **FR-012**: Cerebrate stats model MUST support name, runtime, idle loop count, and
  states: initialize, idle, check-tasks, post-check, work, validate, shutting down
  (types exist; service does not populate yet).
- **FR-013**: Attach channel MUST support attached, output, terminate, and error
  events plus `listen()` and `terminate()` (interface exists; handler not implemented).

### Functional Requirements — Planned capabilities (TEMP.md + constitution)

- **FR-014**: The system SHOULD run **robot3 state machines** in the service: one for
  service lifecycle and one per cerebrate (init → idle → process message → terminate).
- **FR-015**: The system SHOULD support **config-driven** `overmind-config.yaml` and
  per-cerebrate `cerebrate-config.yaml` under `cerebrates/<name>/`.
- **FR-016**: The system SHOULD enforce **one running instance per cerebrate name**.
- **FR-017**: A future **Electron UI** SHOULD support multiple attach windows, live
  streams, agent messaging, state/stats display, and service runtime stats.
- **FR-018**: A future **MCP interface** SHOULD expose agent-oriented control using the
  same SDK contracts as the CLI.
- **FR-019**: Cerebrate execution SHOULD integrate external agent tools (Cursor SDK,
  Gemini CLI, Codex CLI, Claude CLI, Copilot CLI, Windsurf CLI) behind service
  abstractions—not CLI-specific branches.
- **FR-020**: `start` and `stop` of the **service itself** SHOULD remain CLI/UI-only
  per TEMP.md (agents/MCP do not replace service lifecycle commands).

### Key Entities

- **Config instance**: A resolved config directory; determines IPC endpoint, instance
  name (basename), and hash suffix for pipe/socket path.
- **Service process**: Detached Node process running `OvermindService` and
  `OvermindIpcServer`; authoritative for uptime and (future) cerebrate registry.
- **Cerebrate**: Named agent worker defined under config; intended single-instance,
  state-machine-driven runtime (not active in canonical service yet).
- **CLI command**: User-facing entry point registered on the `overmind` binary;
  thin wrapper over SDK.
- **SDK operation**: Client-side orchestration (`StartOperation`, `ShutdownOperation`)
  or IPC proxy (`OvermindIpcClient`) implementing `OvermindApi`.
- **IPC contract**: kkrpc channel exposing `OvermindIpcApi` (`getStats`, `shutdown`
  today; cerebrate methods future).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An operator can start the service and retrieve uptime via `stats` in
  under 10 seconds on a local developer machine (excluding first-time build).
- **SC-002**: Cooperative shutdown completes and a subsequent `stats` call fails to
  connect within 3 seconds in 95% of manual test runs on Windows and Unix targets.
- **SC-003**: 100% of CLI commands that are not implemented in the SDK fail with an
  explicit error (no silent success) until implementations land.
- **SC-004**: Baseline spec readers can list all seven CLI commands and classify each
  as **working**, **stub**, or **planned** without reading source code.
- **SC-005**: No new feature spec or plan references legacy package paths unless the
  work item is explicitly "remove legacy package X."

## Assumptions

- **Baseline intent**: User wants documentation of **as-is** canonical code, not a
  rewrite spec; gaps are labeled explicitly.
- **TEMP.md**: Treated as product vision; only requirements marked "Planned" are
  non-binding for current delivery.
- **README config bootstrap**: First-start YAML creation is product expectation but
  **not implemented** in `packages/overmind` yet; tracked under FR-015.
- **Legacy code**: May still contain fuller cerebrate behavior for reference during
  migration; it is excluded from this baseline per constitution v1.1.0.
- **Target users**: Developers and operators running Overmind locally on Windows or
  Unix-like systems with Node 24+.
- **Agent interfaces**: Listed in TEMP.md as future integrations; no provider is
  required for baseline acceptance.

## Command & Capability Matrix (baseline snapshot)

| CLI command | SDK method | Service IPC | Status |
|-------------|------------|-------------|--------|
| `start` | `start` | N/A (spawns process) | Working |
| `shutdown` | `shutdown` | `shutdown` | Working (cooperative + force) |
| `stats` | `getStats` | `getStats` | Working (stub cerebrate data) |
| `start-cerebrate` | `startCerebrate` | Not exposed | Stub (SDK throws) |
| `stop-cerebrate` | `stopCerebrate` | Not exposed | Stub (SDK throws) |
| `send-command` | `sendCerebrateCommand` | Not exposed | Stub (SDK throws) |
| `attach` | `attach` | Not exposed | Stub (SDK throws) |

## Architecture Alignment (constitution v1.1.0)

| Principle | Baseline compliance |
|-----------|---------------------|
| I. Package boundaries | CLI and service depend on SDK; legacy packages excluded from spec |
| II. Thin CLI | Commander + chalk + `OvermindApiFactory` only |
| III. Service + IPC | Separate process; kkrpc over named pipe/socket |
| IV. Contract-first config | SDK types and config resolution exist; YAML loaders not in canonical service |
| V. Tests | Workspace has Vitest; canonical packages need expanded tests as features land |
