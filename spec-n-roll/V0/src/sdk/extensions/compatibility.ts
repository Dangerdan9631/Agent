import path from 'node:path';
import fse from 'fs-extra';

import type { ExtensionManifest } from './manifest.js';

/**
 * One extension manifest paired with its registration id for compatibility checks.
 */
export interface ExtensionCompatibilityInput {
  /**
   * Extension id used in workflow configuration and compatibility declarations.
   */
  id: string;
  /**
   * Parsed extension manifest including targetToolkitVersion.
   */
  manifest: ExtensionManifest;
}

/**
 * One known-incompatible pairing between an extension and a toolkit release.
 */
interface IncompatibleCombination {
  /**
   * Extension id that is incompatible with the listed toolkit version.
   */
  extensionId: string;
  /**
   * Toolkit semver where the incompatibility applies.
   */
  toolkitVersion: string;
  /**
   * Optional human-readable reason surfaced in update warnings.
   */
  reason?: string;
}

/**
 * Shape of `.spec-n-roll/compatibility.json` refreshed on toolkit install and update.
 */
interface CompatibilityDocument {
  /**
   * Advisory list of extension and toolkit pairings known to be incompatible.
   */
  incompatibleCombinations: IncompatibleCombination[];
}

/**
 * Loads the project compatibility matrix when present.
 *
 * @param projectRoot - Absolute path to the initialized project root.
 * @returns Parsed compatibility document or an empty matrix when missing.
 */
async function loadCompatibilityDocument(projectRoot: string): Promise<CompatibilityDocument> {
  const compatibilityPath = path.join(projectRoot, '.spec-n-roll', 'compatibility.json');

  if (!(await fse.pathExists(compatibilityPath))) {
    return { incompatibleCombinations: [] };
  }

  const raw: unknown = await fse.readJson(compatibilityPath);
  if (typeof raw !== 'object' || raw == null) {
    return { incompatibleCombinations: [] };
  }

  const record = raw as Record<string, unknown>;
  if (!Array.isArray(record.incompatibleCombinations)) {
    return { incompatibleCombinations: [] };
  }

  const incompatibleCombinations: IncompatibleCombination[] = [];
  for (const entry of record.incompatibleCombinations) {
    if (typeof entry !== 'object' || entry == null) {
      continue;
    }

    const combo = entry as Record<string, unknown>;
    if (typeof combo.extensionId === 'string' && typeof combo.toolkitVersion === 'string') {
      incompatibleCombinations.push({
        extensionId: combo.extensionId,
        toolkitVersion: combo.toolkitVersion,
        reason: typeof combo.reason === 'string' ? combo.reason : undefined,
      });
    }
  }

  return { incompatibleCombinations };
}

/**
 * Checks configured extensions against the compatibility matrix and manifest targets.
 *
 * @param projectRoot - Absolute path to the initialized project root.
 * @param targetToolkitVersion - Toolkit semver being installed by the current update.
 * @param extensions - Extension manifests to evaluate.
 * @returns Advisory warning messages that never block update execution.
 */
export async function checkExtensionCompatibility(
  projectRoot: string,
  targetToolkitVersion: string,
  extensions: readonly ExtensionCompatibilityInput[],
): Promise<string[]> {
  const compatibility = await loadCompatibilityDocument(projectRoot);
  const warnings: string[] = [];

  for (const extension of extensions) {
    for (const combo of compatibility.incompatibleCombinations) {
      if (combo.extensionId === extension.id && combo.toolkitVersion === targetToolkitVersion) {
        const reasonSuffix =
          combo.reason != null && combo.reason.length > 0 ? `: ${combo.reason}` : '';
        warnings.push(
          `Extension "${extension.id}" is listed as incompatible with toolkit ${targetToolkitVersion} (manifest targets ${extension.manifest.targetToolkitVersion})${reasonSuffix}`,
        );
      }
    }
  }

  return warnings;
}
