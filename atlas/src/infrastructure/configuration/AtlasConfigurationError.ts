/**
 * Describes an invalid, unreadable, or unsupported Atlas configuration document.
 */
export class AtlasConfigurationError extends Error {
  /**
   * Creates an error with a configuration path and actionable explanation.
   *
   * @param configurationPath - Absolute or relative path identifying the failed configuration document.
   * @param detail - Concise explanation of the invalid or unreadable configuration state.
   */
  public constructor(
    public readonly configurationPath: string,
    detail: string
  ) {
    super(`Atlas configuration error at ${configurationPath}: ${detail}`);
    this.name = 'AtlasConfigurationError';
  }
}
