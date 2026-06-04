# Contract: SDK Client API (`OvermindApi`)

**Package**: `overmind-sdk`  
**Entry**: `OvermindApiFactory.create(configDir?)` → `OvermindApi`

## Factory

```typescript
class OvermindApiFactory {
  create(configDir: string | undefined): OvermindApi;
}
```

**Config resolution order**:

1. Argument to `create()`
2. Environment variable `OVERMIND_CONFIG_DIR`
3. Error if still unset (`missingConfigDirError`)

## Operations

| Method | Request | Response | Implementation location |
|--------|---------|----------|-------------------------|
| `start` | `StartRequest` | `StartResponse` | `StartOperation` — spawns `overmind-service` binary |
| `shutdown` | `ShutdownRequest` (`force?: boolean`) | `ShutdownResponse` | `ShutdownOperation` — IPC or process kill |
| `getStats` | `GetStatsRequest` | `GetStatsResponse` | `OvermindIpcClient` |
| `startCerebrate` | `StartCerebrateRequest` | `StartCerebrateResponse` | IPC (stub today) |
| `stopCerebrate` | `StopCerebrateRequest` | `StopCerebrateResponse` | IPC (stub today) |
| `sendCerebrateCommand` | `SendCerebrateCommandRequest` | `SendCerebrateCommandResponse` | IPC (stub today) |
| `attach` | `AttachRequest` | `AttachChannel` | IPC streaming (stub today); omit `name` for service/global logs |

## AttachChannel (client)

```typescript
interface AttachChannel {
  onAttached(listener): () => void;
  onOutput(listener): () => void;
  onTerminate(listener): () => void;
  onError(listener): () => void;
  terminate(event): Promise<void>;
  listen(): Promise<void>;
}
```

CLI `attach` command uses `onOutput` + `listen()` until terminate. `AttachRequest.name`
remains optional so the same channel can target either a named cerebrate stream or the
service/global log output.

## Dependency rules

- Consumers: `overmind-cli`, future UI, future MCP
- MUST NOT import `packages/overmind` service internals
- Service MUST NOT import `overmind-cli`
