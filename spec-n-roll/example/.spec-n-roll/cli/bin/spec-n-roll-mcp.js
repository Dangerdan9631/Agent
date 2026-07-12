#!/usr/bin/env node

// src/index.ts
import "reflect-metadata";

// src/composition/mcp/mcp-program-factory.ts
import { Command } from "commander";

// src/composition/mcp/mcp-container-factory.ts
import { container } from "tsyringe";
import { Logger } from "tslog";

// src/infrastructure/commands/mcp-command-runner.ts
import chalk from "chalk";
var McpCommandRunner = class {
  /**
   * Creates an MCP command runner.
   *
   * @param logger - Logger used to emit the command's diagnostic and output messages.
   */
  constructor(logger) {
    this.logger = logger;
  }
  logger;
  /**
   * Executes the command action and logs the stub output.
   */
  run() {
    this.logger.debug("Running MCP stub.");
    this.logger.info(chalk.green("spec-n-roll-mcp"));
  }
};

// src/composition/mcp/mcp-container-factory.ts
var McpContainerFactory = class {
  /**
   * Creates a dependency container factory.
   *
   * @param logger - Diagnostic logger shared by command services.
   */
  constructor(logger = new Logger({
    name: "spec-n-roll-mcp",
    minLevel: 6
  })) {
    this.logger = logger;
  }
  logger;
  /**
   * Identifies the command runner registration in the executable container.
   */
  commandRunnerToken = "spec-n-roll-mcp.commandRunner";
  /**
   * Creates a dependency container for one MCP command invocation.
   *
   * @returns A child dependency container with command execution services registered.
   */
  create() {
    const commandContainer = container.createChildContainer();
    commandContainer.registerInstance(
      this.commandRunnerToken,
      new McpCommandRunner(this.logger)
    );
    return commandContainer;
  }
};

// src/composition/mcp/mcp-program-factory.ts
var McpProgramFactory = class {
  /**
   * Creates an MCP program factory.
   *
   * @param containerFactory - Dependency container factory for command services.
   */
  constructor(containerFactory = new McpContainerFactory()) {
    this.containerFactory = containerFactory;
  }
  containerFactory;
  /**
   * Creates the MCP command line program.
   *
   * @returns A commander program configured for the MCP executable.
   */
  create() {
    return new Command().name("spec-n-roll-mcp").description("Runs the spec-n-roll MCP server process.").version("0.1.0").action(() => {
      this.containerFactory.create().resolve(this.containerFactory.commandRunnerToken).run();
    });
  }
};

// src/presentation/cli/mcp-cli.ts
var McpCli = class {
  /**
   * Creates MCP command-line wiring.
   *
   * @param programFactory - Factory for the Commander MCP program.
   */
  constructor(programFactory = new McpProgramFactory()) {
    this.programFactory = programFactory;
  }
  programFactory;
  /**
   * Runs the MCP executable stub.
   *
   * @param argv - Process argument vector including executable and script path.
   */
  run(argv = process.argv) {
    this.programFactory.create().parse([...argv]);
  }
};

// src/index.ts
new McpCli().run(process.argv);
export {
  McpCli,
  McpCommandRunner,
  McpContainerFactory,
  McpProgramFactory
};
//# sourceMappingURL=index.js.map