import { Command } from 'commander';
import { ArchitectureArtifactGenerator } from '#arch/architecture-artifact-generator.js';

/**
 * Builds the architecture command line program.
 */
export class ArchProgramFactory {
  /**
   * Creates an architecture program factory.
   *
   * @param generator - Architecture artifact generation workflow.
   */
  constructor(
    private readonly generator = new ArchitectureArtifactGenerator(),
  ) {}

  /**
   * Creates the architecture command line program.
   *
   * @returns A commander program configured for architecture artifact generation.
   */
  create(): Command {
    return new Command()
      .name('spec-n-roll-arch')
      .description('Generates spec-n-roll architecture dependency artifacts.')
      .version('0.1.0')
      .action(() => {
        this.generator.generate();
      });
  }
}
