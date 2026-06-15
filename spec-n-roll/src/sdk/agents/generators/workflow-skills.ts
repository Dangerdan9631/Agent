import path from 'node:path';
import fse from 'fs-extra';

import { readToolkitPackageVersion } from '../../version.js';
import { atomicWriteText } from '../../core/atomic-write.js';
import { ensureAgentSkillsDirectory } from './shared.js';

/**
 * Author metadata value stamped on every Spec-n-Roll-managed agent skill.
 */
export const MANAGED_SKILL_AUTHOR = 'spec-n-roll';

/**
 * Frontmatter identity fields shared by managed workflow skills.
 */
interface ManagedSkillIdentity {
  /**
   * Slash-command skill name such as `spec-n-specify`.
   */
  name: string;
  /**
   * One-line skill description shown in agent skill pickers.
   */
  description: string;
}

/**
 * Builds the YAML frontmatter block for a managed workflow skill.
 *
 * @param identity - Skill name and description for the frontmatter header.
 * @param toolkitVersion - Semver of the toolkit generating the skill content.
 * @returns Opening frontmatter block including trailing `---` and newline.
 */
function buildManagedSkillFrontmatter(
  identity: ManagedSkillIdentity,
  toolkitVersion: string,
): string {
  return `---
name: "${identity.name}"
description: "${identity.description}"
metadata:
  author: "${MANAGED_SKILL_AUTHOR}"
  version: "${toolkitVersion}"
---
`;
}

/**
 * Wraps managed skill body markdown with consistent provenance frontmatter.
 *
 * @param identity - Skill name and description for the frontmatter header.
 * @param body - Markdown body following the frontmatter block.
 * @param toolkitVersion - Semver of the toolkit generating the skill content.
 * @returns Full UTF-8 skill document with frontmatter and body.
 */
function buildManagedSkillMarkdown(
  identity: ManagedSkillIdentity,
  body: string,
  toolkitVersion: string,
): string {
  return `${buildManagedSkillFrontmatter(identity, toolkitVersion)}
${body}`;
}

/**
 * Relative path to the /spec-n-specify agent skill file from the project root.
 */
export const SPECIFY_SKILL_RELATIVE_PATH = '.agents/skills/spec-n-specify/SKILL.md';

/**
 * Relative path to the /spec-n-clarify agent skill file from the project root.
 */
export const CLARIFY_SKILL_RELATIVE_PATH = '.agents/skills/spec-n-clarify/SKILL.md';

/**
 * Relative path to the /spec-n-roll agent skill file from the project root.
 */
export const ROLL_SKILL_RELATIVE_PATH = '.agents/skills/spec-n-roll/SKILL.md';

/**
 * Relative path to the /spec-n-plan agent skill file from the project root.
 */
export const PLAN_SKILL_RELATIVE_PATH = '.agents/skills/spec-n-plan/SKILL.md';

/**
 * Relative path to the /spec-n-tasks agent skill file from the project root.
 */
export const TASKS_SKILL_RELATIVE_PATH = '.agents/skills/spec-n-tasks/SKILL.md';

/**
 * Relative path to the /spec-n-analyze agent skill file from the project root.
 */
export const ANALYZE_SKILL_RELATIVE_PATH = '.agents/skills/spec-n-analyze/SKILL.md';

/**
 * Relative path to the /spec-n-implement agent skill file from the project root.
 */
export const IMPLEMENT_SKILL_RELATIVE_PATH = '.agents/skills/spec-n-implement/SKILL.md';

/**
 * Relative path to the /spec-n-manifesto agent skill file from the project root.
 */
export const MANIFESTO_SKILL_RELATIVE_PATH = '.agents/skills/spec-n-manifesto/SKILL.md';

/**
 * Relative path to the repository onboarding workflow skill file from the project root.
 */
export const REPOSITORY_ONBOARDING_SKILL_RELATIVE_PATH =
  '.agents/skills/repository-onboarding/SKILL.md';

