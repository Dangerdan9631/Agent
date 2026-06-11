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
 * Writes /spec-n-specify and /spec-n-clarify skill files into `.agents/skills/`.
 *
 * @param projectRoot - Absolute path to the project root.
 */
export async function generateWorkflowSkills(projectRoot: string): Promise<void> {
  await ensureAgentSkillsDirectory(projectRoot);

  const specifyPath = path.join(projectRoot, SPECIFY_SKILL_RELATIVE_PATH);
  const clarifyPath = path.join(projectRoot, CLARIFY_SKILL_RELATIVE_PATH);

  await fse.ensureDir(path.dirname(specifyPath));
  await fse.ensureDir(path.dirname(clarifyPath));

  await atomicWriteText(specifyPath, buildSpecifySkillContent());
  await atomicWriteText(clarifyPath, buildClarifySkillContent());
}
