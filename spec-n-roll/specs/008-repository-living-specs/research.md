# Research: Repository Living Specs

## Decision: Model onboarding and drift as workflow types, not standalone slash commands

**Rationale**: The spec requires repository onboarding and drift to preserve the normal specify structure, end after specify, and continue through existing clarify/plan/tasks/implement later. Workflow types can declare discovery guidance and specify-stage injections while still using the current task spec lifecycle.

**Alternatives considered**:

- Dedicated `/spec-n-repository-init` command that writes living specs directly: rejected because FR-014 and SC-003 prohibit living-spec/test mutations during specify.
- A hidden pre-step before every specify run: rejected because onboarding and drift require explicit maintainer choice and different scope rules.
- Retrospective task specs for existing behavior: rejected because FR-032 requires one forward specify-stage output for living-spec and test work.

## Decision: Require initialized Spec-n-Roll scaffolding before discovery

**Rationale**: Existing config, workflow state paths, generated skills, and living-spec conventions are only reliable after `spec-n-roll init`. A hard guard gives clear failure guidance and avoids inventing partial project structure during repository analysis.

**Alternatives considered**:

- Auto-run init from the workflow: rejected because initialization choices are project setup decisions and may affect user-owned files.
- Best-effort operation without config: rejected because workflow type, output path, and downstream plan compatibility would be ambiguous.

## Decision: Introduce `src/repository/` as the repository workflow domain

**Rationale**: Discovery planning, evidence normalization, drift classification, and report generation are cohesive repository-analysis concerns. Keeping them outside `src/specs/` prevents the specify implementation from absorbing filesystem scanning and test mapping policy.

**Alternatives considered**:

- Add discovery directly to `runSpecify`: rejected because it mixes setup, scanning, interview orchestration, and persistence.
- Put discovery under `src/living-specs/`: rejected because onboarding also reads code, tests, docs, and config; living specs are only one evidence source.

## Decision: Store discovery findings as structured evidence records

**Rationale**: Requirements need confidence, direct/indirect test mapping, source references, assumptions, and unresolved ambiguity. A structured `RepositoryEvidence` model lets reports, specify output, and drift analysis share one vocabulary without parsing prose.

**Alternatives considered**:

- Inject raw agent notes into specify: rejected because downstream validation cannot reliably distinguish confirmed facts, inferred intent, and assumptions.
- Store only final report prose: rejected because drift repeatability and tests need structured categories.

## Decision: Specify-stage injection is a first-class contract

**Rationale**: FR-033 through FR-035 require workflow types to add context, evidence, instructions, and constraints to specify without replacing headings or downstream planning expectations. A `SpecifyStageInjection` object can be passed to `runSpecify`, serialized into the output spec/report, and reused by future workflow types.

**Alternatives considered**:

- Add repository-specific flags to interview questions: rejected because future workflows would repeat the pattern.
- Rewrite the spec template for repository workflows: rejected because it risks breaking clarify and planning compatibility.

## Decision: Workflow run report is durable but non-authoritative

**Rationale**: The report helps maintainers understand discovery scope, drift, test gaps, assumptions, and next steps, but the forward feature spec remains the artifact that drives plan/tasks/implement. This preserves the normal workflow while making analysis auditable.

**Alternatives considered**:

- Treat the report as the implementation source of truth: rejected because Spec Kit downstream stages consume `spec.md`.
- Omit reports and rely on transcript: rejected because FR-020 and FR-021 require durable summaries.

## Decision: Conflicts require maintainer authority choices during specify

**Rationale**: Code, tests, docs, and living specs can disagree, and the spec explicitly rejects a default source of truth. Discovery records conflicts, specify asks or records authority choices, and unresolved choices remain visible for clarify.

**Alternatives considered**:

- Prefer tests over code by default: rejected because tests may be stale or infrastructure-focused.
- Prefer living specs by default: rejected because drift workflows exist specifically because specs can become stale.

## Decision: Confidence is informational only

**Rationale**: Confidence helps reviewers prioritize low-evidence proposals but does not block output. Ambiguity is carried into the specify-stage output and can be corrected through clarify.

**Alternatives considered**:

- Block low-confidence findings: rejected because FR-018 says unresolved ambiguity does not block specify completion.
- Hide confidence from output: rejected because FR-008 and the user scenarios require confidence levels.

## Decision: Drift comparison is scenario-aware and category-based

**Rationale**: Drift findings must categorize behavior, documentation, test, and organization drift. Comparing existing Gherkin scenarios to evidence records gives repeatable results and avoids duplicating living specs for the same behavior.

**Alternatives considered**:

- Regenerate all living specs from code: rejected because partial user-authored specs must not be replaced wholesale.
- File-level timestamp comparison: rejected because stale wording and behavior mismatch need semantic categories.

## Decision: Large repositories use bounded first-pass scopes

**Rationale**: The workflow should be useful in large or ambiguous repositories without requiring complete coverage. Discovery plans capture included and omitted areas so later scoped onboarding or drift runs can continue incrementally.

**Alternatives considered**:

- Always scan the entire repository: rejected because it can be slow, noisy, and less reviewable.
- Require the maintainer to provide scope before recommendations: rejected because FR-003 requires a recommended plan first.
