# Data Model: Repository Living Specs

## Repository Workflow Type

Named workflow mode for repository living-spec work.

**Fields**:

- `id` (required, enum): `repository-onboarding` or `repository-drift`.
- `name` (required, string): Maintainer-facing workflow label.
- `description` (required, string): Concise purpose shown in CLI, MCP, Ink, and generated agent skills.
- `requiresLivingSpecs` (required, enum): `absent-or-partial` for onboarding, `present` for drift.
- `specifyInjectionTemplate` (required, object): Instructions and sections injected into the normal specify stage.

**Validation Rules**:

- Workflow type ids are stable kebab-case values.
- Repository onboarding and drift MUST be selected explicitly for a scoped run.
- Mixed coverage MUST be split into separate scoped runs.

## Repository Workflow Run

One execution of repository onboarding or repository drift.

**Location**: `specs/{taskSpecId}-{slug}/repository-workflow-report.md` plus structured metadata in the specify-stage output.

**Fields**:

- `runId` (required, string): Stable id for the run, usually task spec id plus slug.
- `workflowTypeId` (required): Selected `RepositoryWorkflowType.id`.
- `scope` (required): Approved discovery scope.
- `discoveryPlan` (required): Recommended and accepted inspection plan.
- `evidence` (required, array): Repository evidence records gathered for the run.
- `driftFindings` (required for drift, array): Categorized mismatches for existing living specs.
- `testCoverageMappings` (required, array): Direct, indirect, or missing validation mappings.
- `specifyOutputRef` (required, string): Project-relative path to the produced `spec.md`.
- `reportPath` (required, string): Project-relative path to the workflow report.
- `status` (required, enum): `planned` | `discovering` | `specifying` | `complete` | `blocked`.
- `createdAt` and `completedAt` (required when applicable, ISO 8601): Run timestamps.

**Validation Rules**:

- A completed run MUST reference exactly one specify-stage output.
- A completed run MUST NOT include direct living-spec or test file mutations from specify.
- Blocked runs MUST include clear stopping guidance.

## Discovery Plan

Recommended and maintainer-approved analysis scope.

**Fields**:

- `mode` (required): `repository-onboarding` or `repository-drift`.
- `includedPaths` (required, array): Project-relative directories/files in scope.
- `omittedPaths` (required, array): Project-relative directories/files explicitly deferred.
- `livingSpecTargets` (required, array): Existing or proposed `.feature` files/scenario groups in scope.
- `testMappingStrategy` (required, string): How tests are discovered and related to behaviors.
- `documentationSources` (required, array): Project-relative docs considered as evidence.
- `reviewCheckpoints` (required, array): Maintainer decision points before specify output finalizes.
- `bounds` (required, object): Limits such as maximum directories, files, or product areas.

**Validation Rules**:

- Paths MUST be project-relative and stay inside the project root.
- Large or ambiguous repositories SHOULD default to a bounded first pass.
- Maintainer changes to scope MUST be recorded before discovery begins.

## Repository Evidence

Observation from code, tests, documentation, configuration, or living specs.

**Fields**:

- `id` (required, string): Stable identifier within the run.
- `sourceType` (required, enum): `code` | `test` | `documentation` | `living-spec` | `configuration`.
- `sourceRef` (required, string): Project-relative path plus optional symbol, line, scenario, or command reference.
- `behaviorSummary` (required, string): User-observable behavior supported or challenged by the source.
- `evidenceKind` (required, enum): `confirmed-behavior` | `inferred-intent` | `assumption` | `conflict` | `limitation`.
- `confidence` (required, enum): `high` | `medium` | `low`.
- `notes` (optional, string): Short rationale or limitation.

**Validation Rules**:

- Internal utilities MUST be excluded unless they connect to observable behavior.
- Conflicting evidence MUST identify the disagreeing source references.
- Confidence is informational and MUST NOT block specify-stage output.

