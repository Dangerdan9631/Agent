# Contract: CLI Commands (`overmind`)

**Binary**: `overmind-cli` → `overmind`  
**Invocation**: `node packages/overmind-cli/dist/bin.js <command> [options]`  
**Global options**: per-command `--config-dir <path>` (or `OVERMIND_CONFIG_DIR`)

## Commands

| Command | Arguments | Options | SDK call | Status |
|---------|-----------|---------|----------|--------|
| `start` | — | `--config-dir` | `start({})` | Working |
| `shutdown` | — | `--config-dir`, `--force` | `shutdown({ force })` | Working |
| `stats` | — | `--config-dir` | `getStats({})` | Working (empty cerebrates) |
| `start-cerebrate` | `<name>` | `--config-dir` | `startCerebrate({ name })` | Stub |
| `stop-cerebrate` | `<name>` | `--config-dir` | `stopCerebrate({ name })` | Stub |
| `send-command` | `<cerebrate> <command...>` | `--config-dir` | `sendCerebrateCommand` | Stub |
| `attach` | `[name]` | `--config-dir` | `attach({ name, historyPlaybackSize: 100 })` | Stub |

## Output conventions

- **stderr**: errors and logs via SDK `Logger`
- **stdout**: human-readable stats (chalk) for `stats`; attach streams output lines with timestamp prefix
- Exit code `0` on success, `1` on failure

## Thin CLI rule

Commands MUST NOT:

- Load cerebrate YAML directly
- Implement state machines
- Open IPC sockets except via `OvermindApiFactory`
