import type { Command } from 'commander';

/**
 * Contract for Commander command registration classes wired through dependency injection.
 */
export interface CliCommand {
  /**
   * Attaches this command's verbs and options to the given Commander node.
   *
   * @param command - Parent Commander program or subcommand group.
   */
  register(command: Command): void;
}
