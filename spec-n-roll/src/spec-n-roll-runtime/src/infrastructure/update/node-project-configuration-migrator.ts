import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ProjectConfigurationMigrator } from 'spec-n-roll-sdk';
import { SPEC_N_ROLL_CONFIG_DIRECTORY_NAME } from 'spec-n-roll-api';

/**
 * Migrates persisted extension configuration to its canonical current schema.
 */
export class NodeProjectConfigurationMigrator implements ProjectConfigurationMigrator {
  /**
   * Loads the existing extensions configuration and writes its canonical form.
   *
   * @param projectRoot - Absolute project root containing `.spec-n-roll`.
   */
  migrate(projectRoot: string): void {
    const configurationPath = join(projectRoot, SPEC_N_ROLL_CONFIG_DIRECTORY_NAME, 'extensions', 'extensions.json');
    if (!existsSync(configurationPath)) return;
    const parsed = this.parse(configurationPath);
    const agents = this.readAgents(parsed, configurationPath);
    writeFileSync(configurationPath, `${JSON.stringify({ ...parsed, agents }, null, 2)}\n`, 'utf8');
  }

  /**
   * Parses one configuration document with a path-specific error.
   *
   * @param configurationPath - Absolute configuration file path.
   * @returns Parsed JSON object.
   */
  private parse(configurationPath: string): Record<string, unknown> {
    try {
      const value = JSON.parse(readFileSync(configurationPath, 'utf8')) as unknown;
      if (value == null || typeof value !== 'object' || Array.isArray(value)) throw new Error('root must be an object');
      return value as Record<string, unknown>;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Extension configuration at ${configurationPath} cannot be migrated: ${message}`);
    }
  }

  /**
   * Validates legacy-compatible agent registrations while preserving extensions.
   *
   * @param configuration - Parsed configuration root.
   * @param configurationPath - Absolute configuration file path.
   * @returns Canonical agent registration map.
   */
  private readAgents(configuration: Record<string, unknown>, configurationPath: string): Record<string, Record<string, unknown>> {
    const agents = configuration.agents;
    if (agents == null) return {};
    if (typeof agents !== 'object' || Array.isArray(agents)) throw new Error(`Extension configuration at ${configurationPath} cannot be migrated: agents must be an object.`);
    return Object.fromEntries(Object.entries(agents as Record<string, unknown>).map(([name, entry]) => {
      if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(`Extension configuration at ${configurationPath} cannot be migrated: agent ${name} must be an object.`);
      const registration = entry as Record<string, unknown>;
      if (typeof registration.enabled !== 'boolean') throw new Error(`Extension configuration at ${configurationPath} cannot be migrated: agent ${name} enabled must be a boolean.`);
      return [name, registration];
    }));
  }
}
