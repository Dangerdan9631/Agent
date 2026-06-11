import path from 'node:path';
import fse from 'fs-extra';

import { atomicWriteText } from '../../core/atomic-write.js';
import { ensureAgentSkillsDirectory } from './shared.js';

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
 * Returns markdown content for the /spec-n-specify agent skill.
 *
 * @returns UTF-8 markdown documenting specify workflow and MCP boundaries.
 */
export function buildSpecifySkillContent(): string {
  return `---
name: "spec-n-specify"
description: "Create a new task specification with embedded triage and a one-question-at-a-time interview."
---

# /spec-n-specify

Create a new task spec under \`specs/{numeric-id}-{slug}/\` from a feature description.

## Flow

1. **Triage (embedded)** — Evaluate complexity and propose papercut, quick, or full tier with rationale. Confirm or override with the developer before continuing.
2. **Allocate task spec id** — Use MCP \`project_metadata_read\` / \`project_metadata_write\` or matching CLI to allocate the next numeric id (handled by toolkit orchestration).
3. **Instantiate spec.md** — Call MCP \`step_output_instantiate\` with \`stepId: specify\` and \`frontmatter: { status: Active }\` **before** editing prose. CLI parallel: \`spec-n-roll step instantiate --task-spec-id <id> --slug <slug> --step-id specify --frontmatter status=Active\`.
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
`;
}

/**
 * Returns markdown content for the /spec-n-clarify agent skill.
 *
 * @returns UTF-8 markdown documenting clarify workflow and MCP boundaries.
 */
export function buildClarifySkillContent(): string {
  return `---
name: "spec-n-clarify"
description: "Follow-up clarification interview for an existing task specification."
---

# /spec-n-clarify

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
`;
}

/**
 * Returns markdown content for the /spec-n-roll agent skill.
 *
 * @returns UTF-8 markdown documenting roll advancement and intent detection.
 */
export function buildRollSkillContent(): string {
  return `---
name: "spec-n-roll"
description: "Advance the workflow to the next tier step with zero-knowledge intent detection."
---

# /spec-n-roll

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
`;
}

/**
 * Returns markdown content for the /spec-n-plan agent skill.
 *
 * @returns UTF-8 markdown documenting plan step workflow and MCP boundaries.
 */
export function buildPlanSkillContent(): string {
  return `---
name: "spec-n-plan"
description: "Create plan.md with living-spec targets for full-tier task specs."
---

# /spec-n-plan

Full-tier step that produces \`plan.md\` documenting approach and **Living Spec Targets**.

## Flow

1. **Instantiate plan.md** — Call MCP \`step_output_instantiate\` with \`stepId: plan\` **before** editing prose.
2. **Edit prose** — Fill Technical Context, Living Spec Targets table, and structure sections. Remove \`<!-- FILL:\` placeholders.
3. **Complete plan** — Write \`workflow-state.json\` with \`lastCompletedStepId: plan\` via MCP \`workflow_state_write\`.

Living specs under \`living-specs/\` remain agent-managed; plan.md only documents intended targets.

## Machine-readable mutations (MCP / CLI only)

- \`workflow-state.json\`
- Template instantiation for \`plan.md\`

## User input

\`\`\`text
$ARGUMENTS
\`\`\`

Optional planning notes. Tier-skipped when the workflow variant omits the plan step.
`;
}

/**
 * Returns markdown content for the /spec-n-tasks agent skill.
 *
 * @returns UTF-8 markdown documenting tasks step workflow and FR-009 ordering.
 */
export function buildTasksSkillContent(): string {
  return `---
name: "spec-n-tasks"
description: "Create tasks.md with living-spec updates as the first implementation tasks (FR-009)."
---

# /spec-n-tasks

Produces \`tasks.md\` for quick and full tiers. **FR-009**: the first implementation phase MUST list living-spec updates before any test or production code tasks.

## Flow

1. **Instantiate tasks.md** — Call MCP \`step_output_instantiate\` with \`stepId: tasks\` **before** editing prose.
2. **Preserve FR-009 ordering** — Keep "Living Specification Updates" as Phase 1; only add test/code tasks in later phases.
3. **Edit prose** — Fill task checkboxes and remove \`<!-- FILL:\` placeholders.
4. **Complete tasks** — Write \`workflow-state.json\` with \`lastCompletedStepId: tasks\` via MCP \`workflow_state_write\`.

## Machine-readable mutations (MCP / CLI only)

- \`workflow-state.json\`
- Template instantiation for \`tasks.md\`

## User input

\`\`\`text
$ARGUMENTS
\`\`\`

Optional task-generation hints. Omitted on papercut tier variants.
`;
}

/**
 * Returns markdown content for the /spec-n-analyze agent skill.
 *
 * @returns UTF-8 markdown documenting non-destructive cross-artifact analysis.
 */
export function buildAnalyzeSkillContent(): string {
  return `---
name: "spec-n-analyze"
description: "Non-destructive cross-artifact consistency report for the current task spec."
---

# /spec-n-analyze

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
`;
}

/**
 * Returns markdown content for the /spec-n-implement agent skill.
 *
 * @returns UTF-8 markdown documenting implementation entry expectations.
 */
export function buildImplementSkillContent(): string {
  return `---
name: "spec-n-implement"
description: "Begin implementation: living-spec updates first, then TDD from living specs."
---

# /spec-n-implement

Tier exit step. Begins after plan/tasks (or specify-only on papercut).

## Flow (orchestration expands in later toolkit phases)

1. **Living specs first (FR-009)** — Update \`living-specs/{domain}.feature\` files documented in \`plan.md\` and listed as the first tasks in \`tasks.md\` **before** any test or production code.
2. **Tag scenarios** — Add \`@spec-n-roll-{taskSpecId}\` to new or modified scenarios (additive; never remove prior tags).
3. **TDD cycle** — Run Cucumber against living specs; write failing tests, then code, then refactor.
4. **Complete implement** — Write \`workflow-state.json\` with workflow \`status: complete\` and lifecycle \`Complete\` via MCP tools when the tier finishes.

Living specs are agent-managed (outside MCP/CLI). Machine-readable workflow and lifecycle writes use MCP/CLI only.

## User input

\`\`\`text
$ARGUMENTS
\`\`\`

Optional implementation focus or vertical slice to start with.
`;
}

/**
 * Returns project-relative workflow skill files and their expected toolkit content.
 *
 * @returns Skill file paths paired with UTF-8 markdown bodies.
 */
export function listWorkflowSkillUpdates(): Array<{ relativePath: string; content: string }> {
  return [
    { relativePath: SPECIFY_SKILL_RELATIVE_PATH, content: buildSpecifySkillContent() },
    { relativePath: CLARIFY_SKILL_RELATIVE_PATH, content: buildClarifySkillContent() },
    { relativePath: ROLL_SKILL_RELATIVE_PATH, content: buildRollSkillContent() },
    { relativePath: PLAN_SKILL_RELATIVE_PATH, content: buildPlanSkillContent() },
    { relativePath: TASKS_SKILL_RELATIVE_PATH, content: buildTasksSkillContent() },
    { relativePath: ANALYZE_SKILL_RELATIVE_PATH, content: buildAnalyzeSkillContent() },
    { relativePath: IMPLEMENT_SKILL_RELATIVE_PATH, content: buildImplementSkillContent() },
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
