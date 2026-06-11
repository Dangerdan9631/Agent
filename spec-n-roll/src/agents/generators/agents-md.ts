import path from 'node:path';

import { atomicWriteText } from '../../core/atomic-write.js';

/**
 * Project-relative path to the canonical toolkit-owned agent rules file.
 */
export const CANONICAL_AGENTS_MD_RELATIVE_PATH = '.spec-n-roll/AGENTS.md';

/**
 * Returns markdown content for the canonical agent rules file.
 *
 * @returns UTF-8 markdown describing workflow commands and MCP tool usage.
 */
export function buildCanonicalAgentsMdContent(): string {
  return `# Spec-n-Roll Agent Rules

This file is the canonical source for spec-n-roll workflow guidance in this project.

## Workflow commands

Use these slash commands to drive the specification-driven workflow:

- \`/spec-n-specify <description>\` — create or refine a task specification
- \`/spec-n-clarify\` — follow-up clarification for the active task spec
- \`/spec-n-plan\` — produce a plan for the active task spec
- \`/spec-n-tasks\` — break work into actionable tasks
- \`/spec-n-analyze\` — cross-artifact quality analysis
- \`/spec-n-implement\` — implement with living-spec and TDD discipline
- \`/spec-n-roll\` — advance the workflow to the next incomplete step

## Machine-readable mutations

Deterministic state changes MUST go through the project-local MCP server at
\`.spec-n-roll/cli/bin/spec-n-roll-mcp\` (stdio transport). Matching CLI subcommands
are available for developers.

MCP tools include workflow state read/write, task spec status, project metadata,
task checkbox updates, step output instantiation, and spec frontmatter updates.

## Living specifications

Living Gherkin feature files under \`living-specs/\` are agent-managed and outside
the MCP/CLI mutation boundary.
`;
}

/**
 * Writes the canonical toolkit-owned AGENTS.md rules file for the project.
 *
 * @param projectRoot - Absolute path to the project root.
 */
export async function writeCanonicalAgentsMd(projectRoot: string): Promise<void> {
  const filePath = path.join(projectRoot, CANONICAL_AGENTS_MD_RELATIVE_PATH);
  await atomicWriteText(filePath, buildCanonicalAgentsMdContent());
}

/**
 * Builds a thin pointer document that references the canonical rules file.
 *
 * @param pointerLabel - Short label for the native agent file (e.g. Cursor rules).
 * @returns UTF-8 markdown pointing readers to canonical rules.
 */
export function buildRulesPointerContent(pointerLabel: string): string {
  return `# ${pointerLabel}

Canonical spec-n-roll workflow rules live in [.spec-n-roll/AGENTS.md](.spec-n-roll/AGENTS.md).

Read and follow that file for workflow commands, MCP usage, and living-spec guidance.
`;
}
