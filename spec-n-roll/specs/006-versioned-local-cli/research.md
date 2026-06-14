# Research: Versioned Self-Contained Local CLI

## Decision: Bundle full CLI and MCP runtime into `.spec-n-roll/cli/dist/`

**Rationale**: The current local install writes thin launchers that read `install.json` and spawn `dist/cli/index.js` from an external `toolkitPackageRoot`. That couples every project to a global or linked toolkit package and breaks reproducibility when the global install moves or upgrades. Copying a complete runtime tree into the project satisfies FR-001, FR-003, FR-010, and SC-004 while preserving the existing dispatcher resolution path (`.spec-n-roll/cli/bin/spec-n-roll`).

**Alternatives considered**:

- Keep wrappers but copy only `dist/` without dependencies: rejected because Node ESM resolution still requires `node_modules` beside the bundle unless dependencies are inlined.
- Symlink to global `dist/`: rejected because upgrades/removals of the global package break the local install (violates SC-002).
- Commit only launchers and download runtime on first use: rejected because offline/git-clone scenarios require a runnable install without network (spec edge case: version-controlled local install).

## Decision: Produce standalone bundles via tsup with dependencies inlined for local install artifacts

**Rationale**: Global npm publish continues to use the current split layout (`dispatcher.js`, `index.js`, `server.js` with external `node_modules`). A separate build step (or tsup config variant) emits **local-install bundles** — `dist/cli/index.js` and `dist/mcp/server.js` with `noExternal` — plus copied `templates/` and `scripts/`. The global package build copies these into a `dist/local-bundle/` staging directory that `installProjectBinaries` mirrors into projects. This keeps the dispatcher lightweight while local installs are self-contained.

**Alternatives considered**:

- Copy global `node_modules` subset into each project: rejected because footprint is larger, platform-specific native modules complicate cross-machine clones, and pruning is fragile.
- Use `npm pack` / extract tarball per project: rejected because install time requires network/registry and duplicates npm’s global layout concerns.
- Single bundle for CLI+MCP combined: rejected because MCP and CLI remain separate entrypoints per existing agent config contract.

## Decision: Local install layout with in-tree `package.json` for version discovery

**Rationale**: `readToolkitPackageVersion()` and `findToolkitPackageRoot()` walk upward from the executed script to a `package.json` with `name: "spec-n-roll"`. Placing a minimal `package.json` (name + version) at `.spec-n-roll/cli/package.json` lets existing version reporting work when the full CLI runs from `.spec-n-roll/cli/dist/cli/index.js` without code paths that read external roots. `install.json` records install metadata; it no longer stores `toolkitPackageRoot` as an execution target.

**Alternatives considered**:

- Embed version only in `install.json` and branch all version readers: rejected because it spreads special cases across `version.ts`, Ink read-models, and tests.
- Hard-code version in launcher scripts: rejected because it duplicates source of truth and breaks on partial updates.

## Decision: Thin bin launchers spawn in-tree bundled entrypoints only

**Rationale**: Platform entrypoints remain at `.spec-n-roll/cli/bin/spec-n-roll` (+ `.cmd` on Windows) so dispatcher walk-up and MCP agent config paths stay stable (FR-005, FR-011). Launcher bodies resolve `../dist/cli/index.js` and `../dist/mcp/server.js` relative to the bin directory, set `SPEC_N_ROLL_LOCAL_PIN=1`, and forward argv. Windows `.cmd` shims invoke the Unix-style launcher beside them. This satisfies the spec allowance for thin platform adapters while ensuring execution never leaves the project tree.

**Alternatives considered**:

- Copy `index.js` directly into `bin/` as the entrypoint: rejected because it collides with multiple names (`snr`, `spec-n-roll`) and complicates MCP separation.
- Use `node --import` preload hooks: rejected as unnecessary complexity with no user benefit.

## Decision: Dispatcher unchanged in resolution contract; compatibility is process-spawn based

**Rationale**: The dispatcher already exec's the local binary as a separate process without importing full CLI code. Local version skew tolerance (FR-006) is achieved by keeping the **delegation interface** stable: same relative bin path, same argv forwarding, same stdio inheritance, same `--global` bypass. The dispatcher does not parse local `install.json` or bundle layout. Cross-major local installs may fail inside the spawned local process with a clear message; the dispatcher’s job ends at successful spawn or actionable exec error (FR-013).

