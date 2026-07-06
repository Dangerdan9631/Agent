import { join } from 'node:path';
import { Command } from 'commander';
import { ArchitectureArtifactGenerator } from '#arch/application/artifacts/architecture-artifact-generator.js';
import { ArchitectureViewerHttpServer } from '#arch/infrastructure/http/architecture-viewer-http-server.js';
import { WorkspaceRootResolver } from '#arch/infrastructure/workspace/workspace-root-resolver.js';

/**
 * Writes architecture viewer startup information to the command user.
 */
interface ArchitectureViewerOutputWriter {
  /**
   * Writes a single user-facing line.
   *
   * @param text - Human-readable line to write without a trailing newline.
   */
  writeLine(text: string): void;
}

/**
 * Writes architecture viewer command output to stdout.
 */
class ProcessArchitectureViewerOutputWriter implements ArchitectureViewerOutputWriter {
  /**
   * Writes a single user-facing line to stdout.
   *
   * @param text - Human-readable line to write without a trailing newline.
   */
  writeLine(text: string): void {
    process.stdout.write(`${text}\n`);
  }
}

/**
 * Builds the architecture command line program.
 */
export class ArchProgramFactory {
  /**
   * Creates an architecture program factory.
   *
   * @param generator - Architecture artifact generation workflow.
   * @param viewerServer - Local HTTP server for viewing diagrams and persisting layout files.
   * @param workspaceRootResolver - Resolver for the repository root used by viewer startup.
   * @param viewerOutputWriter - Writer for user-facing viewer startup output.
   */
  constructor(
    private readonly generator = new ArchitectureArtifactGenerator(),
    private readonly viewerServer = new ArchitectureViewerHttpServer(),
    private readonly workspaceRootResolver = new WorkspaceRootResolver(),
    private readonly viewerOutputWriter = new ProcessArchitectureViewerOutputWriter(),
  ) {}

  /**
   * Creates the architecture command line program.
   *
   * @returns A commander program configured for architecture artifact generation and viewing.
   */
  create(): Command {
    const program = new Command()
      .name('spec-n-roll-arch')
      .description(
        'Generates and serves spec-n-roll architecture dependency artifacts.',
      )
      .version('0.1.0')
      .action(() => {
        this.generator.generate();
      });

    program
      .command('view')
      .description(
        'Serves generated architecture diagrams and autosaves layout changes.',
      )
      .option(
        '--host <host>',
        'Host interface for the local viewer.',
        '127.0.0.1',
      )
      .option(
        '--port <port>',
        'Port for the local viewer. Use 0 for an available port.',
        '4173',
      )
      .action(async (options: { host: string; port: string }) => {
        const workspaceRoot = this.workspaceRootResolver.resolve();
        const runningServer = await this.viewerServer.start({
          artifactRoot: join(
            workspaceRoot,
            'src',
            'spec-n-roll-arch',
            'architecture',
          ),
          host: options.host,
          port: Number.parseInt(options.port, 10),
        });

        this.viewerOutputWriter.writeLine(
          `Architecture viewer running at ${runningServer.url}`,
        );
        this.viewerOutputWriter.writeLine('Press Ctrl+C to stop the viewer.');
      });

    return program;
  }
}
