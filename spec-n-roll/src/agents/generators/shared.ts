import path from 'node:path';
import fse from 'fs-extra';

import { atomicWriteText } from '../../core/atomic-write.js';
import { buildRulesPointerContent } from './agents-md.js';

/**
 * Ensures the shared `.agents/skills` directory exists for generated skills.
 *
 * @param projectRoot - Absolute path to the project root.
 */
export async function ensureAgentSkillsDirectory(projectRoot: string): Promise<void> {
  await fse.ensureDir(path.join(projectRoot, '.agents', 'skills'));
}

/**
 * Writes a thin native rules pointer file for an agent environment.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param relativePath - Project-relative pointer file path.
 * @param pointerLabel - Human-readable label for the pointer document.
 */
export async function writeRulesPointerFile(
  projectRoot: string,
  relativePath: string,
  pointerLabel: string,
): Promise<void> {
  const filePath = path.join(projectRoot, relativePath);
  await atomicWriteText(filePath, buildRulesPointerContent(pointerLabel));
}

/**
 * Writes a Cursor rules pointer file in `.mdc` format referencing canonical rules.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param relativePath - Project-relative Cursor rules file path.
 */
export async function writeCursorRulesPointer(
  projectRoot: string,
  relativePath: string,
): Promise<void> {
  const filePath = path.join(projectRoot, relativePath);
  const content = `---
description: Spec-n-Roll workflow rules pointer
globs: *
alwaysApply: true
---

Canonical spec-n-roll workflow rules live in [.spec-n-roll/AGENTS.md](../../.spec-n-roll/AGENTS.md).
`;
  await atomicWriteText(filePath, content);
}
