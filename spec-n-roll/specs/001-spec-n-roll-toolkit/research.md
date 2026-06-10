# Research: Spec-n-Roll Toolkit

## Decision: Use a Spec Kit-style artifact workflow with `spec-n-` commands

**Rationale**: Spec Kit's public workflow centers on durable artifacts and slash commands: constitution, specify, clarify, plan, tasks, analyze, and implement. The feature spec requires the same shape with `spec-n-` command names and a `/spec-n-roll` meta-command that advances the active workflow. Modeling `spec-n-roll` around explicit artifacts and state files gives agents a shared contract across environments.

**Alternatives considered**:

- Single all-in-one command: rejected because it hides intermediate decisions and undermines artifact review.
- Agent-specific workflows: rejected because consistent behavior across agents is a P1 requirement.

## Decision: Implement the management surface as a TypeScript CLI using Ink

**Rationale**: The user explicitly requires an interactive CLI using Ink. TypeScript aligns with Ink, React component testing, Node-based global/local dispatch, schema validation, semver handling, and file-system tooling. The CLI owns setup, update, and configuration modification, while generated agent commands own development workflow steps.

**Alternatives considered**:

- Python CLI matching Spec Kit's `specify` implementation: rejected because Ink is a TypeScript/React CLI framework.
- Non-interactive command flags only: rejected because setup, update confirmation, agent selection, script selection, triage override, and interrupted-step recovery all require guided interaction.

## Decision: Use global CLI dispatch with local project delegation

**Rationale**: The spec requires globally installed CLI invocations to check for a local project copy and delegate to it, with `--global` as an override. This supports stable per-project toolkit versions while allowing a single developer entry point.

**Alternatives considered**:

- Always use the global CLI: rejected because projects could silently change behavior when the global package updates.
- Always require local `npx` or package scripts: rejected because setup must be usable before local project wiring exists.

## Decision: Treat specification creation as a grill-me style interview

**Rationale**: The referenced grill-me guidance says to walk the decision tree one branch at a time, ask questions one at a time, provide a recommended answer, and explore the codebase instead of asking questions that can be answered locally. This maps directly to `/spec-n-specify` and `/spec-n-clarify`: each session resolves the highest-value ambiguity, records the answer, and stops when the specification is complete and the developer is satisfied.

**Alternatives considered**:

- Generate a complete spec from the initial prompt: rejected because the feature requires iterative interactive specification.
- Ask a batch of questions: rejected because both the spec and grill-me guidance require one targeted question at a time.

## Decision: Embed triage inside the `specify` step

**Rationale**: `specify` must be the first step of every workflow tier. Triage selects the tier variant (papercut/quick/full) at the start of `specify` before the interview, then persists `workflowVariantId` before the interview proceeds. This keeps a single universal entry step while still routing by complexity.

**Alternatives considered**:

- Separate `triage-selector` workflow step before `specify`: rejected because the developer requires `specify` as the first step of every workflow.
- Meta-workflow wrapping triage then tier: rejected in favor of embedding triage in the specify handler.

## Decision: Model tier variants with shared `specify` step reference plus tail

**Rationale**: Each tier variant in `workflow.config.json` lists a shared `specify` step as step 1 followed by its tier-specific tail. Steps are reusable references, not duplicated definitions. `defaultWorkflowId` pre-selects a tier only in the manual/override picker (ambiguous descriptions); normal heuristic triage proposes its own match.

**Alternatives considered**:

- Post-specify tails only with implicit specify prefix: rejected to keep workflow config explicit and inspectable.
- Monolithic workflow with conditional branching: rejected because named variants must be configurable and extension-replaceable.

## Decision: Persist task spec lifecycle in `spec.md` YAML frontmatter

**Rationale**: Lifecycle states (`Active`, `Complete`, `Locked`) are human-visible and co-located with requirements. Operational workflow progress (`active`/`paused`/`complete`) remains in `workflow-state.json` as a separate concern.

**Alternatives considered**:

- Composite persistence across `workflow-state.json` and `project-metadata.lockedTaskSpecIds`: rejected in favor of frontmatter as the lifecycle source of truth.
- Separate `lifecycle.json` per task spec: rejected as unnecessary artifact proliferation.

## Decision: Machine-readable IDs use numeric `taskSpecId` plus required `slug`

**Rationale**: JSON contracts (`workflow-state.json`, `project-metadata.json`) carry numeric `taskSpecId` and a required `slug` field. Gherkin tags remain numeric-only (`@spec-n-roll-001`). Directory paths use `specs/{numeric-id}-{slug}/`.

