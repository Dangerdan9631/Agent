# Overmind

Overmind is a local TypeScript workspace for a service process, a CLI client, and
a shared SDK. The CLI talks to the service over IPC via `overmind-sdk`.

## Packages

Only these workspace packages are canonical (see `.specify/memory/constitution.md`):

| Directory | npm name | Purpose |
|-----------|----------|---------|
| `packages/overmind` | `overmind-service` | IPC service process and cerebrate runtime |
| `packages/overmind-cli` | `overmind-cli` | `overmind` command for starting and controlling the service |
| `packages/overmind-sdk` | `overmind-sdk` | Shared types, IPC client, and programmatic API |

Legacy packages (`api`, `cli`, `core`, `service` under `packages/`) are deprecated
and must not be used for new work.

## Configuration

The service currently requires an existing **config directory** passed on startup:

```bash
node packages/overmind-cli/dist/bin.js start --config-dir /path/to/overmind-config
```

Automatic bootstrap of `overmind-config.yaml` and `cerebrates/hello/cerebrate-config.yaml`
is planned but not implemented in the canonical service yet. For now, create the
directory yourself before running `start`.

Each cerebrate will live under `cerebrates/<name>/` with `cerebrate-config.yaml`.
Only one running instance is allowed per name.

## Development

Use Node.js 24 LTS or newer.

```bash
cd overmind/src
npm install
npm run build
npm test
```

Run the CLI locally without installing it globally:

```bash
node packages/overmind-cli/dist/bin.js --help
node packages/overmind-cli/dist/bin.js start --config-dir ./my-overmind-config
node packages/overmind-cli/dist/bin.js start-cerebrate hello
node packages/overmind-cli/dist/bin.js send-command hello hello
node packages/overmind-cli/dist/bin.js attach hello   # streams command output (use another terminal with send-command)
node packages/overmind-cli/dist/bin.js stats
node packages/overmind-cli/dist/bin.js shutdown
```

Make the local commands available on your PATH while developing:

```bash
cd overmind/src/packages/overmind
npm link

cd ../overmind-cli
npm link

overmind --help
overmind-service
```

After changing source code, rebuild from `overmind/src`:

```bash
npm run build
```

Remove the global development links when you are done:

```bash
npm unlink -g overmind-cli
npm unlink -g overmind-service
```

## Useful Scripts

Run these from `overmind/src`.

| Command | Description |
|---|---|
| `npm run build` | Build SDK, service, and CLI packages. |
| `npm test` | Run the unit test suite. |
| `npm run lint` | Run ESLint over workspace packages. |
| `npm run clean` | Remove package `dist` directories. |
