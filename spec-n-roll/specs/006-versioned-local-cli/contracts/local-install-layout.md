# Contract: Self-Contained Local Install Layout

Defines the on-disk layout for project-local toolkit binaries after feature 006. Supersedes the wrapper + `toolkitPackageRoot` model from feature 001 for **execution**; dispatcher resolution paths are unchanged.

## Directory Layout

```text
.spec-n-roll/cli/
├── install.json          # Install manifest (layout v1)
├── package.json          # Minimal descriptor: name + version
├── bin/
│   ├── spec-n-roll       # CLI launcher (Unix)
│   ├── snr               # CLI alias launcher (Unix)
│   ├── spec-n-roll-mcp   # MCP launcher (Unix)
│   ├── spec-n-roll.cmd   # Windows shim → spec-n-roll
│   ├── snr.cmd
│   └── spec-n-roll-mcp.cmd
└── dist/
    ├── cli/
    │   └── index.js      # Standalone full CLI bundle (+ .map optional)
    ├── mcp/
    │   └── server.js     # Standalone MCP bundle (+ .map optional)
    ├── templates/        # Copied from toolkit templates
    └── scripts/          # Copied platform scripts (.sh, .ps1)
```

## Install Manifest (`install.json`)

See `install-manifest.schema.json`. Required fields:

- `toolkitVersion`: Semver string
- `layoutVersion`: Integer; MUST be `1` for this layout
- `installedAt`: ISO 8601 timestamp

MUST NOT include `toolkitPackageRoot`.

## Launcher Behavior

### CLI launcher (`bin/spec-n-roll`, `bin/snr`)

1. Resolve `bundleEntry = path.join(binDir, '..', 'dist', 'cli', 'index.js')`.
2. Verify `bundleEntry` exists; if missing, exit `1` with message naming the path and suggesting `spec-n-roll update`.
3. `spawnSync(node, [bundleEntry, ...argv.slice(2)], { stdio: 'inherit', env: { ...env, SPEC_N_ROLL_LOCAL_PIN: '1' } })`.
4. Exit with child status.

### MCP launcher (`bin/spec-n-roll-mcp`)

Same as CLI except:

- `bundleEntry = ../dist/mcp/server.js`
- Do not set `SPEC_N_ROLL_LOCAL_PIN` unless an existing MCP contract requires it.

### Windows `.cmd` shims

Invoke `node "%DP0%spec-n-roll" %*` (or mcp equivalent) — unchanged pattern, but underlying launcher targets in-tree bundle.

## Install Operations

### `installProjectBinaries(projectRoot, toolkitRoot)`

**Preconditions**: Staged bundle exists at `{toolkitRoot}/dist/local-bundle/` (build output).

**Effects**:

1. Ensure `.spec-n-roll/cli/bin/` exists.
2. Remove existing `.spec-n-roll/cli/dist/` if present.
3. Copy staged bundle contents into `.spec-n-roll/cli/dist/`.
4. Write `package.json` and `install.json` at cli root.
5. Write launcher scripts to `bin/`.
6. Set executable bits on Unix launchers.

**Postconditions**: Integrity validation passes.

### Legacy migration

When `install.json` contains `toolkitPackageRoot` OR launcher source references `toolkitPackageRoot`:

- `update` and manage-local binary update MUST run full `installProjectBinaries` to replace layout.
- Direct invocation of legacy launchers SHOULD fail integrity check with message: run `spec-n-roll update`.

## Integrity Check

`validateLocalInstall(cliRoot)` returns valid when all exist:

- `install.json` with `layoutVersion === 1`
- `package.json` with `name === "spec-n-roll"`
- `dist/cli/index.js`
- `dist/mcp/server.js`
- `bin/spec-n-roll`

Dispatcher calls integrity check after walk-up finds local bin; invalid → error exit, no global fallback.

## Version Reporting

When full CLI runs from `dist/cli/index.js`:

- `readToolkitPackageVersion()` resolves `.spec-n-roll/cli/package.json`.
- `invocation: local` when `SPEC_N_ROLL_LOCAL_PIN=1` or executed path matches local bin delegation chain.
- `localCliPath` remains absolute path to `bin/spec-n-roll` (dispatcher contract unchanged).

## Agent MCP Config

MCP config MUST continue to reference `.spec-n-roll/cli/bin/spec-n-roll-mcp` (stdio). No change to agent config merge rules from feature 001.

## Update Dry-Run Reporting

`spec-n-roll update --dry-run` MUST list:

- `.spec-n-roll/cli/dist/` (runtime bundle replacement)
- Each launcher under `.spec-n-roll/cli/bin/` when launcher template changed
