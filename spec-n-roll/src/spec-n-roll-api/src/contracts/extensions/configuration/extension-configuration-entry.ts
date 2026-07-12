/**
 * Stores enabled state for one extension registration.
 */
export interface ExtensionConfigurationEntry {
  /**
   * Controls whether the extension is eligible for discovery.
   */
  readonly enabled: boolean;
}
