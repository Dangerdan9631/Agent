import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  SPEC_N_ROLL_CONFIG_DIRECTORY_NAME,
  type ExtensionConfiguration,
  type ExtensionConfigurationEntry,
} from 'spec-n-roll-api';
import type { ExtensionDiscoverer } from '#runtime/application/extensions/extension-discoverer.js';

/**
 * Reads extension enabled-state configuration from the project filesystem.
 */
export class NodeExtensionDiscoverer implements ExtensionDiscoverer {
  /**
   * Reads and validates the project's extension configuration without loading extensions.
   *
   * @param projectRoot - Absolute project root containing `.spec-n-roll`.
   * @returns Validated extension configuration.
   */
  async discover(projectRoot: string): Promise<ExtensionConfiguration> {
    const configurationPath = join(
      projectRoot,
      SPEC_N_ROLL_CONFIG_DIRECTORY_NAME,
      'extensions',
      'extensions.json',
    );
    const content = await readFile(configurationPath, 'utf8');
    return this.parse(JSON.parse(content) as unknown, configurationPath);
  }

  /**
   * Validates the JSON shape used to control extension discovery.
   *
   * @param value - Parsed JSON document to validate.
   * @param configurationPath - Absolute file path included in validation errors.
   * @returns Validated extension configuration.
   */
  private parse(
    value: unknown,
    configurationPath: string,
  ): ExtensionConfiguration {
    if (!this.isRecord(value) || !this.isRecord(value.agents)) {
      throw new Error(
        `Extension configuration at ${configurationPath} is invalid.`,
      );
    }

    const agents: Record<string, ExtensionConfigurationEntry> = {};
    for (const [name, entry] of Object.entries(value.agents)) {
      if (!this.isRecord(entry) || typeof entry.enabled !== 'boolean') {
        throw new Error(
          `Extension configuration at ${configurationPath} is invalid.`,
        );
      }
      agents[name] = { enabled: entry.enabled };
    }
    return { agents };
  }

  /**
   * Determines whether a value is a non-array object record.
   *
   * @param value - Unknown value to inspect.
   * @returns true when the value is an object record.
   */
  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
