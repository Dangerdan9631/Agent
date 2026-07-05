import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import type { ArchitectureConfig } from '#arch/application/config/architecture-config.js';

/**
 * Reads user-editable architecture diagram configuration from the workspace root.
 */
export class ArchitectureConfigReader {
  /**
   * Reads the architecture configuration file when present.
   *
   * @param workspaceRoot - Absolute path to the repository root.
   * @returns Parsed architecture configuration, or an empty configuration when no file exists.
   */
  read(workspaceRoot: string): ArchitectureConfig {
    const configPath = join(
      workspaceRoot,
      'spec-n-roll.architecture.config.cjs',
    );
    if (!existsSync(configPath)) {
      return {};
    }

    const requireConfig = createRequire(import.meta.url);
    return requireConfig(configPath) as ArchitectureConfig;
  }
}
