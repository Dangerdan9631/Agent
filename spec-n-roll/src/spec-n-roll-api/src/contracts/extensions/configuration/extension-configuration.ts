import type { ExtensionConfigurationEntry } from '#api/contracts/extensions/configuration/extension-configuration-entry.js';

/**
 * Groups configured extensions by extension type and stable extension identifier.
 */
export interface ExtensionConfiguration {
  /**
   * Configured agent extensions keyed by folder name.
   */
  readonly agents: Readonly<Record<string, ExtensionConfigurationEntry>>;
}