/**
 * Relative path to the repository drift workflow skill file from the project root.
 */
export const REPOSITORY_DRIFT_SKILL_RELATIVE_PATH = '.agents/skills/repository-drift/SKILL.md';

/**
 * Returns markdown content for the /spec-n-specify agent skill.
 *
 * @param toolkitVersion - Semver of the toolkit generating the skill content.
 * @returns UTF-8 markdown documenting specify workflow and MCP boundaries.
 */
export function buildSpecifySkillContent(toolkitVersion: string): string {
  return buildManagedSkillMarkdown(
    {
      name: 'spec-n-specify',
      description:
        'Create a new task specification with embedded triage and a one-question-at-a-time interview.',
    },
    `# /spec-n-specify

Create a new task spec under \`specs/{numeric-id}-{slug}/\` from a feature description.

## Flow

1. **Triage (embedded)** — Evaluate complexity and propose papercut, quick, or full tier with rationale. Confirm or override with the developer before continuing.
2. **Allocate task spec id** — Use MCP \`project_metadata_read\` / \`project_metadata_write\` or matching CLI to allocate the next numeric id (handled by toolkit orchestration).
3. **Instantiate spec.md** — Call MCP \`step_output_instantiate\` with \`stepId: specify\` and \`frontmatter: { status: Active }\` **before** editing prose. CLI parallel: \`spec-n-roll step instantiate --task-spec-id <id> --step-id specify --frontmatter status=Active\`.
4. **Set lifecycle status** — Confirm \`status: Active\` via MCP \`task_spec_status_set\` (do not edit YAML frontmatter directly).
5. **Persist workflow variant** — Write \`workflow-state.json\` with \`workflowVariantId\` via MCP \`workflow_state_write\` before the interview proceeds.
6. **Interview** — Ask exactly **one** targeted question at a time with a recommended answer. Explore the repository before asking anything answerable from code. Do not re-ask resolved questions.
7. **Edit prose** — Update \`spec.md\` body sections directly after instantiation. Remove all \`<!-- FILL:\` placeholders before finishing.
8. **Complete specify** — Write \`workflow-state.json\` with \`lastCompletedStepId: specify\` via MCP \`workflow_state_write\`.

## Machine-readable mutations (MCP / CLI only)

- \`workflow-state.json\`
- \`spec.md\` YAML frontmatter (\`status\`)
- \`project-metadata.json\`

Prose in \`spec.md\` is agent-editable **after** template instantiation.

## User input

\`\`\`text
$ARGUMENTS
\`\`\`

The text after \`/spec-n-specify\` is the feature description. Run embedded triage, then the interview, until the spec passes quality checks (no placeholders; critical questions resolved).
`,
    toolkitVersion,
  );
}

/**
 * Returns markdown content for the /spec-n-clarify agent skill.
 *
 * @param toolkitVersion - Semver of the toolkit generating the skill content.
 * @returns UTF-8 markdown documenting clarify workflow and MCP boundaries.
 */
export function buildClarifySkillContent(toolkitVersion: string): string {
  return buildManagedSkillMarkdown(
    {
      name: 'spec-n-clarify',
      description: 'Follow-up clarification interview for an existing task specification.',
    },
    `# /spec-n-clarify

Run a **separate** one-question-at-a-time interview on an **existing** task spec.

## Flow

1. **Identify task spec** — When multiple Active specs exist, present a numbered list for the developer to choose (no silent default).
2. **Lifecycle** — When new un-implemented requirements are appended to a Complete spec, call MCP \`task_spec_status_set\` to revert \`status\` to \`Active\` before prose edits.
3. **Interview** — Ask one targeted clarify question at a time with recommended answers. Explore the codebase before asking.
4. **Edit prose** — Append clarifications to \`spec.md\` body directly. Do not edit YAML frontmatter by hand.
5. **Quality** — Ensure no \`<!-- FILL:\` placeholders remain and critical clarify topics are resolved.

## Machine-readable mutations (MCP / CLI only)

- \`spec.md\` YAML frontmatter (\`status\` transitions Complete → Active when adding requirements)
- \`workflow-state.json\` when operational status changes are required

Living specs under \`living-specs/\` remain agent-managed and outside MCP/CLI.

## User input

\`\`\`text
$ARGUMENTS
\`\`\`

Optional clarification topic after the command. Use the clarify interview to resolve follow-up ambiguities without creating a new task spec directory.
`,
    toolkitVersion,
  );
}

