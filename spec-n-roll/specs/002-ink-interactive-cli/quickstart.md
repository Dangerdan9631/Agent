# Quickstart: Interactive Ink CLI Validation

End-to-end validation scenarios for the interactive application. Links to `contracts/interactive-app.md`, `contracts/cli-operation-map.md`, and `data-model.md` for structure details — this guide focuses on runnable checks.

## Prerequisites

- Node.js 20+
- npm
- Built toolkit: `npm install && npm run build && npm link`
- Familiarity with base toolkit quickstart: `specs/001-spec-n-roll-toolkit/quickstart.md`

## Scenario 1: Bare Launch Opens Interactive App

```powershell
mkdir tmp-interactive-launch
cd tmp-interactive-launch
spec-n-roll
```

Expected outcomes:

- Ink UI renders (not Commander help text)
- First screen offers initialize or quit when project is uninitialized (SC-005)
- Status bar shows current directory as project root
- Press `q` — application exits cleanly with code 0

## Scenario 2: Subcommands Remain Non-Interactive

From the same uninitialized directory:

```powershell
spec-n-roll init --help
spec-n-roll version
```

Expected outcomes:

- Help and version output print to stdout and exit synchronously
- Ink application does not open

## Scenario 3: Browse Task Specs in Initialized Project

```powershell
cd <initialized-project-with-multiple-specs>
spec-n-roll
```

Using keyboard only:

1. Select **Task Specs** from main menu
2. Verify list shows id, slug, lifecycle status, and step summary for each recognized directory
3. Select one spec → detail view shows workflow state and artifact presence
4. Press `b` or `Esc` → return to list, then main menu

Expected outcomes:

- Locate any spec within 30 seconds in a project with ≤20 specs (SC-001)
- Unrecognized `specs/` directories appear in a warning section with labels
- No files modified during browse-only navigation (SC-006)

## Scenario 4: Task Status Change Parity

In an initialized project with an Active task spec:

**Interactive path**:

1. Open app → Task Specs → select Active spec → Mutations → Set lifecycle status → Complete
2. Confirm when prompted if applicable

**CLI path** (fresh copy of same fixture state):

```powershell
spec-n-roll task status set Complete --task-spec-id <id>
```

Expected outcomes:

- `spec.md` frontmatter `status` field is byte-identical between both paths (SC-003)

## Scenario 5: Agent Add/Remove Parity

**Interactive**: Agents → Add → select agent via Ink prompt → complete

**CLI**:

```powershell
spec-n-roll config agent add <agentId>
```

Then **interactive** remove with confirmation vs:

```powershell
spec-n-roll config agent remove <agentId>
```

Expected outcomes:

- `workflow.config.json`, agent rules, and MCP config match CLI outcomes
- Remove requires explicit confirmation in interactive flow (FR-012)

## Scenario 6: Update with Confirmation

```powershell
spec-n-roll
```

Navigate: Setup / Maintenance → Update → preview summary → confirm

Compare to:

```powershell
spec-n-roll update
```

(with equivalent confirmations in non-interactive Ink prompt path)

Expected outcomes:

- Same files updated, backups created, and migration summary semantics as CLI `update`
- Dry-run preview available before apply when supported

## Scenario 7: Workflow and Agents Sections

In initialized project:

1. **Workflows** — lists papercut/quick/full (or configured variants) with step sequence summaries
2. **Agents** — toggle all vs configured-only; matches `spec-n-roll list agents` and `spec-n-roll list agents --enabled` output semantically

Expected outcomes:

- Workflow list matches `workflow.config.json` variants (FR-006)
- Agent configured filter matches enabled agents in project config (FR-007)

## Scenario 8: Project Metadata Read/Write

1. Project → view metadata (read-only)
2. Edit → change a field → save

Compare write to:

```powershell
spec-n-roll project metadata write --<equivalent-flags>
```

Expected outcomes:

- Read view matches `project metadata read` JSON semantics
- Write produces byte-identical `project-metadata.json` (SC-003)

## Scenario 9: Multi Active Task Spec Selection

Fixture: two or more Active task specs.

1. Initiate a mutation requiring a task spec without pre-selecting one
2. Verify numbered-list prompt appears
3. Select by number

Expected outcomes:

- No silent default selection (FR-011)
- Selected spec drives subsequent mutation

## Scenario 10: Keyboard Navigation Completeness

From main menu, using only arrow keys, Enter, and back:

- Visit each top-level section (specs, workflows, agents, project, setup)
- Return to main menu from each
- Invoke `?` to show key hints

Expected outcomes:

- All five sections reachable (FR-003)
- Focus indicator visible on list rows (User Story 4)
- Destructive actions show confirmation before writes

## Scenario 11: Error Recovery

1. Open spec detail for a spec with missing `workflow-state.json`
2. Verify warning displayed inline
3. Navigate back — session continues without crash (FR-014)

## Automated Test Commands

```powershell
npm test -- tests/unit/interactive
npm test -- tests/integration/interactive-cli-parity.test.ts
```

Expected outcomes:

- Navigation and read-model unit tests pass
- Parity integration tests pass for all operations in `cli-operation-map.md`
