import { resolve } from 'node:path';
import type { InitCommandRequest } from '#runtime/application/init/init-command-request.js';

/**
 * Resolves the optional positional or flagged root accepted by the init command.
 */
export class InitCommandResolver {
  /**
   * Resolves an init request from dispatcher-preserved arguments.
   *
   * @param argv - CLI arguments without the executable and script paths.
   * @param cwd - Working directory used when no root is supplied.
   * @param configuredRoot - Absolute dispatcher-resolved root for a root flag.
   * @returns Resolved request, or undefined when the invocation is not init.
   */
  resolve(
    argv: readonly string[],
    cwd: string,
    configuredRoot?: string,
  ): InitCommandRequest | undefined {
    const initIndex = argv.indexOf('init');
    if (initIndex < 0) return undefined;

    const flaggedRoot = this.flagValue(argv, '--root');
    const positionalRoot = argv[initIndex + 1];
    if (flaggedRoot != null && configuredRoot != null) {
      return { projectRoot: configuredRoot };
    }

    const requestedRoot =
      flaggedRoot ??
      (positionalRoot != null && !positionalRoot.startsWith('-')
        ? positionalRoot
        : '.');

    return { projectRoot: resolve(cwd, requestedRoot) };
  }

  /**
   * Reads a string option in either separated or equals form.
   *
   * @param argv - Full dispatcher-preserved argument list.
   * @param option - Long option name including its leading dashes.
   * @returns Supplied option value, otherwise undefined.
   */
  private flagValue(
    argv: readonly string[],
    option: string,
  ): string | undefined {
    const separatedIndex = argv.indexOf(option);
    if (separatedIndex >= 0) return argv[separatedIndex + 1];
    return argv
      .find((value) => value.startsWith(`${option}=`))
      ?.slice(option.length + 1);
  }
}
