import { ReadingList } from "@atlas-example/lib/ReadingList";

import { ReadingListCommand } from "./ReadingListCommand.js";

/**
 * Composes and runs the TypeScript reading-list command-line application.
 */
export class Program {
  /**
   * Executes one reading-list command from process-style arguments.
   *
   * @param argumentsToParse - Arguments after the executable path.
   * @returns Process-compatible completion status.
   */
  public run(argumentsToParse: readonly string[]): number {
    const title = argumentsToParse.join(" ");
    new ReadingListCommand(new ReadingList(), process.stdout).execute(title);
    return 0;
  }
}
