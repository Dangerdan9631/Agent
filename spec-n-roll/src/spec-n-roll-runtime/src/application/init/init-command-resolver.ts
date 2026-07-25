import { resolve } from 'node:path';
import type { InitCommandRequest } from '#runtime/application/init/init-command-request.js';

/**
 * Resolves the root and built-in agents selected by the init command.
 */
export class InitCommandResolver {
  /**
   * Built-in agent extension names accepted by project initialization.
   */
  private static readonly builtInAgents = ['codex', 'cursor'] as const;
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
      return { projectRoot: configuredRoot, agents: this.agents(argv) };
    }

    const requestedRoot =
      flaggedRoot ??
      (positionalRoot != null && !positionalRoot.startsWith('-')
        ? positionalRoot
        : '.');

    return {
      projectRoot: resolve(cwd, requestedRoot),
      agents: this.agents(argv),
    };
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

  /**
   * Resolves repeatable agent flags and preserves the established all-agent default.
   *
   * @param argv - Full dispatcher-preserved argument list.
   * @returns Unique, supported built-in agent names.
   */
  private agents(argv: readonly string[]): readonly string[] {
    const selected = argv.flatMap((value, index) => {
      if (value === '--agent') {
        const agent = argv[index + 1];
        if (agent == null || agent.startsWith('-'))
          throw new Error('The --agent option requires a built-in agent name.');
        return [agent];
      }
      return value.startsWith('--agent=')
        ? [value.slice('--agent='.length)]
        : [];
    });
    if (selected.length === 0) return InitCommandResolver.builtInAgents;
    const invalid = selected.find(
      (agent) =>
        !InitCommandResolver.builtInAgents.includes(
          agent as 'codex' | 'cursor',
        ),
    );
    if (invalid != null)
      throw new Error(
        `Unknown built-in agent "${invalid}". Choose codex or cursor.`,
      );
    return [...new Set(selected)];
  }
}