**Alternatives considered**:

- Numeric-only JSON with slug directory-only: rejected because slug is required metadata for disambiguation in prompts and metadata files.
- Full `001-slug` composite in `taskSpecId` fields: rejected to keep IDs and tags numeric.

## Decision: Assign sequential IDs via `nextTaskSpecId` counter

**Rationale**: `project-metadata.json` maintains `nextTaskSpecId`, incremented atomically when a new task spec directory is created. Avoids directory scans at runtime.

**Alternatives considered**:

- Scan `specs/` for max ID + 1: rejected for performance and race sensitivity.
- Timestamp-based IDs: rejected because spec requires sequential zero-padded numeric IDs.

## Decision: Omit tier-skipped artifacts

**Rationale**: Papercut and quick tiers do not create `plan.md` or `tasks.md` stubs. Artifact detection and `/spec-n-roll` respect the selected tier's step list from `workflow.config.json`.

**Alternatives considered**:

- Placeholder stub files: rejected because they add noise and confuse artifact detection.
- Always generate all artifacts: rejected because it contradicts tier semantics.

## Decision: Enforce behavior-first TDD with vertical slices

**Rationale**: The referenced TDD guidance requires tests to verify behavior through public interfaces, avoid implementation coupling, and use vertical red-green-refactor slices: one test, minimal implementation, repeat. For this toolkit, the most valuable public interfaces are CLI commands, generated workflow commands, workflow state/artifact contracts, config files, and living Gherkin behavior.

**Alternatives considered**:

- Write all tests before all implementation: rejected by the TDD guidance as horizontal slicing.
- Unit-test internal helpers first: rejected because tests should survive refactors and validate public behavior.

## Decision: Maintain living specifications as direct Cucumber Gherkin sources

**Rationale**: Living specs are required to be executable `.feature` files under `living-specs/{kebab-case-domain}.feature`. Cucumber runs against those files directly, while step definitions and test code live in the project's normal test location. The toolkit generates or updates scenarios first at implementation entry, tags them with additive task IDs, and creates clearly marked stub step definitions for unmapped steps.

**Alternatives considered**:

- Duplicate generated `.feature` files under `tests/`: rejected because living specs themselves must be the source of truth.
- Archive deprecated scenarios: rejected because version control history is the archival record.

## Decision: Detect partial artifacts via built-in step output manifest

**Rationale**: Each step ID maps to expected output files (e.g., `specify` → `spec.md`). Partial means any expected file for the current incomplete step exists while `workflow-state.json` shows that step not yet completed. One interrupted-step prompt covers all partial files for that step.

**Alternatives considered**:

- mtime-based detection since last state write: rejected as unreliable across tooling.
- Explicit `interruptedArtifacts[]` only: rejected as insufficient without a manifest baseline.

## Decision: Use versioned JSON/YAML schemas and a tolerant reader for config migration

**Rationale**: Config files must carry schema versions, older configs must remain readable during CLI update, and migrations happen only in the update path. Zod-backed runtime validation plus explicit JSON Schema contracts provide implementation checks and documentation for users and extension authors.

**Alternatives considered**:

- Runtime just-in-time migration: rejected because the spec says runtime may assume current schemas outside update.
- Per-file ownership overrides: rejected because ownership is communicated by directory location.

## Decision: Represent workflow extensibility as manifests, hooks, step definitions, and variants

**Rationale**: The toolkit must support custom steps, hooks, triage logic within specify, named workflow variants, priority ordering, disabled extensions, and semver compatibility warnings. Extension `entrypoint` values are in-process Node modules (`import()` + exported handler).

**Alternatives considered**:

- Code-only plugin registration: rejected because workflow definitions must be configurable in project files.
- Subprocess extension execution: rejected because TypeScript in-process handlers enable shared types and lower latency.
- Separate versioning for each interface: rejected because the spec says the toolkit's semver governs extension interfaces as a whole.

## Decision: Use file-system state as the source of workflow continuity

**Rationale**: Each task spec writes a workflow state file after each step completes. `/spec-n-roll` uses that state when present and parseable, falls back to tier-aware artifact detection when absent/unreadable, and prompts once for state/artifact mismatch or interrupted partial artifacts.

**Alternatives considered**:

- Conversation-only state: rejected because workflows must survive agent/session changes.
- Artifact-only inference: rejected because the spec says the explicit state file wins when valid.