/**
 * Returns markdown content for the /spec-n-roll agent skill.
 *
 * @param toolkitVersion - Semver of the toolkit generating the skill content.
 * @returns UTF-8 markdown documenting roll advancement and intent detection.
 */
export function buildRollSkillContent(toolkitVersion: string): string {
  return buildManagedSkillMarkdown(
    {
      name: 'spec-n-roll',
      description:
        'Advance the workflow to the next tier step with zero-knowledge intent detection.',
    },
    `# /spec-n-roll

Meta-command that reads workflow state and advances to the next incomplete **tier** step automatically.

## Intent detection

- **Description argument** → route to \`/spec-n-specify\` for a new spec.
- **No description + zero Active specs** → prompt for a feature description.
- **No description + multiple Active specs** → numbered task-selection list (no silent default).
- **Ambiguous paused/incomplete specs** → "new or continue?" prompt.

## Advancement

1. Read \`workflow-state.json\` via MCP \`workflow_state_read\` when present (state wins over artifacts after a single confirmation when they conflict).
2. When state is missing, fall back to tier-aware artifact detection (tier-skipped files such as \`plan.md\` on quick/papercut are not errors).
3. Resolve the next step from the variant step list; skip on-demand \`clarify\` and \`analyze\` unless explicitly invoked.
4. When partial artifacts exist for the next step, present **one** three-choice prompt: restart, cancel (paused), or force-clean.
5. Instantiate step outputs via MCP \`step_output_instantiate\` before prose edits for plan/tasks steps.

## Machine-readable mutations (MCP / CLI only)

- \`workflow-state.json\`
- Step template instantiation for \`plan.md\` and \`tasks.md\`

## User input

\`\`\`text
$ARGUMENTS
\`\`\`

Optional feature description for a new spec. Omit to continue the current workflow.
`,
    toolkitVersion,
  );
}

/**
 * Returns markdown content for the /spec-n-plan agent skill.
 *
 * @param toolkitVersion - Semver of the toolkit generating the skill content.
 * @returns UTF-8 markdown documenting plan step workflow and MCP boundaries.
 */
export function buildPlanSkillContent(toolkitVersion: string): string {
  return buildManagedSkillMarkdown(
    {
      name: 'spec-n-plan',
      description: 'Create plan.md with living-spec targets for full-tier task specs.',
    },
    `# /spec-n-plan

Full-tier step that produces \`plan.md\` documenting approach and **Living Spec Targets**.

## Flow

1. **Step init** — Call MCP \`step_init\` (or CLI \`spec-n-roll step init\`) with \`stepId: plan\` **before any work**. Execute mandatory \`beforeHooks\` from the response before continuing.
2. **Instantiate plan.md** — Call MCP \`step_output_instantiate\` with \`stepId: plan\` **before** editing prose.
3. **Edit prose** — Fill Technical Context, Living Spec Targets table, and structure sections. Remove \`<!-- FILL:\` placeholders.
4. **Validate** — Confirm plan.md is complete and placeholders are resolved.
5. **Step finalize** — Call MCP \`step_finalize\` with \`validationPassed: true\` **before claiming the step complete**. Execute mandatory \`afterHooks\` from the response.

Living specs under \`living-specs/\` remain agent-managed; plan.md only documents intended targets.

## Machine-readable mutations (MCP / CLI only)

- \`workflow-state.json\` lifecycle via \`step_init\` / \`step_finalize\`
- Template instantiation for \`plan.md\`

## User input

\`\`\`text
$ARGUMENTS
\`\`\`

Optional planning notes. Tier-skipped when the workflow variant omits the plan step.
`,
    toolkitVersion,
  );
}

