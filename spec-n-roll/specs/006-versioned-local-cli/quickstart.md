# Quickstart: Versioned Self-Contained Local CLI

Validation guide for feature 006. Assumes repository built (`npm run build`) and tests runnable (`npm test`).

## Prerequisites

- Node.js 20+
- Built toolkit with `dist/local-bundle/` staging output (after implementation)
- Global dispatcher available at `dist/cli/dispatcher.js` for delegation tests

## Scenario 1: Init produces self-contained install (SC-004)

**Goal**: Verify local install contains bundled runtime, not external-root wrappers.

```bash
# From repo root after build
npm test -- tests/integration/quickstart-scenarios.test.ts -t "self-contained"
```

**Manual check** (temp project):

1. Run `spec-n-roll init` in an empty directory.
2. Confirm `.spec-n-roll/cli/dist/cli/index.js` exists.
3. Confirm `.spec-n-roll/cli/install.json` has `layoutVersion: 1` and no `toolkitPackageRoot`.
4. `grep -r toolkitPackageRoot .spec-n-roll/cli/bin/` returns no matches.

**Expected**: Launchers spawn in-tree bundle; version command reports `invocation: local`.

## Scenario 2: Dispatcher delegates to pinned local version (SC-001, SC-003)

**Goal**: Global dispatcher runs project's bundled version.

```bash
npm test -- tests/integration/quickstart-scenarios.test.ts -t "dispatcher exec local"
```

**Extended** (two-project fixture after implementation):

1. Init project A and project B from different toolkit builds/versions.
2. From each root: `node <dispatcher> version`.
3. Verify each stdout shows distinct `toolkit version` matching that project's `install.json`.

**Expected**: 100% correct version per project root.

## Scenario 3: Local install survives without global full CLI (SC-002)

**Goal**: Project commands work when only dispatcher is on PATH.

1. Init a project with bundled layout.
2. Invoke via dispatcher: `spec-n-roll version`, `spec-n-roll init --help`.
3. Invoke MCP launcher exists: `.spec-n-roll/cli/bin/spec-n-roll-mcp` (smoke: process starts).

**Automated** (after implementation):

```bash
npm test -- tests/integration/local-bundle-isolation.test.ts
```

**Expected**: Commands succeed without reading from global toolkit package root.

## Scenario 4: Project upgrade replaces bundle (SC-006)

1. Init project at version A (record `install.json.toolkitVersion`).
2. Build toolkit at version B.
3. Run `spec-n-roll update` from project.
4. Verify `toolkitVersion` updated, `dist/` replaced, smoke commands pass.

```bash
npm test -- tests/integration/local-bundle-upgrade.test.ts
```

## Scenario 5: Legacy wrapper migration

1. Use fixture with legacy `install.json` containing `toolkitPackageRoot`.
2. Run `spec-n-roll update`.
3. Verify layout v1 bundle present; dispatcher delegation works.

```bash
npm test -- tests/integration/legacy-install-migration.test.ts
```

## Scenario 6: Corrupt install fails clearly (FR-013)

1. Init project; delete `.spec-n-roll/cli/dist/cli/index.js`.
2. Run dispatcher from project root without `--global`.

**Expected**: Non-zero exit; message mentions incomplete install and suggests `update`; no silent global fallback.

## Scenario 7: Manage-local binary update

1. Open interactive local home → Manage → Update Spec N' Roll.
2. Confirm bundle refreshed from global toolkit staging without changing workflow config.

```bash
npm test -- tests/integration/interactive-local-home.test.ts -t "manage"
```

## Unit tests

```bash
npm test -- tests/unit/cli/local-binaries.test.ts
npm test -- tests/unit/cli/local-install-integrity.test.ts
npm test -- tests/unit/cli/dispatcher-integrity.test.ts
```

Covers: launcher source generation, bundle copy logic, integrity validation, legacy detection.

## Contracts

- Layout: `contracts/local-install-layout.md`
- Manifest schema: `contracts/install-manifest.schema.json`
- Dispatcher amendment: `contracts/dispatcher-delegation.md`
- Data model: `data-model.md`

## Git / clone note

Bundled `dist/` under `.spec-n-roll/cli/` is intended to be committable for reproducible clones. Teams may gitignore it if they accept running `init` or `update` after clone.
