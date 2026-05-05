import type { ValidationResult } from '../types/validation';

/**
 * Options for the {@link IAgentConfigApi.validate} operation.
 *
 * @example
 * const { results } = await api.validate({});
 * const errors = results.filter(r => r.level === 'error');
 */
export interface ValidateOptions {
  /**
   * Path to the `.agentconfig/` directory to validate.
   *
   * When omitted the implementation walks up from the current working directory
   * until it finds an `.agentconfig/` folder, mirroring the behaviour of the
   * `agentconfig validate` CLI command.
   */
  configPath?: string;
}

/**
 * The result of a {@link IAgentConfigApi.validate} operation.
 *
 * An empty `results` array means the configuration is fully valid.
 * Errors indicate problems that would prevent generation from succeeding;
 * warnings and info items are advisory and do not block generation.
 *
 * @example
 * const { results } = await api.validate({});
 * if (results.some(r => r.level === 'error')) {
 *   console.error('Configuration has errors — fix them before generating.');
 * }
 */
export interface ValidateResult {
  /**
   * All diagnostics produced by the validator, ordered by severity
   * (errors first, then warnings, then info).
   *
   * Each entry carries a human-readable `message`, a `level`, and an
   * optional `file` path pointing to the source that triggered the issue.
   *
   * @see {@link ValidationResult}
   */
  results: ValidationResult[];
}
