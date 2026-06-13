# Research: Interactive Ink CLI Application

## Decision: Bare `spec-n-roll` launches a dedicated Ink application shell

**Rationale**: FR-001 requires the interactive application as the default full-CLI entry point. The current `src/cli/index.ts` always constructs Commander and parses argv; when no subcommand is present Commander prints help and exits. The fix is an early branch: after version-flag handling and global-flag stripping, if argv has no recognized subcommand token, call `launchInteractiveApp()` instead of `program.parseAsync()`.

**Alternatives considered**:

- Subcommand named `interactive` or `ui`: rejected because the spec requires zero-argument launch.
- Detect TTY and fall back to help when piped: rejected — spec treats bare invocation as interactive regardless; non-interactive use always passes an explicit subcommand.

## Decision: Layered Ink architecture — shell, screens, read-models, shared components

**Rationale**: User stories separate browse (P1), mutate (P1), setup (P2), and keyboard navigation (P2). A single monolithic App component would mix routing, data loading, and forms. Splitting into `app/` (session + router), `screens/` (section UIs), `read-models/` (query assembly), and `components/` (reusable list/detail/confirm) matches Clean Code's one-level-of-abstraction rule and keeps each screen testable in isolation.

**Alternatives considered**:

- One screen file per CLI subcommand only: rejected because browse flows (spec list, workflow list) have no CLI subcommand twin as a primary screen.
- React Router dependency: rejected — navigation stack is shallow (menu → list → detail → form); a simple route enum + stack in React context is sufficient and avoids new dependencies.

## Decision: Read models live in `src/cli/ink/read-models/` and compose existing core/workflow queries

**Rationale**: `TaskSpecSummary`, `WorkflowVariantSummary`, and `AgentSummary` from the spec are display-oriented aggregates. `listTaskSpecDirectoryIdentities`, `readWorkflowState`, frontmatter parsers, and `resolveListedAgents` already exist or have close analogs in `src/core/` and `src/workflow/`. Read-model builders compose these without writing files.

**Alternatives considered**:

- New `src/interactive/` top-level package: rejected — YAGNI; interactive code is CLI presentation.
- Screens read files directly: rejected — duplicates parsing logic and violates single source for task spec identity rules.

## Decision: Mutations call existing `run*` orchestrators from `src/cli/commands/*`

**Rationale**: FR-009 and SC-003 require byte-equivalent outcomes to non-interactive CLI. Each command file already exports `runInit`, `runUpdate`, `runConfigAgentAdd`, `runConfigAgentRemove`, etc. Interactive screens gather inputs via Ink forms/prompts then invoke the same functions with `projectRoot: session.projectRoot`. Core-only operations (`readWorkflowState`, `setTaskSpecStatus`, …) are called directly where CLI handlers already do.

**Alternatives considered**:

- Shell out to `spec-n-roll <subcommand>` child processes: rejected — slower, harder to test, loses structured errors.
- Duplicate orchestration in interactive layer: rejected — violates SC-003 and maintenance cost.

## Decision: Reuse existing Ink prompt modules for init, update, and agent add

**Rationale**: FR-010 explicitly requires reusing `init-prompts.tsx`, `update-prompts.tsx`, and `add-agent-prompt.tsx`. Setup/maintenance screens mount these via the same `render()` Promise wrappers rather than rebuilding multi-select and confirmation UX.

**Alternatives considered**:

- Inline new prompts in setup screens: rejected — divergent UX for the same operations.
- Force non-interactive flags only: rejected — spec requires guided init/update when inputs are not pre-specified.

## Decision: Navigation stack with global keybindings documented in contract

**Rationale**: FR-004–FR-007 and User Story 4 require arrow-key lists, back navigation, scroll visibility, quit, and confirmation gates. A session context holds `navigationStack: RouteId[]`, `selectedTaskSpec`, and `projectRoot`. Global `useInput` in the shell handles `q` (quit), `esc`/`b` (back), and delegates list scrolling to shared `SelectableList` component.

**Alternatives considered**:

- Mouse click support: rejected — spec targets terminal keyboard-first use.
- Flat menu only without stack: rejected — spec detail views and nested mutations require drill-down.

## Decision: Unrecognized `specs/` directories listed separately with warning flag

**Rationale**: Edge case in spec requires directories not matching `{numeric-id}-{slug}` to appear as unrecognized entries, not silent skip. `read-models/task-specs.ts` scans all directory entries; valid identities use existing `TASK_SPEC_DIR_PATTERN`; others become `UnrecognizedSpecEntry` with `warning: true`.

**Alternatives considered**:

- Hide unrecognized dirs: rejected — violates spec edge case.
- Attempt fuzzy parse: rejected — risks mis-labeling data.

## Decision: Multi Active task spec selection uses numbered-list prompt component

**Rationale**: FR-011 matches agent workflow behavior. A shared `NumberedSelectionPrompt` component lists Active specs from `listActiveTaskSpecs` (workflow engine) and returns the chosen identity — same pattern as `partial-recovery-prompt.tsx` input handling.

**Alternatives considered**:

- Default to most recent spec silently: rejected — violates FR-011.
- Free-text id entry only: rejected — poor UX for keyboard-first goal (SC-004).

## Decision: Test with `ink-testing-library` plus filesystem integration parity tests

**Rationale**: SC-003 requires byte-equivalence for mutations; SC-004/SC-006 require navigation and read-only guarantees. Unit tests render screens with ink-testing-library and simulate keypresses. Integration tests run interactive orchestrator calls (bypassing Ink where needed) and compare resulting files to subprocess CLI invocations with identical inputs.

**Alternatives considered**:

- Snapshot-only UI tests: rejected — do not prove mutation parity.
- Manual-only QA: rejected — SC-003 demands automated acceptance coverage.

## Decision: Status bar shows project root and local/global binary context

**Rationale**: FR-015. Reuse `buildVersionReport` fields from `src/cli/commands/version.ts` for `resolvedTarget` and local binary path; display in persistent footer via `StatusBar` component.

**Alternatives considered**:

- Hide context until setup section: rejected — developers need orientation on first screen.