/**
 * Returns markdown content for the /spec-n-tasks agent skill.
 *
 * @param toolkitVersion - Semver of the toolkit generating the skill content.
 * @returns UTF-8 markdown documenting tasks step workflow and FR-009 ordering.
 */
export function buildTasksSkillContent(toolkitVersion: string): string {
  return buildManagedSkillMarkdown(
    {
      name: 'spec-n-tasks',
      description:
        'Create tasks.md with living-spec updates as the first implementation tasks (FR-009).',
    },
    `# /spec-n-tasks

Produces \`tasks.md\` for quick and full tiers. **FR-009**: the first implementation phase MUST list living-spec updates before any test or production code tasks.

## Flow

1. **Step init** — Call MCP \`step_init\` (or CLI \`spec-n-roll step init\`) with \`stepId: tasks\` **before any work**. Execute mandatory \`beforeHooks\` from the response before continuing.
2. **Instantiate tasks.md** — Call MCP \`step_output_instantiate\` with \`stepId: tasks\` **before** editing prose.
3. **Preserve FR-009 ordering** — Keep "Living Specification Updates" as Phase 1; only add test/code tasks in later phases.
4. **Edit prose** — Fill task checkboxes and remove \`<!-- FILL:\` placeholders.
5. **Validate** — Confirm tasks.md ordering and placeholders are resolved.
6. **Step finalize** — Call MCP \`step_finalize\` with \`validationPassed: true\` **before claiming the step complete**. Execute mandatory \`afterHooks\` from the response.

## Machine-readable mutations (MCP / CLI only)

- \`workflow-state.json\` lifecycle via \`step_init\` / \`step_finalize\`
- Template instantiation for \`tasks.md\`

## User input

\`\`\`text
$ARGUMENTS
\`\`\`

Optional task-generation hints. Omitted on papercut tier variants.
`,
    toolkitVersion,
  );
}

/**
 * Returns markdown content for the /spec-n-analyze agent skill.
 *
 * @param toolkitVersion - Semver of the toolkit generating the skill content.
 * @returns UTF-8 markdown documenting non-destructive cross-artifact analysis.
 */
export function buildAnalyzeSkillContent(toolkitVersion: string): string {
  return buildManagedSkillMarkdown(
    {
      name: 'spec-n-analyze',
      description: 'Non-destructive cross-artifact consistency report for the current task spec.',
    },
    `# /spec-n-analyze

On-demand quality step (not part of default tier advancement). Produces a **non-destructive** report across \`spec.md\`, \`plan.md\`, \`tasks.md\`, and optionally \`living-specs/\`.

## Checks

- Missing expected artifacts for the selected tier
- Unresolved \`<!-- FILL:\` placeholders
- FR-009 tasks.md ordering (living-spec updates before test/code tasks)
- Missing Living Spec Targets in \`plan.md\` when required
- Workflow state vs artifact mismatches

Does **not** modify any files. Re-run after fixes to verify.

## User input

\`\`\`text
$ARGUMENTS
\`\`\`

Optional focus area for the analysis report.
`,
    toolkitVersion,
  );
}

/**
 * Returns markdown content for the /spec-n-implement agent skill.
 *
 * @param toolkitVersion - Semver of the toolkit generating the skill content.
 * @returns UTF-8 markdown documenting implementation entry expectations.
 */
