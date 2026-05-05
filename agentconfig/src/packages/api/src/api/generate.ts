import type { GenerateEvent } from '../types/generate';

/**
 * Options for the {@link IAgentConfigApi.generate} operation.
 *
 * Controls how agent-native directive files are generated from the
 * `.agentconfig/` source directory and where they are written.
 *
 * @example
 * // One-shot generation for a single target
 * await api.generate({ targets: ['cursor'] });
 *
 * @example
 * // Watch mode with verbose event logging
 * await api.generate({
 *   watch: true,
 *   onEvent(event) {
 *     if (event.type === 'generated') console.log('Written:', event.result.fileCount, 'files');
 *     if (event.type === 'error')     console.error('Error:', event.error);
 *   },
 * });
 */
export interface GenerateOptions {
  /**
   * Path to the `.agentconfig/` directory to read from.
   *
   * When omitted the implementation walks up from the current working directory
   * until it finds an `.agentconfig/` folder, mirroring the behaviour of the
   * `agentconfig generate` CLI command.
   */
  configPath?: string;

  /**
   * Overrides the project root used to resolve the output directory.
   *
   * Normally the output path is determined by the `options.output_dir` field
   * inside `agentconfig.yaml`. Setting this option replaces that value,
   * which is useful when generating files into a temporary or alternate
   * location (e.g. during tests or CI preview builds).
   */
  projectRootOverride?: string;

  /**
   * Restricts generation to a specific subset of registered targets.
   *
   * When omitted, every target listed in `agentconfig.yaml` is generated.
   * Target identifiers must match registered generator names exactly
   * (e.g. `'cursor'`, `'copilot'`, `'claude-code'`).
   *
   * @example ['cursor', 'copilot']
   */
  targets?: string[];

  /**
   * When `true`, keeps the process running and re-generates whenever a file
   * inside the `.agentconfig/` directory changes.
   *
   * Change events are reported via {@link onEvent} with type `'change'`.
   * The operation resolves only after the watcher is set up — it does
   * not resolve when the process ends.
   *
   * @default false
   */
  watch?: boolean;

  /**
   * Optional callback invoked for each significant event during generation.
   *
   * Implement this to build progress indicators, custom loggers, or to
   * integrate with a parent process event loop. In watch mode this callback
   * is the primary channel for receiving results and errors from subsequent
   * regenerations.
   *
   * @see {@link GenerateEvent} for the full discriminated-union of event shapes.
   */
  onEvent?: (event: GenerateEvent) => void;
}
