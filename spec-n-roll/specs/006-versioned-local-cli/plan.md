# Implementation Plan: Versioned Self-Contained Local CLI

**Branch**: `006-versioned-local-cli` | **Date**: 2026-06-13 | **Spec**: `specs/006-versioned-local-cli/spec.md`

**Input**: Feature specification from `specs/006-versioned-local-cli/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Replace project-local thin launcher wrappers (that spawn from an external `toolkitPackageRoot`) with a **self-contained bundled runtime** under `.spec-n-roll/cli/dist/`, version-pinned per project via `install.json` and minimal `package.json`. Keep the global **dispatcher** as the sole PATH entry with unchanged walk-up resolution; add pre-spawn integrity validation. Extend the build pipeline to stage `dist/local-bundle/` for `init`, `update`, and manage-local binary refresh. Dispatcher delegates to any local bundle version via stable spawn contract (FR-006).

## Technical Context

**Language/Version**: TypeScript on Node.js 20+ (tsup target node24).

**Primary Dependencies**: Existing `tsup` build; `fs-extra` for directory copy; `semver` for version-skew tests; Vitest for unit/integration tests; Commander/dispatcher unchanged API surface.

**Storage**: On-disk layout under `.spec-n-roll/cli/` — `install.json` (layout v1), `package.json`, `bin/` launchers, `dist/` standalone bundles + templates/scripts.

**Testing**: Unit tests for launcher generation, bundle install, integrity validation, legacy detection; extend `quickstart-scenarios.test.ts`; new integration tests for isolation, upgrade, migration per `quickstart.md`.

**Target Platform**: Windows, macOS, Linux — preserve `.cmd` shims and executable bits.

**Project Type**: TypeScript CLI toolkit — build pipeline + `local-binaries` module + dispatcher integrity gate.

**Performance Goals**: Init/update binary copy completes in under 10s for typical bundle size on SSD; dispatcher delegation adds &lt;50ms vs current spawn path.

**Constraints**: Dispatcher MUST NOT import local bundle; global npm `dist/` layout unchanged for publish; MCP agent config paths unchanged; manage-local update continues to refresh binaries without touching workflow config.

**Scale/Scope**: Build script extension, `local-binaries.ts` refactor, new integrity module, dispatcher hook, update dry-run reporting, migration from legacy wrappers, test fixture updates.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Documentation Standards | New modules (`local-install-integrity`, bundle staging) get doc comments; update `src/cli/README.md` if present | PASS |
| II. Clean Code Is Part of Delivery | Replace wrapper string templates with layout-versioned launcher builder; single install orchestrator | PASS |
| III. Local Reasoning and Expressive Design | Integrity check, bundle copy, launcher build as separate functions | PASS |
| IV. Boundary Discipline | Build staging isolated in scripts; dispatcher only calls integrity adapter + spawn | PASS |
| V. Pre-1.0 API Design Freedom | Replace thin-wrapper compatibility with the intended self-contained local install API | PASS |
| VI. Test Discipline and Validation | Contracts + quickstart define unit/integration coverage for SC-001–SC-006 | PASS |

No justified violations.

## Project Structure

### Documentation (this feature)

```text
specs/006-versioned-local-cli/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── local-install-layout.md
│   ├── install-manifest.schema.json
│   └── dispatcher-delegation.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
tsup.config.ts                           # ADD local-bundle entries (bundled CLI + MCP)
scripts/
├── build-local-bundle.mjs               # NEW: stage dist/local-bundle/ from tsup + copy assets
└── copy-wrappers.mjs                    # invoke bundle staging after tsup

src/cli/
├── local-binaries.ts                    # REFACTOR: copy bundle, new launchers, manifest v1
├── local-install-integrity.ts           # NEW: validateLocalInstall, legacy detection
├── dispatcher.ts                        # ADD integrity check before spawn
└── commands/
    ├── init.ts                          # unchanged call site; behavior via installProjectBinaries
    ├── update.ts                        # dry-run lists bundle dir; migration on update
    └── version.ts                       # verify package.json resolution from local bundle

src/core/paths.ts                        # VERIFY findToolkitPackageRoot works from .spec-n-roll/cli

tests/
├── unit/cli/
│   ├── local-binaries.test.ts           # NEW/EXTEND: launcher + manifest + copy
│   ├── local-install-integrity.test.ts  # NEW
│   └── dispatcher-integrity.test.ts     # NEW
├── integration/
│   ├── quickstart-scenarios.test.ts     # EXTEND: self-contained assertions
│   ├── local-bundle-isolation.test.ts   # NEW (SC-002)
│   ├── local-bundle-upgrade.test.ts     # NEW (SC-006)
│   └── legacy-install-migration.test.ts # NEW
└── fixtures/
    └── legacy-wrapper-install/          # NEW: pre-006 install.json + wrappers
```

**Structure Decision**: Single-package CLI. No new top-level packages. Build pipeline produces a second artifact tree (`dist/local-bundle/`) consumed only by `installProjectBinaries`. Dispatcher and global publish layout remain separate from per-project bundle.

## Complexity Tracking

| Concern | Mitigation |
|---------|------------|
| Larger git footprint per project | Document tradeoff in quickstart; bundle is optional to commit |
| tsup bundle size / build time | Separate bundled targets only for local-bundle staging, not global dispatcher |
| Legacy projects with wrapper installs | Auto-migrate on `update`; integrity error with fix hint until migrated |
| `findToolkitPackageRoot` from bundled entry | Minimal `package.json` at `.spec-n-roll/cli/` |
| Version skew tests need multiple builds | Fixture projects with pre-staged bundle directories at different versions |

## Phase 0 Output

See `specs/006-versioned-local-cli/research.md`.

## Phase 1 Outputs

See:

- `specs/006-versioned-local-cli/data-model.md`
- `specs/006-versioned-local-cli/contracts/local-install-layout.md`
- `specs/006-versioned-local-cli/contracts/install-manifest.schema.json`
- `specs/006-versioned-local-cli/contracts/dispatcher-delegation.md`
- `specs/006-versioned-local-cli/quickstart.md`

## Post-Design Constitution Check

| Principle | Post-design status |
|-----------|-------------------|
| I. Documentation Standards | Contracts document layout; implementation modules will carry doc comments per AGENTS.md |
| II. Clean Code | Single install path; integrity extracted from dispatcher body |
| III. Local Reasoning | install → manifest → bundle → launchers is linear data flow |
| IV. Boundary Discipline | Build staging in scripts; runtime install in `local-binaries`; validation in `local-install-integrity` |
| V. Pre-1.0 API Design Freedom | Local install contract drops thin-wrapper compatibility in favor of self-contained bundles |
| VI. Test Discipline | quickstart maps scenarios to SC/FR ids; fixtures for legacy and multi-version |

All gates pass. Ready for `/speckit-tasks`.
