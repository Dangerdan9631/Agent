import { McpProgramFactory } from '#mcp/composition/mcp/mcp-program-factory.js';

/**
 * Owns MCP executable command-line parsing.
 */
export class McpCli {
  /**
   * Creates MCP command-line wiring.
   *
   * @param programFactory - Factory for the Commander MCP program.
   */
  constructor(private readonly programFactory = new McpProgramFactory()) {}

  /**
   * Runs the MCP executable stub.
   *
   * @param argv - Process argument vector including executable and script path.
   */
  run(argv: readonly string[] = process.argv): void {
    this.programFactory.create().parse([...argv]);
  }
}