**Alternatives considered**:

- Dispatcher reads local version and blocks delegation: rejected because it couples dispatcher releases to every historical bundle layout and violates “works with any version” within the spawn contract.
- In-process import of local bundle: rejected per existing architecture (001 research).

## Decision: `installProjectBinaries` copies staged local bundle atomically

**Rationale**: `init`, `update`, and manage-local “Update Spec N' Roll” all call `installProjectBinaries(projectRoot, toolkitRoot)`. Refactor this to: (1) resolve the staged bundle directory from `toolkitRoot` (e.g. `dist/local-bundle/`), (2) replace `.spec-n-roll/cli/dist/` and refresh `bin/` launchers + `package.json` + `install.json`, (3) verify required files exist before completing. Use existing `atomicWriteJson` for manifests and sequential directory replace (delete `dist/` then copy) within the managed cli subtree.

**Alternatives considered**:

- rsync/hard-link from global install: rejected on Windows and when global package is absent (SC-002).
- Per-file diff on update: rejected because bundle is treated as an opaque versioned artifact; full replace is simpler and safer.

## Decision: Migrate legacy wrapper installs on next init/update

**Rationale**: Existing projects have `install.json` with `toolkitPackageRoot`. Detection: presence of `toolkitPackageRoot` field OR launcher source containing that field name. Migration path: treat as “needs re-bundle”; `update` and manage-local binary update replace with self-contained layout. No silent continued use of external roots.

**Alternatives considered**:

- Support both layouts indefinitely: rejected because it perpetuates the coupling this feature removes.
- Fail hard on legacy layout: rejected because it breaks existing fixtures until migrated; automatic migration on update is smoother.

## Decision: Install integrity validation before dispatcher delegation

**Rationale**: FR-013 requires clear errors when local install is corrupt. Add `validateLocalInstall(projectRoot)` checking: bin entry exists, bundled `dist/cli/index.js` and `dist/mcp/server.js` exist, `package.json` and `install.json` present. Dispatcher calls validation after finding local bin; on failure return error result (not silent global fallback). Local launcher may double-check before spawn for direct invocations.

**Alternatives considered**:

- Lazy failure on first missing import: rejected because error messages would be opaque Node module errors.
- Checksum verification of every file: deferred as overkill for v1; presence checks suffice.

## Decision: Update `collectLauncherBinaryUpdates` to track launcher templates only; bundle refresh via `installProjectBinaries`

**Rationale**: `update` dry-run currently lists launcher files from `collectLauncherBinaryUpdates`. After bundling, toolkit-owned updates split into: (a) launcher script content in `bin/`, (b) opaque bundle directory replaced by `installProjectBinaries`. Dry-run summary should list `.spec-n-roll/cli/dist/` as a single logical “runtime bundle” entry plus individual launcher paths.

**Alternatives considered**:

- List every bundled chunk file in dry-run: rejected as noisy; operators care that runtime is refreshed.

## Decision: Version-controlled local installs include bundle; document optional gitignore

**Rationale**: Spec edge case: clone repo → runnable without re-init. Therefore default init does not add `.spec-n-roll/cli/dist/` to gitignore. Document in quickstart that teams may gitignore the bundle if they prefer `init`/`update` after clone (trade reproducibility vs repo size). Target bundle size: low single-digit MB with inlined deps (acceptable per spec assumptions).

**Alternatives considered**:

- Always gitignore bundle and require post-clone init: rejected because it contradicts the spec edge case unless init is zero-config automatic (not requested).

## Decision: `findToolkitPackageRoot` gains fallback for `.spec-n-roll/cli` layout

**Rationale**: When walking from `dist/cli/index.js` inside a project bundle, the nearest `spec-n-roll` package.json is at `.spec-n-roll/cli/package.json`, not the repository root. Existing walk-up logic already finds the first matching package name; placing the minimal package.json at the cli root is sufficient without algorithm changes. Global installs continue to resolve to npm package root.

**Alternatives considered**:

- Special-case `.spec-n-roll` path segment in `findToolkitPackageRoot`: deferred unless minimal package.json placement proves insufficient in implementation.
