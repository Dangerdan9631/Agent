# Data Model: 001-current-application-state

**Date**: 2026-06-02

## Config Instance

Represents one Overmind deployment keyed by filesystem path.

| Field | Type | Rules |
|-------|------|-------|
| `configDir` | path | Required; explicit flag or `OVERMIND_CONFIG_DIR` |
| `resolvedConfigDir` | absolute path | Normalized at SDK boundary |
| `instanceName` | string | Basename of resolved config dir |
| `instanceHash` | string (8 hex) | SHA-1 prefix of resolved path |
| `pipePath` | string | `\\.\pipe\overmind-{name}-{hash}` (Win) or `/tmp/overmind-{name}-{hash}.sock` |

**Relationships**: 1 config instance → 0..1 service process → 0..N cerebrates (N enforced by unique name).

## Service Runtime

| Field | Type | Rules |
|-------|------|-------|
| `startedAt` | timestamp | Set when IPC server listening |
| `uptime` | seconds (float) | Derived for `GetStatsResponse` |
| `cerebrateRegistry` | map name → Cerebrate | At most one live instance per name |

## Overmind Config File (`overmind-config.yaml`)

| Field | Type | Rules |
|-------|------|-------|
| `version` | integer | Required; minimum `1` |

Additional keys TBD during M1 port from legacy schema.

## Cerebrate Definition (`cerebrates/<name>/cerebrate-config.yaml`)

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | Must match directory name |
| `description` | string | Human-readable |
| `responsibilities` | string[] | Optional guidance for agent |
| `commands` | object | Command templates for agent invocation; legacy model includes lifecycle/integration entries such as `run`, `shutdown`, and `attach` |

Loaded at `startCerebrate`; invalid config → start error.

## Cerebrate Runtime

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | Unique among running instances |
| `state` | enum | See state machine below |
| `runtime` | seconds | Since cerebrate start |
| `idleLoopCount` | integer | Monotonic counter for idle cycles |
| `currentTask` | Task \| undefined | Set during work/validate |

### State machine (robot3)

```text
initialize → idle ⟷ check-tasks → post-check → work → validate → idle
                    ↘ shutting down (from any state via stop)
```

| State | Meaning |
|-------|---------|
| `initialize` | Transient boot |
| `idle` | Waiting; periodic check-tasks |
| `check-tasks` | Scan task repository |
| `post-check` | Branch: task found → work, else idle |
| `work` | Execute current task (LLM/provider) |
| `validate` | Validate task outcome |
| `shutting down` | Draining stop |

## Task (persistence)

| Field | Type | Rules |
|-------|------|-------|
| `id` | string/number | Allocated per repository rules |
| `markdown` | file | Stored under cerebrate config area (legacy file-system repository) |

Port details from legacy `Task` entity during M3.

## Attach Stream

| Event | Payload | Direction |
|-------|---------|-----------|
| `attached` | `{ name?: string }` | Service → client |
| `output` | `{ name?, timestamp, data }` | Service → client |
| `terminate` | `{ name? }` | Either direction |
| `error` | Error | Service → client |

**Request**: `{ name?: string, historyPlaybackSize?: number }` — replays up to N historical lines then live. If `name` is omitted, the request attaches to the service/global log buffer rather than a cerebrate-specific stream.

## SDK API Operations (client-side)

| Operation | Persists state? | Delegates to |
|-----------|-----------------|--------------|
| `start` | Spawns process | local `StartOperation` |
| `shutdown` | May force-kill | `ShutdownOperation` + IPC |
| `getStats` | No | IPC |
| `startCerebrate` | No | IPC |
| `stopCerebrate` | No | IPC |
| `sendCerebrateCommand` | No | IPC |
| `attach` | No | IPC streaming |

## Validation Rules Summary

- FR-017: `startCerebrate(name)` MUST fail if `name` already in registry
- FR-003: missing config dir MUST throw `missingConfigDirError` at SDK
- Attach: only one active attach per RPC connection (legacy rule; preserve in M2)
- Attach: unnamed attach follows the legacy global-buffer behavior (`bufferName ?? __global__`)
