import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  listWorkflowSkillUpdates,
  MANAGED_SKILL_AUTHOR,
} from '../../src/agents/generators/workflow-skills.js';
import { parseFrontmatterDocument } from '../../src/core/frontmatter.js';
import { runInit } from '../../src/cli/commands/init.js';
import { runUpdate } from '../../src/cli/commands/update.js';
import { readToolkitPackageVersion } from '../../src/cli/commands/version.js';

const tempDirs: string[] = [];

/**
 * Creates a temporary project directory for workflow skill metadata contract tests.
 *
 * @param prefix - Prefix for the temp directory name.
 * @returns Absolute path to the created directory.
 */
function createTempProject(prefix: string): string {
  const dir = path.join(os.tmpdir(), `spec-n-roll-skill-metadata-${prefix}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir != null) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup.
      }
    }
  }
});

describe('workflow skills metadata contract', () => {
  it('managed skills include metadata.author spec-n-roll and toolkit version', () => {
    const toolkitVersion = readToolkitPackageVersion();
    const managedSkills = listWorkflowSkillUpdates();

    expect(managedSkills.length).toBeGreaterThan(0);

    for (const skill of managedSkills) {
      const { frontmatter } = parseFrontmatterDocument(skill.content);
      const metadata = frontmatter.metadata;

      expect(metadata, `${skill.relativePath} missing metadata block`).toEqual(
        expect.objectContaining({
          author: MANAGED_SKILL_AUTHOR,
          version: toolkitVersion,
        }),
      );
      expect(frontmatter.name).toBeTruthy();
      expect(frontmatter.description).toBeTruthy();
    }
  });

  it('skill refresh does not overwrite user-owned skills outside managed manifest', async () => {
    if (!existsSync(path.resolve('dist/cli/index.js'))) {
      throw new Error('Build output missing. Run `npm run build` before contract tests.');
    }

    const projectRoot = createTempProject('user-skill');
    const userSkillRelativePath = '.agents/skills/my-custom-skill/SKILL.md';
    const userSkillPath = path.join(projectRoot, userSkillRelativePath);
    const userSkillContent = `---
name: "my-custom-skill"
description: "User-authored skill that must survive toolkit refresh."
---

# My Custom Skill

User-owned content.
`;

    await runInit({ projectRoot, agents: ['cursor'] });

    mkdirSync(path.dirname(userSkillPath), { recursive: true });
    writeFileSync(userSkillPath, userSkillContent, 'utf8');

    const managedPaths = new Set(
      listWorkflowSkillUpdates().map((skill) => skill.relativePath),
    );

    const result = await runUpdate({ projectRoot });

    expect(readFileSync(userSkillPath, 'utf8')).toBe(userSkillContent);
    expect(result.overwrittenFiles).not.toContain(userSkillRelativePath);

    for (const managedPath of managedPaths) {
      expect(result.overwrittenFiles).toContain(managedPath);

      const { frontmatter } = parseFrontmatterDocument(
        readFileSync(path.join(projectRoot, managedPath), 'utf8'),
      );
      const metadata = frontmatter.metadata as Record<string, unknown>;

      expect(metadata.author).toBe(MANAGED_SKILL_AUTHOR);
      expect(metadata.version).toBe(readToolkitPackageVersion());
    }
  });
});
