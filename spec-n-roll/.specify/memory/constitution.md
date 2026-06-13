<!--
Sync Impact Report
Version: template (unratified) → 1.0.0
Bump rationale: Initial ratification derived from AGENTS.md coding conventions.
Modified principles: N/A (all placeholders replaced)
Added sections: Documentation Conventions, Code Change Workflow
Removed sections: None
Templates:
  - .specify/templates/plan-template.md ✅ updated
  - .specify/templates/spec-template.md ✅ no changes needed
  - .specify/templates/tasks-template.md ✅ updated
  - .specify/templates/checklist-template.md ✅ no changes needed
Deferred: None
-->

# Spec-n-Roll Constitution

## Core Principles

### I. Documentation Standards

All top-level functions, types, values, and schema fields MUST have doc comments.
Each `src/` subdirectory MUST have a `README.md` describing responsibilities and
abstractions—not a file inventory.

Doc comments MUST be 1–2 plain-English sentences in multiline format (never
single-line). They MUST explain intent and local usage, not how other parts of
the app consume the symbol. Parameters, fields, and non-void return types MUST
document constraints and form. Directory READMEs MUST stay stable across routine
file changes within the directory.

**Rationale**: Consistent inward-facing documentation lets agents and humans
reason locally without reconstructing cross-module call graphs.

### II. Clean Code Is Part of Delivery

Working code is not automatically clean code. Cleanliness MUST be treated as part
of every delivery. Contributors MUST preserve behavior, leave touched code cleaner
within scope, and MUST NOT add mess because the schedule is tight or a rewrite
is promised.

When touching code, contributors MUST remove the smell that most increases change
cost, but MUST NOT silently broaden the task beyond the smallest cleanup that
makes the requested change safe.

**Rationale**: Incremental cleanliness reduces compound change cost without
blocking delivery.

### III. Local Reasoning and Expressive Design

Code MUST be written for local reasoning: a reader MUST follow a path without
reconstructing hidden state, wide jumps, or naming trivia. Contributors MUST use
precise names with one term per concept, keep functions small and at one
abstraction level, keep parameters few and meaningful, separate commands from
queries, eliminate hidden side effects, and keep the happy path readable.

Contributors MUST expose behavior rather than raw representation. Comments MUST
explain rationale, constraints, warnings, or external contracts only—never
narrate control flow that structure or naming could express.

**Rationale**: Readable, locally understandable code lowers defect rates and
review friction.

### IV. Boundary Discipline

Framework, persistence, transaction, security, and vendor details MUST stay
outside business behavior. Public APIs MUST be small, explicit, and hard to
misuse. Boundary logic, required order, and likely changes MUST be visible at
API edges.

When a boundary leaks framework, vendor, or persistence quirks inward,
contributors MUST add or strengthen a local adapter. When async or concurrency
enters, threading policy MUST be isolated, shared mutable state minimized,
shutdown defined, and timing-sensitive behavior tested.

**Rationale**: Isolated boundaries keep domain logic testable and portable across
infrastructure changes.

### V. Test Discipline and Validation

Tests MUST be treated as production code: readable, deterministic, and aligned
with the behavior or contract they protect. When fixing a bug or changing
behavior, contributors MUST add or update the test that protects the intended
contract before calling the change done.

Contributors MUST run the relevant tests or checks for every change. Design MUST
emerge through tests, duplication removal, expressiveness, and minimal
structure—contributors MUST NOT add needless abstractions or infrastructure.

**Rationale**: Executable contracts prevent regressions and encode intended
behavior more reliably than comments alone.

## Documentation Conventions

Doc comments apply to all top-level functions, types, values, and schema fields.
Use multiline JSDoc/TSDoc style with `@param` and `@returns` where applicable.
Schema field comments MUST describe constraints and valid forms.

Each `src/` subdirectory README MUST:

- Describe the directory's purpose and the abstractions it owns
- Focus on intent, not implementation walkthroughs
- Avoid listing individual files as the primary content
- Remain accurate without updates for routine edits inside the directory

Runtime agent guidance for doc style and examples lives in `AGENTS.md` at the
repository root.

## Code Change Workflow

### Trigger rules

Contributors MUST apply these responses when the corresponding smell appears:

- Mixed setup, validation, computation, and side effects in one function → split
  phases
- Comment explains control flow → simplify names or structure first
- Function both mutates and answers, or hides a mode behind a flag → separate
  responsibilities
- Duplication, repeated switches, or primitive clusters → name the concept with
  a small abstraction (argument object, polymorphism, or special case)
- Cleanup spreading into unrelated areas → cut back to the smallest safe refactor

### Final checklist (required before merge)

Every change MUST satisfy:

- [ ] A reader can follow the change locally
- [ ] Names and APIs carry meaning without narration
- [ ] Mutation is explicit and the happy path is clear
- [ ] Framework, persistence, vendor, and construction details stayed behind
      boundaries
- [ ] At least one smell was removed from the touched area (when code was edited)
- [ ] Tests protect the changed behavior or contract (when behavior changed)
- [ ] Relevant tests or checks were actually run

## Governance

This constitution supersedes informal coding preferences for Spec-n-Roll
development. `AGENTS.md` is the canonical runtime guidance file and MUST stay
consistent with these principles.

**Amendment procedure**: Propose changes via `/speckit-constitution` with explicit
rationale. Update dependent templates in `.specify/templates/` in the same change.
Record version bumps using semantic versioning:

- **MAJOR**: Backward-incompatible principle removals or redefinitions
- **MINOR**: New principles or materially expanded guidance
- **PATCH**: Clarifications, wording fixes, non-semantic refinements

**Compliance review**: Implementation plans MUST pass Constitution Check gates
before Phase 0 research and again after Phase 1 design. Pull requests and
`/speckit-analyze` runs MUST treat constitution MUST violations as CRITICAL.
Complexity that violates a principle MUST be documented in the plan's Complexity
Tracking table with rejected simpler alternatives.

**Version**: 1.0.0 | **Ratified**: 2026-06-13 | **Last Amended**: 2026-06-13
