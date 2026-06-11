import type { ExtensionManifest } from '../../extensions/manifest.js';

/**
 * Bundled agent generator that emits native pointer files and skill scaffolding
 * from a validated extension manifest.
 */
export interface BundledAgentGenerator {
  /**
   * Stable bundled extension id matching manifest.id and workflow.config.json.
   */
  id: string;
  /**
   * Validated extension manifest copied into `.spec-n-roll/bundled-extensions/`.
   */
  manifest: ExtensionManifest;
  /**
   * Writes agent-specific pointer files and skill scaffolding for the project.
   *
   * @param projectRoot - Absolute path to the project root.
   */
  generate(projectRoot: string): Promise<void>;
}
