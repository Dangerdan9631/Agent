# Data Model: Versioned Self-Contained Local CLI

## Local Install Bundle

Self-contained toolkit runtime copied into a project. Opaque to users except through version and path metadata.

**Location**: `.spec-n-roll/cli/`

**Fields** (logical, not all persisted):

- `bundleRoot`: Relative path `dist/` under cli root containing runnable artifacts.
- `cliEntry`: `dist/cli/index.js` — full CLI standalone bundle.
- `mcpEntry`: `dist/mcp/server.js` — MCP server standalone bundle.
- `templatesDir`: `dist/templates/` — copied toolkit templates for instantiate commands.
- `scriptsDir`: `dist/scripts/` — platform automation scripts used by workflow engine.
- `toolkitVersion`: Semver from bundled `package.json`.

**Validation Rules**:

- `cliEntry` and `mcpEntry` MUST exist and be readable after install/update completes.
- Bundle MUST NOT require paths outside `.spec-n-roll/cli/` at runtime (except Node runtime on host).
- Replacing the bundle MUST be atomic from the consumer's perspective (no half-written dist during init/update).

## Install Manifest

Persisted install metadata at `.spec-n-roll/cli/install.json`.

**Fields**:

- `toolkitVersion` (required, semver string): Pinned toolkit release for this project.
- `layoutVersion` (required, positive integer): Schema generation for local install layout; `1` for self-contained bundle model.
- `installedAt` (required, ISO 8601 date-time): Timestamp of last successful binary install.
- `installSource` (optional, enum): `global`, `registry`, or `linked-source` — provenance for display only.

**Removed fields** (legacy layout):

- `toolkitPackageRoot`: MUST NOT be present in layout v1; presence indicates legacy install pending migration.

**Validation Rules**:

- Written atomically on every successful `installProjectBinaries`.
- `toolkitVersion` MUST match `.spec-n-roll/cli/package.json` `version` field.
- `layoutVersion` MUST be `1` for self-contained bundles; unknown layout versions fail integrity check with upgrade guidance.

## Local Package Descriptor

Minimal npm-style descriptor at `.spec-n-roll/cli/package.json`.

**Fields**:

- `name` (required): MUST be `"spec-n-roll"`.
- `version` (required, semver): MUST match `install.json.toolkitVersion`.

**Validation Rules**:

- Enables `findToolkitPackageRoot()` and `readToolkitPackageVersion()` without external package roots.
- Updated whenever the bundle is replaced.

## Bin Entrypoints

Platform launchers at `.spec-n-roll/cli/bin/`.

**Entities**:

| File | Role |
|------|------|
| `spec-n-roll` | Primary CLI launcher → bundled `dist/cli/index.js` |
| `snr` | Short alias; same launcher body as `spec-n-roll` |
| `spec-n-roll-mcp` | MCP launcher → bundled `dist/mcp/server.js` |
| `*.cmd` (Windows) | Batch shims invoking adjacent launcher scripts |

**Validation Rules**:

- Launchers MUST resolve bundled entrypaths relative to `bin/` (e.g. `../dist/cli/index.js`).
- Launchers MUST NOT read `toolkitPackageRoot` from manifest.
- CLI launchers set `SPEC_N_ROLL_LOCAL_PIN=1` in child environment.
- MCP launchers do not set local pin unless required by existing MCP contracts.
- Unix launchers MUST be executable (`0o755`).

## Dispatcher Delegation (unchanged interface)

**Fields** (from existing model):

- `resolvedTarget`: `local` | `global`
- `localBinaryPath`: Absolute path to `.spec-n-roll/cli/bin/spec-n-roll` (or `.cmd`)
- `forceGlobal`: From `--global` flag

**Validation Rules**:

- Walk-up from `cwd` unchanged.
- Delegation spawns `localBinaryPath` with forwarded argv; no in-process import of bundle.
- Integrity validation runs after local path found; failure → error, no silent global fallback.

## Install Integrity Status

Ephemeral validation result before spawn.

**Fields**:

- `status`: `valid` | `invalid`
- `missingPaths`: Array of expected relative paths not found
- `layoutVersion`: Detected layout from manifest or heuristic

**Validation Rules**:

- Required paths: `bin/spec-n-roll`, `dist/cli/index.js`, `dist/mcp/server.js`, `package.json`, `install.json`.
- Legacy detection: `install.json.toolkitPackageRoot` present → `invalid` with reason `legacy-layout`.

## Relationships

```text
Dispatcher
  └─(spawn)→ Bin Entrypoint (spec-n-roll)
                └─(spawn)→ Local Install Bundle.cliEntry
                              └─ uses → templatesDir, scriptsDir
                              └─ version from → Local Package Descriptor

Agent MCP Config
  └─(stdio)→ Bin Entrypoint (spec-n-roll-mcp)
                └─(spawn)→ Local Install Bundle.mcpEntry

init / update / manage-local update
  └─ writes → Install Manifest + Local Package Descriptor + Bin Entrypoints + Local Install Bundle
```

## State Transitions

### Project local install lifecycle

```text
[none]
  │ init / re-install
  ▼
[installed-v1-bundle]
  │ update / manage-local binary update (target version B)
  ▼
[installed-v1-bundle @ version B]

[installed-v1-bundle]
  │ remove
  ▼
[none]

[legacy-wrapper]
  │ update / manage-local binary update / init --force binaries
  ▼
[installed-v1-bundle]
```
