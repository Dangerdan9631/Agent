# Contract: Service IPC API (`OvermindIpcApi`)

**Package**: `overmind-sdk` (`src/ipc/overmind-ipc-api.ts`)  
**Implementer**: `packages/overmind` (`OvermindService` + connection handler)  
**Transport**: kkrpc over named pipe (Windows) or Unix socket

## Current (implemented)

### `getStats(request: GetStatsRequest): Promise<GetStatsResponse>`

**Request**: `{}`

**Response**:

```typescript
{
  uptime: number;              // seconds
  runningCerebrateCount: number;
  cerebrates: CerebrateStats[];
}
```

**Current behavior**: `runningCerebrateCount` is `0`; `cerebrates` is `[]`.

### `shutdown(request: ShutdownRequest): Promise<ShutdownResponse>`

**Request**: `{}` (shutdown initiated by client; service stops IPC server)

**Response**: `{ message: string }`

## Target (M2–M3)

### `startCerebrate(request: StartCerebrateRequest): Promise<StartCerebrateResponse>`

**Request**: `{ name: string }`  
**Response**: `{ name: string }`  
**Errors**: duplicate name, unknown cerebrate config, loader validation failure

### `stopCerebrate(request: StopCerebrateRequest): Promise<StopCerebrateResponse>`

**Request**: `{ name: string }`  
**Response**: confirmation payload per SDK type  
**Errors**: not running

### `sendCerebrateCommand(request: SendCerebrateCommandRequest): Promise<SendCerebrateCommandResponse>`

**Request**: `{ cerebrateName: string; command: string }`  
**Response**: `{ output: string }`

### `attach(request, eventSink): Promise<void>` (streaming)

**Request**: `AttachRequest` — `{ name?: string; historyPlaybackSize?: number }`

**Server events** (legacy-compatible):

- `attached({ name })`
- `output({ name, timestamp, data })`
- `terminate({ name })`

**Client method** (if required by kkrpc): `terminateAttach(event)` — ends stream.

**Constraints**: one active attach per connection.

## Versioning

Breaking changes require:

1. Bump `overmind-sdk` minor/major per semver
2. Update this contract and `sdk-client-api.md`
3. Integration tests in `overmind/src`