## Specify-Stage Injection

Workflow-provided context that augments normal specify.

**Fields**:

- `workflowTypeId` (required): Repository workflow type that produced the injection.
- `instructions` (required, array): Constraints the specify stage must follow.
- `evidenceSummary` (required, array): Condensed repository evidence for the spec.
- `proposedLivingSpecChanges` (required, array): Add/update/delete/merge recommendations.
- `testGapRecommendations` (required, array): Validation targets for uncovered behavior.
- `questions` (required, array): Ambiguities or authority choices to surface during specify or clarify.
- `assumptions` (required, array): Assumptions separate from confirmed facts.

**Validation Rules**:

- Injection MUST preserve standard specify headings and quality checklist compatibility.
- Injection MUST NOT replace the specify interview.
- Injection MUST be serializable into `spec.md` without requiring downstream tools to parse freeform transcripts.

## Repository Specify Output

The single forward feature spec produced by a repository workflow run.

**Location**: `specs/{taskSpecId}-{slug}/spec.md`

**Fields**:

- Standard feature spec sections: user scenarios, requirements, success criteria, assumptions.
- Repository evidence section: source references and confidence.
- Living-spec change section: proposed additions, updates, merges, or deletions.
- Test mapping section: existing direct/indirect tests and explicit gaps.
- Ambiguity section: unresolved questions for clarify.

**Validation Rules**:

- MUST describe future living-spec/test work, not a retrospective history of shipped behavior.
- MUST include evidence summary and test mapping or explicit test gap for every in-scope change.
- MUST leave living-spec and test creation to downstream implementation.

## Drift Finding

Detected mismatch involving an existing living spec.

**Fields**:

- `id` (required, string): Stable finding id.
- `category` (required, enum): `behavior` | `documentation` | `test` | `organization`.
- `livingSpecRef` (required, string): Project-relative `.feature` file and scenario/rule reference.
- `evidenceRefs` (required, array): Repository evidence ids supporting the finding.
- `summary` (required, string): Concise mismatch description.
- `authorityChoice` (optional, enum): `code` | `test` | `documentation` | `living-spec`.
- `recommendedChange` (required, enum): `update` | `delete` | `merge` | `refresh-wording` | `add-test` | `none`.

**Validation Rules**:

- No `authorityChoice` is assumed by default.
- Obsolete or merged specs MUST appear as deletion or merge intent in specify output before implementation changes files.
- Unchanged specs may be reported as confirmed but MUST NOT create duplicate proposed specs.

## Test Coverage Mapping

Relationship between a behavior and executable validation.

**Fields**:

- `behaviorId` (required, string): Proposed or existing behavior id within the run.
- `testRefs` (required, array): Project-relative test references.
- `coverageType` (required, enum): `direct` | `indirect` | `missing` | `unknown`.
- `recommendedValidationTarget` (required when missing/unknown, string): User-observable outcome to protect.
- `notes` (optional, string): Why evidence is direct, indirect, or missing.

**Validation Rules**:

- Infrastructure-only tests MUST be labeled indirect when mapped.
- Missing tests MUST include the smallest useful behavior-focused validation target.

## Workflow Report

Durable summary returned when a repository workflow run completes.

**Location**: `specs/{taskSpecId}-{slug}/repository-workflow-report.md`

**Fields**:

- `scopeSummary` (required): What was and was not inspected.
- `specifyOutputRef` (required): Link to `spec.md`.
- `evidenceSummary` (required): Confirmed facts, inferred intent, conflicts, and limitations.
- `driftSummary` (required for drift): Categorized findings.
- `testGaps` (required): Missing or indirect validation.
- `assumptions` (required): Assumptions separate from facts.
- `nextSteps` (required): Clarify, plan, tasks, and implementation guidance.

**Validation Rules**:

- Report MUST be concise enough to read without the agent transcript.
- Report is supporting context; `spec.md` remains the downstream planning input.
