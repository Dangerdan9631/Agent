# Quickstart: Overmind baseline (001-current-application-state)

**Audience**: Developers validating service + CLI scaffolding before cerebrate migration.

## Prerequisites

- Node.js 24+
- Repository built: `cd overmind/src && npm install && npm run build`

## 1. Prepare config directory

```bash
mkdir -p ./my-overmind-config
```

> **Note**: Automatic `overmind-config.yaml` creation is planned (M1). Until then,
> ensure the directory exists and will receive config files when bootstrap lands.

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
- Running cerebrates: `0` (until M3)

## 4. Shut down cooperatively

```bash
node packages/overmind-cli/dist/bin.js shutdown --config-dir ../my-overmind-config
```

Expected: shutdown message; subsequent `stats` fails to connect.

## 5. Force shutdown (if stale process)

```bash
node packages/overmind-cli/dist/bin.js shutdown --force --config-dir ../my-overmind-config
```

Use when IPC is unavailable but a orphaned `overmind-service` node process remains.

## 6. Cerebrate commands (post-M4)

After migration milestones M2–M4, verify:

```bash
node packages/overmind-cli/dist/bin.js start --config-dir ../my-overmind-config
node packages/overmind-cli/dist/bin.js start-cerebrate hello --config-dir ../my-overmind-config
node packages/overmind-cli/dist/bin.js stats --config-dir ../my-overmind-config
node packages/overmind-cli/dist/bin.js send-command hello "echo test" --config-dir ../my-overmind-config
# Terminal A:
node packages/overmind-cli/dist/bin.js attach hello --config-dir ../my-overmind-config
# Terminal B: send-command as above
node packages/overmind-cli/dist/bin.js stop-cerebrate hello --config-dir ../my-overmind-config
node packages/overmind-cli/dist/bin.js shutdown --config-dir ../my-overmind-config
```

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
- [plan.md](./plan.md) — milestones M0–M5
- [README.md](../../README.md) — workspace overview
