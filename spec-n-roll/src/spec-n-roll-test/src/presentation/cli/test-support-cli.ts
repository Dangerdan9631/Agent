import { TestSupportProgramFactory } from '#test-support/composition/test-support/test-support-program-factory.js';

/**
 * Owns test support executable command-line parsing.
 */
export class TestSupportCli {
  /**
   * Creates test support command-line wiring.
   *
   * @param programFactory - Factory for the Commander test support program.
   */
  constructor(
    private readonly programFactory = new TestSupportProgramFactory(),
  ) {}

  /**
   * Runs the test support executable stub.
   *
   * @param argv - Process argument vector including executable and script path.
   */
  run(argv: readonly string[] = process.argv): void {
    this.programFactory.create().parse([...argv]);
  }
}