export function buildImplementSkillContent(toolkitVersion: string): string {
  return buildManagedSkillMarkdown(
    {
      name: 'spec-n-implement',
      description: 'Begin implementation: living-spec updates first, then TDD from living specs.',
    },
    `# /spec-n-implement

Tier exit step. Begins after plan/tasks (or specify-only on papercut).

## Flow (orchestration expands in later toolkit phases)

1. **Step init** — Call MCP \`step_init\` (or CLI \`spec-n-roll step init\`) with \`stepId: implement\` **before any work**. Execute mandatory \`beforeHooks\` from the response before continuing.
2. **Living specs first (FR-009)** — Update \`living-specs/{domain}.feature\` files documented in \`plan.md\` and listed as the first tasks in \`tasks.md\` **before** any test or production code.
3. **Tag scenarios** — Add \`@spec-n-roll-{taskSpecId}\` to new or modified scenarios (additive; never remove prior tags).
4. **TDD cycle** — Run Cucumber against living specs; write failing tests, then code, then refactor.
5. **Validate** — Confirm living-spec updates and implementation tasks are complete.
6. **Step finalize** — Call MCP \`step_finalize\` with \`validationPassed: true\`, then write workflow \`status: complete\` and lifecycle \`Complete\` via MCP tools when the tier finishes. Execute mandatory \`afterHooks\` from the finalize response.

Living specs are agent-managed (outside MCP/CLI). Machine-readable workflow and lifecycle writes use MCP/CLI only.

## User input

\`\`\`text
$ARGUMENTS
\`\`\`

Optional implementation focus or vertical slice to start with.
`,
    toolkitVersion,
  );
}

/**
 * Returns markdown content for the /spec-n-manifesto agent skill.
 *
 * @param toolkitVersion - Semver of the toolkit generating the skill content.
 * @returns UTF-8 markdown documenting manifesto authoring and validation workflow.
 */
export function buildManifestoSkillContent(toolkitVersion: string): string {
  return buildManagedSkillMarkdown(
    {
      name: 'spec-n-manifesto',
      description:
        'Author or update a global or step-scoped Spec Manifesto through a single-target interview.',
    },
    `# /spec-n-manifesto

Standalone command for **Spec Manifesto** authoring. This is **not** a workflow step — do **not** call \`step_init\` or \`step_finalize\`.

## Invocation targets (exactly one per run)

- **Global**: \`/spec-n-manifesto global\` or equivalent user intent for project-wide rules
- **Step**: \`/spec-n-manifesto <stepId>\` for one workflow step such as \`plan\` or \`implement\`

When the user does not specify a single target, present a numbered choice between global and registered workflow steps. Do not edit multiple manifestos in one invocation.

## Flow

1. **Extension hooks** — Check \`.specify/extensions.yml\` for \`before_manifesto\` and \`after_manifesto\` hooks when registered.
2. **Load existing content** — Read \`.spec-n-roll/config/manifesto/global.md\` or \`steps/{stepId}.md\`, or start from the bundled init template with \`[PLACEHOLDER]\` tokens.
3. **Interview** — Ask the maintainer targeted questions about:
   - Spec-n-roll processes and iterative user feedback during steps
   - MCP-based deterministic step execution (\`step_init\` / \`step_finalize\`)
   - Set list triage and lifecycle boundaries where relevant
4. **Iterative feedback** — Refine draft prose until the maintainer confirms.
5. **Validate** — Reject empty bodies, unresolved \`[PLACEHOLDER]\` tokens, ambiguous step scope, and conflicts with \`.specify/memory/constitution.md\`. Surface conflicts for user resolution; do not silently merge contradictory governance.
6. **Save** — Persist atomically only after confirmation. Preserve prior content until the user approves the draft.
7. **Sync impact** — Optional HTML comment header describing governance changes (constitution pattern).

## Storage

- Global: \`.spec-n-roll/config/manifesto/global.md\` (loaded on every \`step_init\`)
- Step: \`.spec-n-roll/config/manifesto/steps/{stepId}.md\` (loaded only when \`stepId\` matches the active step)

## User input

\`\`\`text
$ARGUMENTS
\`\`\`

Target scope after the command: \`global\` or a registered workflow \`stepId\`.
`,
    toolkitVersion,
  );
}

/**
 * Returns markdown content for the repository onboarding workflow skill.
 *
 * @param toolkitVersion - Semver of the toolkit generating the skill content.
 * @returns UTF-8 markdown documenting repository onboarding workflow boundaries.
 */
