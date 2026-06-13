import path from 'node:path';
import fse from 'fs-extra';

import { extensionManifestSchema, type ExtensionManifest } from '../extensions/manifest.js';
import { atomicWriteJson } from '../core/atomic-write.js';
import { claudeCodeGenerator } from './generators/claude-code.js';
import { codexGenerator } from './generators/codex.js';
import { copilotGenerator } from './generators/copilot.js';
import { cursorGenerator } from './generators/cursor.js';
import type { BundledAgentGenerator } from './generators/types.js';

/**
 * Relative directory under `.spec-n-roll/` where extension manifests are installed.
 */
export const BUNDLED_EXTENSIONS_RELATIVE_DIR = '.spec-n-roll/bundled-extensions';

/**
 * All out-of-the-box agent generators keyed by extension id.
 */
export const BUNDLED_AGENT_GENERATORS: Record<string, BundledAgentGenerator> = {
  cursor: cursorGenerator,
  'claude-code': claudeCodeGenerator,
  copilot: copilotGenerator,
  codex: codexGenerator,
};

/**
 * Summary of a agent extension for listing and selection UIs.
 */
export interface BundledAgentSummary {
  /**
   * Stable extension id matching manifest.id and workflow.config.json.
   */
  id: string;
  /**
   * Human-readable agent display name from the extension manifest.
   */
  name: string;
}

/**
 * Returns sorted ids for all agent extensions.
 *
 * @returns Stable list of agent extension ids.
 */
export function listBundledAgentIds(): string[] {
  return Object.keys(BUNDLED_AGENT_GENERATORS).sort();
}

/**
 * Returns sorted summaries for all agent extensions.
 *
 * @returns Stable list of agent id and display name pairs.
 */
export function listBundledAgents(): BundledAgentSummary[] {
  return listBundledAgentIds().map((id) => {
    const generator = getBundledAgentGenerator(id);
    return {
      id,
      name: generator?.manifest.name ?? id,
    };
  });
}

/**
 * Resolves a agent generator by extension id.
 *
 * @param agentId - Extension id such as `cursor`.
 * @returns Matching generator or null when the id is unknown.
 */
export function getBundledAgentGenerator(agentId: string): BundledAgentGenerator | null {
  return BUNDLED_AGENT_GENERATORS[agentId] ?? null;
}

/**
 * Validates that each selected agent id maps to a generator.
 *
 * @param agentIds - Requested agent ids from init or add-agent flows.
 * @returns Validated non-empty agent id list.
 */
export function validateSelectedAgentIds(agentIds: readonly string[]): string[] {
  if (agentIds.length === 0) {
    throw new Error('At least one agent must be selected.');
  }

  const validated: string[] = [];
  for (const agentId of agentIds) {
    if (getBundledAgentGenerator(agentId) == null) {
      throw new Error(`Unknown agent id: ${agentId}`);
    }
    validated.push(agentId);
  }

  return validated;
}

/**
 * Returns the project-relative extension directory for an agent id.
 *
 * @param agentId - Extension id.
 * @returns Project-relative path such as `.spec-n-roll/bundled-extensions/cursor`.
 */
export function bundledExtensionRelativeDir(agentId: string): string {
  return path.posix.join(BUNDLED_EXTENSIONS_RELATIVE_DIR, agentId);
}

/**
 * Copies extension manifests into the project for the selected agents.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param agentIds - Selected agent ids to install.
 */
export async function installBundledExtensions(
  projectRoot: string,
  agentIds: readonly string[],
): Promise<void> {
  for (const agentId of agentIds) {
    const generator = getBundledAgentGenerator(agentId);
    if (generator == null) {
      throw new Error(`Unknown agent id: ${agentId}`);
    }

    const manifestPath = path.join(
      projectRoot,
      bundledExtensionRelativeDir(agentId),
      'manifest.json',
    );
    await atomicWriteJson(manifestPath, generator.manifest);
  }
}

/**
 * Loads and validates a extension manifest from an initialized project.
 *
 * @param projectRoot - Absolute path to the project root.
 * @param agentId - Extension id to load.
 * @returns Parsed and validated extension manifest.
 */
export async function loadBundledExtensionManifest(
  projectRoot: string,
  agentId: string,
): Promise<ExtensionManifest> {
  const manifestPath = path.join(
    projectRoot,
    bundledExtensionRelativeDir(agentId),
    'manifest.json',
  );

  if (!(await fse.pathExists(manifestPath))) {
    throw new Error(`Extension manifest not found for agent: ${agentId}`);
  }

  const raw: unknown = await fse.readJson(manifestPath);
  const manifest = extensionManifestSchema.parse(raw);

  if (manifest.agentSetup?.mcpConfig == null) {
    throw new Error(`Bundled agent extension ${agentId} is missing agentSetup.mcpConfig`);
  }

  return manifest;
}
