import type { DiffEntry } from '../types/diff';

/**
 * Options for the {@link IAgentConfigApi.diff} operation.
 *
 * Accepts the same location and target filters as
 * {@link GenerateOptions} but never writes any files to disk.
 *
 * @example
 * const { diff } = await api.diff({ targets: ['cursor'] });
 * const pendingChanges = diff.filter(e => e.action !== 'unchanged');
 */
export interface DiffOptions {
  /**
   * Path to the `.agentconfig/` directory to read from.
   *
   * When omitted the implementation walks up from the current working directory
   * until it finds an `.agentconfig/` folder, mirroring the behaviour of the
   * `agentconfig diff` CLI command.
   */
  configPath?: string;

  /**
   * Overrides the project root used to resolve the output directory when
   * computing what is currently on disk.
   *
   * Useful for comparing generated output against an alternate location
   * (e.g. a staging directory) without changing `agentconfig.yaml`.
   */
  projectRootOverride?: string;

  /**
   * Restricts the diff to a specific subset of registered targets.
   *
   * When omitted, every target listed in `agentconfig.yaml` is compared.
   *
   * @example ['cursor', 'copilot']
   */
  targets?: string[];
}

/**
 * The result of a {@link IAgentConfigApi.diff} operation.
 *
 * Contains one {@link DiffEntry} per file that would be affected by
 * generation, including files that are already up-to-date.
 *
 * @example
 * const { diff, outputDir } = await api.diff({});
 * console.log(`Comparing against: ${outputDir}`);
 * diff.forEach(e => console.log(e.action, e.path));
 */
export interface DiffResult {
  /**
   * Per-file comparison results between what would be generated and what
   * currently exists on disk.
   *
   * Each entry has an `action` of `'create'`, `'update'`, or `'unchanged'`
   * and, for non-unchanged entries, a unified diff string.
   *
   * @see {@link DiffEntry}
   */
  diff: DiffEntry[];

  /**
   * The absolute path to the directory that was (or would be) used as the
   * generation output root. Useful for displaying context alongside the diff.
   */
  outputDir: string;
}
