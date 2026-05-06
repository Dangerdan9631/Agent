# Overmind

Overmind is a local TypeScript workspace for a scaffold service, a CLI client, and shared API types. The CLI communicates with the service over IPC.

## Packages

| Package | Purpose |
|---|---|
| `overmind-api` | Shared request and response types. |
| `overmind-service` | IPC service process and service implementation. |
| `overmind-cli` | `overmind` command for starting and controlling the service. |

## Configuration

The service requires a **config directory** passed on startup:

```bash
node packages/cli/dist/bin.js start --config-dir /path/to/overmind-config
```

On first start, Overmind creates:

- `overmind-config.yaml` – service settings (minimum: `version: 1`)
- `cerebrates/hello/cerebrate-config.yaml` – example cerebrate (description, responsibilities, commands)

Each cerebrate lives under `cerebrates/<name>/` with `cerebrate-config.yaml`. Only one running instance is allowed per name.

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
node packages/cli/dist/bin.js --help
node packages/cli/dist/bin.js start --config-dir ./my-overmind-config
node packages/cli/dist/bin.js start-cerebrate hello
node packages/cli/dist/bin.js send-command hello hello
node packages/cli/dist/bin.js attach hello   # streams command output (use another terminal with send-command)
node packages/cli/dist/bin.js stats
node packages/cli/dist/bin.js shutdown
```

Make the local commands available on your PATH while developing:

```bash
cd overmind/src/packages/service
npm link

cd ../cli
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
| `npm run build` | Build API, service, and CLI packages. |
| `npm test` | Run the unit test suite. |
| `npm run lint` | Run ESLint over workspace packages. |
| `npm run clean` | Remove package `dist` directories. |
