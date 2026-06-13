# Interactive Application Contract

The Ink application is the default entry point for bare `spec-n-roll` on the full CLI binary. It provides keyboard-first navigation and full parity with non-interactive CLI subcommands documented in `specs/001-spec-n-roll-toolkit/contracts/cli-commands.md`.

## Invocation

| Input | Behavior |
|-------|----------|
| `spec-n-roll` | Launch interactive Ink application |
| `spec-n-roll -v` / `--version` | Non-interactive version report (unchanged) |
| `spec-n-roll <subcommand> [args]` | Non-interactive Commander routing (unchanged) |
| `spec-n-roll --global` | Dispatcher/global flag handling unchanged before mode resolution |

The interactive application MUST NOT spawn when argv contains a recognized subcommand token after global-flag stripping.

## Top-Level Navigation (Main Menu)

| Key | Section | RouteId | Initialized required |
|-----|---------|---------|----------------------|
| 1 | Task Specs | `specs-list` | Recommended; empty state with guidance if not |
| 2 | Workflows | `workflows-list` | Yes |
| 3 | Agents | `agents-list` | Yes for configured view; bundled list always available |
| 4 | Project | `project-metadata-view` | Yes |
| 5 | Setup / Maintenance | `setup-menu` | Partial — init available when uninitialized |

Additional global keys on all screens:

| Key | Action |
|-----|--------|
| `q` | Quit application cleanly (no partial writes) |
| `Esc` / `b` | Back one navigation level |
| `?` | Toggle key hint overlay |

## Section Contracts

### Task Specs

**List (`specs-list`)**:

- Show recognized specs sorted by numeric id with columns: id, slug, lifecycle status, operational status, step summary
- Show unrecognized `specs/` directories in a separate warning section
- Enter on row → `spec-detail`

**Detail (`spec-detail`)**:

- Display workflow state, lifecycle status, artifact presence (spec/plan/tasks), warnings for mismatches
- Shortcuts to mutation submenu → `spec-mutations`

**Mutations (`spec-mutations`)**:

- Task status set, checkbox set, workflow state read/write, step instantiate, frontmatter update
- Each flow gathers required fields via forms/prompts then invokes mapped orchestrator (see `cli-operation-map.md`)

### Workflows

**List (`workflows-list`)**:

- Each configured variant: id, display name, ordered step sequence summary

**Detail (`workflow-detail`)**:

- Read-only expanded step list with labels

### Agents

**List (`agents-list`)**:

- Toggle filter: all bundled vs configured-only (equivalent to `list agents` / `list agents --enabled`)
- Columns: id, display name, configured indicator

**Add (`agent-add`)**:

- Reuse `add-agent-prompt.tsx` or multi-select variant; calls `runConfigAgentAdd`

**Remove (`agent-remove`)**:

- Select configured agent → explicit confirmation → `runConfigAgentRemove`

### Project

**View (`project-metadata-view`)**:

- Read-only display of `project-metadata.json` fields

**Edit (`project-metadata-edit`)**:

- Form for writable fields → `writeProjectMetadata` (same validation as CLI)

### Setup / Maintenance

**Menu (`setup-menu`)**:

| Item | Route | CLI equivalent |
|------|-------|----------------|
| Initialize project | `setup-init` | `init` |
| Version info | `setup-version` | `version` |
| Update toolkit | `setup-update` | `update` |

Project-scoped setup items (require initialized project + selected spec where noted) are reachable from spec mutations or setup menu as documented in `cli-operation-map.md`.

## Confirmation Requirements

The following MUST show an explicit confirmation step before invoking the orchestrator:

- Toolkit `update` (reuse `update-prompts.tsx`)
- `config agent remove`
- `workflow state write` when overwriting existing state
- Any flow that would overwrite toolkit-owned files

## Read-Only Guarantee

Screens with route ids ending in `-list`, `-detail`, `-view`, and `main-menu` MUST NOT call write orchestrators. Verified in tests (SC-006).

## Status Bar

Persistent footer on all screens showing:

- Current `projectRoot` (abbreviated when wider than terminal)
- Binary context: `local` / `global` based on the actually running full CLI binary
- Breadcrumb from `navigationStack`

## Error Handling

- Missing or invalid files: inline error + remediation text; user can navigate back
- Validation failures: same messages as non-interactive CLI (operational equivalence, not identical stdout formatting)
- Unrecoverable startup (Ink render failure): stderr message and non-zero exit

## Out of Scope

- Agent slash commands (`/spec-n-specify`, `/spec-n-roll`, etc.) — MAY appear as guidance text only
- Living spec Gherkin authoring
- Extension manifest editing beyond `config agent add/remove` side effects
- Mouse-only interaction

## Testing Contract

- Navigation tests: reach every top-level section and back to main menu using keyboard only
- Parity tests: each mutation in `cli-operation-map.md` produces byte-identical on-disk results to the CLI with equivalent inputs
- Uninitialized launch: first screen offers init or quit (SC-005)
