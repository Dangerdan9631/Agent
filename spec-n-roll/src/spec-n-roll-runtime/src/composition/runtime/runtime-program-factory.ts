import { Command } from 'commander';
import { RuntimeApplication } from '#runtime/application/runtime/runtime-application.js';

/**
 * Builds the internal runtime command line program.
 */
export class RuntimeProgramFactory {
  /**
   * Creates the internal runtime command line program.
   *
   * @param application - Runtime application invoked by the command action.
   * @returns Commander program configured for the runtime executable.
   */
  create(application: RuntimeApplication): Command {
    return new Command()
      .name('spec-n-roll-runtime')
      .description('Runs spec-n-roll runtime commands from dispatcher stdin.')
      .version('0.1.0')
      .allowUnknownOption(true)
      .allowExcessArguments(true)
      .action(() => {
        application.run();
      });
  }
}