export function buildRepositoryOnboardingSkillContent(toolkitVersion: string): string {
  return buildManagedSkillMarkdown(
    {
      name: 'repository-onboarding',
      description:
        'Discover repository behavior evidence and produce one forward specify-stage output for living-spec work.',
    },
    `# Repository Onboarding Workflow

Run the \`repository-onboarding\` workflow type in an **initialized** Spec-n-Roll project to convert discovered behavior into proposed living-spec and test work through the normal specify stage.

## Flow

1. **Verify initialization** — Confirm \`.spec-n-roll/config/workflow.config.json\` exists. If missing, stop and instruct the maintainer to run \`spec-n-roll init\`.
2. **Start workflow** — Use MCP \`repository_workflow_start\` or CLI \`spec-n-roll repository-workflow start --workflow-type-id repository-onboarding\` to receive a recommended discovery plan.
3. **Approve scope** — Let the maintainer accept, narrow, broaden, or omit discovery scope before analysis begins.
4. **Discover evidence** — Inventory user-facing code behavior, documentation, and tests within the approved scope. Exclude internal-only utilities unless they connect to observable behavior.
5. **Inject specify context** — Pass repository evidence, proposed living-spec changes, test mappings, assumptions, and unresolved ambiguity into the normal specify interview.
6. **Complete specify only** — Produce exactly one \`specs/{id}-{slug}/spec.md\` with standard headings plus repository sections. Write \`workflow-state.json\` with \`lastCompletedStepId: specify\`.
7. **Stop** — Do not run plan, tasks, or implement automatically. Do not write \`living-specs/\` files or mutate tests during specify.

## Required specify output sections

- Repository Discovery Evidence
- Proposed Living Spec Changes
- Test Coverage Mapping
- Unresolved Ambiguity
- Assumptions and Limitations

## Machine-readable operations (MCP / CLI only)

- \`repository_workflow_types_list\`
- \`repository_workflow_start\`
- Normal specify lifecycle tools (\`step_output_instantiate\`, \`workflow_state_write\`, \`task_spec_status_set\`)

Living specs under \`living-specs/\` and test files remain downstream implementation work.

## User input

\`\`\`text
$ARGUMENTS
\`\`\`

Optional scope notes or maintainer goal for the onboarding run.
`,
    toolkitVersion,
  );
}

/**
 * Returns markdown content for the repository drift workflow skill.
 *
 * @param toolkitVersion - Semver of the toolkit generating the skill content.
 * @returns UTF-8 markdown documenting repository drift workflow boundaries.
 */
