# Quickstart: Overmind baseline (001-current-application-state)

**Audience**: Developers validating the canonical service, CLI, and SDK workspace.

## Prerequisites

- Node.js 24+
- Repository built: `cd overmind/src && npm install && npm run build`

## 1. Prepare config directory

```bash
mkdir -p ./my-overmind-config
```

Expected after first successful `start`:

- `my-overmind-config/overmind-config.yaml`
- `my-overmind-config/cerebrates/hello/cerebrate-config.yaml`

## 2. Start the service

```bash
cd overmind/src
node packages/overmind-cli/dist/bin.js start --config-dir ../my-overmind-config
```

Expected: log line indicating service started; process remains running in background.
Running the same command again against the same config dir should now fail with an
"already running" error instead of spawning a duplicate service.

## 3. Check stats

```bash
node packages/overmind-cli/dist/bin.js stats --config-dir ../my-overmind-config
```

Expected:

- Uptime in seconds (> 0)
- Running cerebrates count and summary fields from the service

## 4. Shut down cooperatively

```bash
node packages/overmind-cli/dist/bin.js shutdown --config-dir ../my-overmind-config
```

Expected: shutdown message; subsequent `stats` fails to connect after the service
finishes closing its IPC server.

## 5. Force shutdown (if stale process)

```bash
node packages/overmind-cli/dist/bin.js shutdown --force --config-dir ../my-overmind-config
```

Use when IPC is unavailable but an orphaned `overmind-service` node process remains.

## 6. Cerebrate commands

Verify the full canonical control surface:

```bash
node packages/overmind-cli/dist/bin.js start --config-dir ../my-overmind-config
node packages/overmind-cli/dist/bin.js start-cerebrate hello --config-dir ../my-overmind-config
node packages/overmind-cli/dist/bin.js stats --config-dir ../my-overmind-config
node packages/overmind-cli/dist/bin.js send-command hello "echo test" --config-dir ../my-overmind-config
# Terminal A:
node packages/overmind-cli/dist/bin.js attach hello --config-dir ../my-overmind-config
# Terminal C (service/global logs, no cerebrate name):
node packages/overmind-cli/dist/bin.js attach --config-dir ../my-overmind-config
# Terminal B: send-command as above
node packages/overmind-cli/dist/bin.js stop-cerebrate hello --config-dir ../my-overmind-config
node packages/overmind-cli/dist/bin.js shutdown --config-dir ../my-overmind-config
```

Expected:

- `attach hello` replays recent `hello` output and then follows the live stream
- unnamed `attach` follows service/global log output, matching the legacy implementation

## Environment variable

```bash
export OVERMIND_CONFIG_DIR=/absolute/path/to/my-overmind-config
node packages/overmind-cli/dist/bin.js stats
```

## npm link (optional)

```bash
cd overmind/src/packages/overmind && npm link
cd ../overmind-cli && npm link
overmind --help
overmind-service
```

## Related docs

- [spec.md](./spec.md) — baseline requirements and gap matrix
- [plan.md](./plan.md) — implementation record and cleanup notes
- [README.md](../../README.md) — workspace overview
