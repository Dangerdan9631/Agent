import fse from 'fs-extra';
import { parse, stringify } from 'yaml';

import { taskSpecFilePath } from './paths.js';
import { assertTaskSpecWritable } from './task-lifecycle.js';
import { atomicWriteText } from './atomic-write.js';

/**
 * Parsed markdown document with YAML frontmatter and body content.
 */
export interface FrontmatterDocument {
  /** Frontmatter key-value pairs; empty when no frontmatter block is present. */
  frontmatter: Record<string, unknown>;
  /** Markdown body after the frontmatter block. */
  body: string;
}

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/**
 * Splits a markdown file into YAML frontmatter and body content.
 *
 * @param content - Full markdown file text.
 * @returns Parsed frontmatter document.
 */
export function parseFrontmatterDocument(content: string): FrontmatterDocument {
  const match = FRONTMATTER_PATTERN.exec(content);
  if (match == null) {
    return { frontmatter: {}, body: content };
  }

  const parsed = parse(match[1]);
  const frontmatter =
    parsed != null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};

  return { frontmatter, body: match[2] ?? '' };
}

/**
 * Serializes frontmatter and body into a markdown document string.
 *
 * @param document - Frontmatter fields and markdown body to serialize.
 * @returns Markdown text with an optional YAML frontmatter block.
 */
export function serializeFrontmatterDocument(document: FrontmatterDocument): string {
  if (Object.keys(document.frontmatter).length === 0) {
    return document.body;
  }

  const yamlBlock = stringify(document.frontmatter).trimEnd();
  return `---\n${yamlBlock}\n---\n${document.body}`;
}

/**
 * Reads non-status frontmatter fields from `spec.md` for a task spec.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @returns Parsed frontmatter map (may be empty when `spec.md` is absent).
 */
export async function readSpecFrontmatter(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
): Promise<Record<string, unknown>> {
  const filePath = taskSpecFilePath(projectRoot, taskSpecId, slug, 'spec.md');
  if (!(await fse.pathExists(filePath))) {
    return {};
  }

  const content = await fse.readFile(filePath, 'utf8');
  return parseFrontmatterDocument(content).frontmatter;
}

/**
 * Merges non-status frontmatter fields into `spec.md` via the core library.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @param fields - Frontmatter keys to merge; `status` is rejected (use task lifecycle).
 * @returns Updated frontmatter snapshot after the merge.
 */
export async function updateSpecFrontmatter(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
  fields: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if ('status' in fields) {
    throw new Error('status must be updated via task lifecycle, not spec frontmatter update');
  }

  await assertTaskSpecWritable(projectRoot, taskSpecId, slug);

  const filePath = taskSpecFilePath(projectRoot, taskSpecId, slug, 'spec.md');
  if (!(await fse.pathExists(filePath))) {
    throw new Error(`spec.md does not exist for task spec ${taskSpecId}-${slug}`);
  }

  const content = await fse.readFile(filePath, 'utf8');
  const document = parseFrontmatterDocument(content);
  const merged = { ...document.frontmatter, ...fields };
  const nextContent = serializeFrontmatterDocument({ frontmatter: merged, body: document.body });

  await atomicWriteText(filePath, nextContent);
  return merged;
}

/**
 * Writes frontmatter fields when instantiating a template; allows `status` at creation time.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param taskSpecId - Zero-padded numeric task spec id.
 * @param slug - Kebab-case slug paired with the task spec id.
 * @param fields - Frontmatter values to merge into the new `spec.md`.
 */
export async function applyInitialSpecFrontmatter(
  projectRoot: string,
  taskSpecId: string,
  slug: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const filePath = taskSpecFilePath(projectRoot, taskSpecId, slug, 'spec.md');
  if (!(await fse.pathExists(filePath))) {
    throw new Error(`spec.md does not exist for task spec ${taskSpecId}-${slug}`);
  }

  const content = await fse.readFile(filePath, 'utf8');
  const document = parseFrontmatterDocument(content);
  const merged = { ...document.frontmatter, ...fields };
  const nextContent = serializeFrontmatterDocument({ frontmatter: merged, body: document.body });
  await atomicWriteText(filePath, nextContent);
}