export function buildRepositoryDriftSkillContent(toolkitVersion: string): string {
  return buildManagedSkillMarkdown(
    {
      name: 'repository-drift',
      description:
        'Compare existing living specs to current repository evidence and produce one forward specify-stage refresh output.',
    },
    `# Repository Drift Workflow

Run the \`repository-drift\` workflow type in an **initialized** Spec-n-Roll project that already has \`living-specs/\` files. Compare current code, tests, and documentation to existing Gherkin scenarios, categorize drift, and produce refresh recommendations through the normal specify stage.

## Flow

1. **Verify initialization** — Confirm \`.spec-n-roll/config/workflow.config.json\` exists. If missing, stop and instruct the maintainer to run \`spec-n-roll init\`.
2. **Start workflow** — Use MCP \`repository_workflow_start\` or CLI \`spec-n-roll repository-workflow start --workflow-type-id repository-drift\` to receive a recommended discovery plan scoped to existing living specs.
3. **Approve scope** — Let the maintainer accept, narrow, or omit discovery scope before analysis begins.
4. **Analyze drift** — Load existing Gherkin scenarios, compare them to current code, tests, and documentation, and categorize behavior, documentation, test, and organization drift.
5. **Resolve conflicts** — When evidence sources disagree, surface authority questions with **no default** source of truth.
6. **Inject specify context** — Pass drift findings, proposed update/delete/merge intent, test mappings, assumptions, and unresolved ambiguity into the normal specify interview.
7. **Complete specify only** — Produce exactly one \`specs/{id}-{slug}/spec.md\` with standard headings plus repository sections. Write \`workflow-state.json\` with \`lastCompletedStepId: specify\`.
8. **Stop** — Do not run plan, tasks, or implement automatically. Do not write \`living-specs/\` files or mutate tests during specify.

## Required specify output sections

- Repository Discovery Evidence
- Drift Findings
- Proposed Living Spec Changes
- Test Coverage Mapping
- Unresolved Ambiguity
- Assumptions and Limitations

## Drift categories

- **behavior** — Living spec no longer matches observed product behavior.
- **documentation** — Docs or wording are stale while executable behavior is stable.
- **test** — Tests are missing, stale, or contradict behavior or specs.
- **organization** — Scenarios should merge, delete, or regroup without behavior change.

Unchanged scenarios are confirmed but must **not** be proposed again as duplicate living-spec work.

## Machine-readable operations (MCP / CLI only)

- \`repository_workflow_types_list\`
- \`repository_workflow_start\`
- \`repository_workflow_drift_run\`
- CLI \`spec-n-roll repository-workflow drift run\`
- Normal specify lifecycle tools (\`step_output_instantiate\`, \`workflow_state_write\`, \`task_spec_status_set\`)

Living specs under \`living-specs/\` and test files remain downstream implementation work.

## User input

\`\`\`text
$ARGUMENTS
\`\`\`

Optional scope notes or maintainer goal for the drift refresh run.
`,
    toolkitVersion,
  );
}

/**
 * Returns project-relative workflow skill files and their expected toolkit content.
 *
 * @returns Skill file paths paired with UTF-8 markdown bodies.
 */
export function listWorkflowSkillUpdates(): Array<{ relativePath: string; content: string }> {
  const toolkitVersion = readToolkitPackageVersion();

  return [
    {
      relativePath: SPECIFY_SKILL_RELATIVE_PATH,
      content: buildSpecifySkillContent(toolkitVersion),
    },
    {
      relativePath: CLARIFY_SKILL_RELATIVE_PATH,
      content: buildClarifySkillContent(toolkitVersion),
    },
    { relativePath: ROLL_SKILL_RELATIVE_PATH, content: buildRollSkillContent(toolkitVersion) },
    { relativePath: PLAN_SKILL_RELATIVE_PATH, content: buildPlanSkillContent(toolkitVersion) },
    { relativePath: TASKS_SKILL_RELATIVE_PATH, content: buildTasksSkillContent(toolkitVersion) },
    {
      relativePath: ANALYZE_SKILL_RELATIVE_PATH,
      content: buildAnalyzeSkillContent(toolkitVersion),
    },
    {
      relativePath: IMPLEMENT_SKILL_RELATIVE_PATH,
      content: buildImplementSkillContent(toolkitVersion),
    },
    {
      relativePath: MANIFESTO_SKILL_RELATIVE_PATH,
      content: buildManifestoSkillContent(toolkitVersion),
    },
    {
      relativePath: REPOSITORY_ONBOARDING_SKILL_RELATIVE_PATH,
      content: buildRepositoryOnboardingSkillContent(toolkitVersion),
    },
    {
      relativePath: REPOSITORY_DRIFT_SKILL_RELATIVE_PATH,
      content: buildRepositoryDriftSkillContent(toolkitVersion),
    },
  ];
}

/**
 * Writes workflow agent skill files into `.agents/skills/`.
 *
 * @param projectRoot - Absolute path to the project root.
 */
export async function generateWorkflowSkills(projectRoot: string): Promise<void> {
  await ensureAgentSkillsDirectory(projectRoot);

  for (const skill of listWorkflowSkillUpdates()) {
    const absolutePath = path.join(projectRoot, skill.relativePath);
    await fse.ensureDir(path.dirname(absolutePath));
    await atomicWriteText(absolutePath, skill.content);
  }
}
