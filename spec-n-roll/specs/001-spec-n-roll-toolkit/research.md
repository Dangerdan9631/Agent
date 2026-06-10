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

## Decision: Enforce behavior-first TDD with vertical slices

**Rationale**: The referenced TDD guidance requires tests to verify behavior through public interfaces, avoid implementation coupling, and use vertical red-green-refactor slices: one test, minimal implementation, repeat. For this toolkit, the most valuable public interfaces are CLI commands, generated workflow commands, workflow state/artifact contracts, config files, and living Gherkin behavior.

**Alternatives considered**:

- Write all tests before all implementation: rejected by the TDD guidance as horizontal slicing.
- Unit-test internal helpers first: rejected because tests should survive refactors and validate public behavior.

## Decision: Maintain living specifications as direct Cucumber Gherkin sources

**Rationale**: Living specs are required to be executable `.feature` files under a user-owned `living-specs/` directory. Cucumber should run against those files directly, while step definitions and test code live in the project's normal test location. The toolkit generates or updates scenarios first at implementation entry, tags them with additive task IDs, and creates clearly marked stub step definitions for unmapped steps.

**Alternatives considered**:

- Duplicate generated `.feature` files under `tests/`: rejected because living specs themselves must be the source of truth.
- Archive deprecated scenarios: rejected because version control history is the archival record.

## Decision: Use versioned JSON/YAML schemas and a tolerant reader for config migration

**Rationale**: Config files must carry schema versions, older configs must remain readable during CLI update, and migrations happen only in the update path. Zod-backed runtime validation plus explicit JSON Schema contracts provide implementation checks and documentation for users and extension authors.

**Alternatives considered**:

- Runtime just-in-time migration: rejected because the spec says runtime may assume current schemas outside update.
- Per-file ownership overrides: rejected because ownership is communicated by directory location.

## Decision: Represent workflow extensibility as manifests, hooks, step definitions, and variants

**Rationale**: The toolkit must support custom steps, hooks, triage/selectors, named workflow variants, priority ordering, disabled extensions, and semver compatibility warnings. A manifest-driven model keeps extension behavior inspectable and lets the CLI validate extension compatibility during updates.

**Alternatives considered**:

- Code-only plugin registration: rejected because workflow definitions must be configurable in project files.
- Separate versioning for each interface: rejected because the spec says the toolkit's semver governs extension interfaces as a whole.

## Decision: Use file-system state as the source of workflow continuity

**Rationale**: Each task spec writes a workflow state file after each step completes. `/spec-n-roll` uses that state when present and parseable, falls back to artifact detection when absent/unreadable, and prompts once for state/artifact mismatch or interrupted partial artifacts. This gives agents deterministic restart behavior without requiring conversation state.

**Alternatives considered**:

- Conversation-only state: rejected because workflows must survive agent/session changes.
- Artifact-only inference: rejected because the spec says the explicit state file wins when valid.
