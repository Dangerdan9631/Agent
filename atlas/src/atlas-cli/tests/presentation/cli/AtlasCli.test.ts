import type { AtlasLogContext, AtlasLogger } from '#application/shared/logging/AtlasLogger.js';
import type { RuntimeOutputWriter } from '#application/shared/output/RuntimeOutputWriter.js';
import type { AtlasConfiguration } from '#application/configuration/model/AtlasConfiguration.js';
import { ArchitectureValidationResult } from '#application/validation/model/ArchitectureValidationResult.js';
import { ArchitectureViolation } from '#application/validation/model/ArchitectureViolation.js';
import { ValidationCommandResult } from '#application/validation/model/ValidationCommandResult.js';
import type { ArchitectureValidationWorkflow } from '#application/validation/ports/ArchitectureValidationWorkflow.js';
import type { ArchitectureGenerationWorkflow } from '#application/diagram/ports/ArchitectureGenerationWorkflow.js';
import type { ArchitectureDiagramWorkflow } from '#application/diagram/ports/ArchitectureDiagramWorkflow.js';
import { ArchitectureGenerationResult } from '#application/diagram/model/ArchitectureGenerationResult.js';
import { DeclarationGraph } from '#application/graph/model/DeclarationGraph.js';
import type { ArchitectureLayoutResult } from '#application/layout/model/ArchitectureLayoutResult.js';
import type { LayoutOverrides } from '#application/layout/model/LayoutDocument.js';
import type { ArchitectureLayoutWorkflow } from '#application/layout/ports/ArchitectureLayoutWorkflow.js';
import type { CleanArtifactsWorkflow } from '#application/clean/ports/CleanArtifactsWorkflow.js';
import type { WorkspaceLoadingRequest } from '#application/workspace/model/WorkspaceLoadingRequest.js';
import { ResolvedWorkspacePaths } from '#application/workspace/model/ResolvedWorkspacePaths.js';
import { WorkspacePackage } from '#application/workspace/model/WorkspacePackage.js';
import { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';
import { ArtifactServerLocation } from '#application/view/model/ArtifactServerLocation.js';
import type { ViewArtifactsWorkflow } from '#application/view/ports/ViewArtifactsWorkflow.js';
import { AtlasCli } from '#presentation/cli/AtlasCli.js';
import { describe, expect, it } from 'vitest';

/**
 * Captures user-facing output for command-line adapter tests.
 */
class CapturingOutputWriter implements RuntimeOutputWriter {
  /**
   * Holds lines written to standard output.
   */
  public readonly lines: string[] = [];

  /**
   * Holds lines written to standard error.
   */
  public readonly errorLines: string[] = [];

  /**
   * Records one user-facing output line.
   *
   * @param message - Output line captured from the command adapter.
   */
  public writeLine(message: string): void {
    this.lines.push(message);
  }

  /**
   * Records one user-facing error line.
   *
   * @param message - Error line captured from the command adapter.
   */
  public writeErrorLine(message: string): void {
    this.errorLines.push(message);
  }
}

/**
 * Discards diagnostic events while allowing command-line adapter tests to run in isolation.
 */
class SilentAtlasLogger implements AtlasLogger {
  /**
   * Discards trace diagnostics.
   *
   * @param message - Trace message ignored by the test logger.
   * @param context - Trace context ignored by the test logger.
   */
  public trace(_message: string, _context: AtlasLogContext): void {}

  /**
   * Discards debug diagnostics.
   *
   * @param message - Debug message ignored by the test logger.
   * @param context - Debug context ignored by the test logger.
   */
  public debug(_message: string, _context: AtlasLogContext): void {}

  /**
   * Discards informational diagnostics.
   *
   * @param message - Informational message ignored by the test logger.
   * @param context - Informational context ignored by the test logger.
   */
  public info(_message: string, _context: AtlasLogContext): void {}

  /**
   * Discards warning diagnostics.
   *
   * @param message - Warning message ignored by the test logger.
   * @param context - Warning context ignored by the test logger.
   */
  public warn(_message: string, _context: AtlasLogContext): void {}

  /**
   * Discards error diagnostics.
   *
   * @param message - Error message ignored by the test logger.
   * @param context - Error context ignored by the test logger.
   */
  public error(_message: string, _context: AtlasLogContext): void {}
}

/**
 * Rejects validation when tests exercise commands that do not require it.
 */
class UnreachableValidationWorkflow implements ArchitectureValidationWorkflow {
  /**
   * Rejects unexpected validation during command-shell tests.
   *
   * @param request - Workspace request that should not be used by this test.
   * @returns A rejected validation promise.
   */
  public execute(_request: WorkspaceLoadingRequest): Promise<ValidationCommandResult> {
    return Promise.reject(new Error('Validation was not expected.'));
  }
}

/**
 * Rejects generation when tests exercise commands that do not require artifact creation.
 */
class UnreachableGenerationWorkflow implements ArchitectureGenerationWorkflow {
  /**
   * Rejects unexpected artifact generation during command-shell tests.
   *
   * @param request - Workspace request that should not be used by this test.
   * @param skipValidation - Validation bypass setting that should not be used by this test.
   * @returns A rejected generation promise.
   */
  public execute(
    _request: WorkspaceLoadingRequest,
    _skipValidation: boolean
  ): Promise<ArchitectureGenerationResult> {
    return Promise.reject(new Error('Generation was not expected.'));
  }
}

/**
 * Rejects scoped diagram work when tests exercise commands that do not require it.
 */
class UnreachableDiagramWorkflow implements ArchitectureDiagramWorkflow {
  /**
   * Rejects unexpected scoped generation during command-shell tests.
   *
   * @param request - Workspace request that should not be used by this test.
   * @param scope - Diagram scope that should not be used by this test.
   * @param skipValidation - Validation bypass setting that should not be used by this test.
   * @returns A rejected generation promise.
   */
  public execute(
    _request: WorkspaceLoadingRequest,
    _scope: string,
    _skipValidation: boolean
  ): Promise<ArchitectureGenerationResult> {
    return Promise.reject(new Error('Scoped diagram generation was not expected.'));
  }
}

/**
 * Rejects layout work when tests exercise commands that do not require it.
 */
class UnreachableLayoutWorkflow implements ArchitectureLayoutWorkflow {
  /**
   * Rejects unexpected layout work during command-shell tests.
   *
   * @param request - Workspace request that should not be used by this test.
   * @param scope - Diagram scope that should not be used by this test.
   * @param overrides - Layout overrides that should not be used by this test.
   * @param generateArtifacts - Artifact generation setting that should not be used by this test.
   * @returns A rejected layout promise.
   */
  public execute(
    _request: WorkspaceLoadingRequest,
    _scope: string,
    _overrides: LayoutOverrides,
    _generateArtifacts: boolean
  ): Promise<ArchitectureLayoutResult> {
    return Promise.reject(new Error('Layout was not expected.'));
  }
}

/**
 * Rejects cleanup work when tests exercise commands that do not require artifact deletion.
 */
class UnreachableCleanWorkflow implements CleanArtifactsWorkflow {
  /**
   * Rejects unexpected cleanup during command-shell tests.
   *
   * @param request - Workspace request that should not be used by this test.
   * @returns A rejected cleanup promise.
   */
  public execute(_request: WorkspaceLoadingRequest): Promise<number> {
    return Promise.reject(new Error('Cleanup was not expected.'));
  }
}

/**
 * Returns a stable validation result for validate-command presentation tests.
 */
class FixedValidationWorkflow implements ArchitectureValidationWorkflow {
  /**
   * Creates a deterministic workflow result with optional validation violations.
   *
   * @param violations - Violations returned to the command presentation adapter.
   */
  public constructor(private readonly violations: readonly ArchitectureViolation[] = []) {}

  /**
   * Returns a deterministic fixture validation result without filesystem access.
   *
   * @param request - Workspace request accepted by the fixture loader.
   * @returns Ready validation result for the validate command.
   */
  public execute(_request: WorkspaceLoadingRequest): Promise<ValidationCommandResult> {
    const configuration: AtlasConfiguration = {
      schemaVersion: 1,
      discovery: { packages: [{ match: { name: '@demo/app' }, classification: 'runtime' }] }
    };
    const workspacePackage = new WorkspacePackage(
      '@demo/app',
      '/workspace',
      '.',
      ['/workspace/src'],
      'runtime',
      [],
      undefined
    );
    const workspace = new WorkspaceSnapshot(
      new ResolvedWorkspacePaths(
        '/workspace',
        '/workspace/atlas.config.json',
        '/workspace/architecture'
      ),
      configuration,
      [workspacePackage]
    );
    return Promise.resolve(
      new ValidationCommandResult(workspace, [], new ArchitectureValidationResult(this.violations))
    );
  }
}

/**
 * Captures generation dispatch options while returning a minimal successful result.
 */
class RecordingGenerationWorkflow implements ArchitectureGenerationWorkflow {
  /**
   * Holds the validation-bypass setting received from the command adapter.
   */
  public skipValidation: boolean | undefined;

  /**
   * Returns a successful minimal generation result while recording command intent.
   *
   * @param request - Workspace request accepted by the fixture validation workflow.
   * @param skipValidation - Validation-bypass setting parsed by the command adapter.
   * @returns Completed generation result with an empty semantic graph.
   */
  public async execute(
    request: WorkspaceLoadingRequest,
    skipValidation: boolean
  ): Promise<ArchitectureGenerationResult> {
    this.skipValidation = skipValidation;
    const validationResult = await new FixedValidationWorkflow().execute(request);
    return new ArchitectureGenerationResult(validationResult, new DeclarationGraph([], []), []);
  }
}

/**
 * Captures local viewer dispatch options without opening a network listener.
 */
class RecordingViewWorkflow implements ViewArtifactsWorkflow {
  /** Captures the selected host. */
  public host: string | undefined;

  /** Captures the selected TCP port. */
  public port: number | undefined;

  /** Captures whether browser opening was requested. */
  public openBrowser: boolean | undefined;

  /**
   * Records viewer command intent and returns a stable ready location.
   *
   * @param request - Workspace request accepted without filesystem access.
   * @param host - Selected local server interface.
   * @param port - Selected local TCP port.
   * @param openBrowser - Selected browser-opening behavior.
   * @returns Stable local viewer location.
   */
  public execute(
    _request: WorkspaceLoadingRequest,
    host: string,
    port: number,
    openBrowser: boolean
  ): Promise<ArtifactServerLocation> {
    this.host = host;
    this.port = port;
    this.openBrowser = openBrowser;
    return Promise.resolve(
      new ArtifactServerLocation('http://127.0.0.1:4321/landscape/index.html')
    );
  }
}

/**
 * Verifies the initial command-line presentation shell.
 */
describe('AtlasCli', () => {
  /**
   * Verifies that the command shell accepts a later-phase command without loading a workspace.
   */
  it('reports the selected pending command', async () => {
    const outputWriter = new CapturingOutputWriter();
    const cli = new AtlasCli(
      new SilentAtlasLogger(),
      outputWriter,
      new UnreachableValidationWorkflow(),
      new UnreachableGenerationWorkflow(),
      new UnreachableDiagramWorkflow(),
      new UnreachableLayoutWorkflow(),
      new UnreachableCleanWorkflow()
    );

    const exitCode = await cli.run(['clean', '--confirm']);

    expect(exitCode).toBe(2);
    expect(outputWriter.errorLines).toEqual(['Cleanup was not expected.']);
  });

  /**
   * Verifies that validate loads and reports the explicitly selected package set.
   */
  it('loads the workspace before validation', async () => {
    const outputWriter = new CapturingOutputWriter();
    const cli = new AtlasCli(
      new SilentAtlasLogger(),
      outputWriter,
      new FixedValidationWorkflow(),
      new UnreachableGenerationWorkflow(),
      new UnreachableDiagramWorkflow(),
      new UnreachableLayoutWorkflow(),
      new UnreachableCleanWorkflow()
    );

    const exitCode = await cli.run(['validate']);

    expect(exitCode).toBe(0);
    expect(outputWriter.lines).toEqual(['Validated 1 package(s) with 0 warning(s).']);
  });

  /**
   * Verifies that error-severity violations use the validation failure exit code.
   */
  it('fails validation when an error violation exists', async () => {
    const outputWriter = new CapturingOutputWriter();
    const violation = new ArchitectureViolation(
      'no-cycle',
      'error',
      'src/a.ts',
      'src/b.ts',
      ['src/a.ts', 'src/b.ts'],
      'Break the cycle.'
    );
    const cli = new AtlasCli(
      new SilentAtlasLogger(),
      outputWriter,
      new FixedValidationWorkflow([violation]),
      new UnreachableGenerationWorkflow(),
      new UnreachableDiagramWorkflow(),
      new UnreachableLayoutWorkflow(),
      new UnreachableCleanWorkflow()
    );

    const exitCode = await cli.run(['validate']);

    expect(exitCode).toBe(1);
    expect(outputWriter.errorLines).toEqual([
      '[error] no-cycle: src/a.ts -> src/b.ts. Break the cycle.'
    ]);
  });

  /**
   * Verifies that generation passes the explicit validation-bypass option through unchanged.
   */
  it('passes --no-validate to generation', async () => {
    const outputWriter = new CapturingOutputWriter();
    const generationWorkflow = new RecordingGenerationWorkflow();
    const cli = new AtlasCli(
      new SilentAtlasLogger(),
      outputWriter,
      new UnreachableValidationWorkflow(),
      generationWorkflow,
      new UnreachableDiagramWorkflow(),
      new UnreachableLayoutWorkflow(),
      new UnreachableCleanWorkflow()
    );

    const exitCode = await cli.run(['generate', '--no-validate']);

    expect(exitCode).toBe(0);
    expect(generationWorkflow.skipValidation).toBe(true);
    expect(outputWriter.lines).toEqual([
      'Generated 0 diagram scope(s) under /workspace/architecture.'
    ]);
  });

  /**
   * Verifies that destructive cleanup cannot dispatch without explicit confirmation.
   */
  it('rejects clean without --confirm before cleanup dispatch', async () => {
    const outputWriter = new CapturingOutputWriter();
    const cli = new AtlasCli(
      new SilentAtlasLogger(),
      outputWriter,
      new UnreachableValidationWorkflow(),
      new UnreachableGenerationWorkflow(),
      new UnreachableDiagramWorkflow(),
      new UnreachableLayoutWorkflow(),
      new UnreachableCleanWorkflow()
    );

    const exitCode = await cli.run(['clean']);

    expect(exitCode).toBe(2);
    expect(outputWriter.errorLines).toEqual([
      'Atlas clean requires --confirm because it removes generated artifacts.'
    ]);
  });

  /**
   * Verifies that invalid layout options fail before the layout workflow is dispatched.
   */
  it('rejects invalid layout arguments', async () => {
    const outputWriter = new CapturingOutputWriter();
    const cli = new AtlasCli(
      new SilentAtlasLogger(),
      outputWriter,
      new UnreachableValidationWorkflow(),
      new UnreachableGenerationWorkflow(),
      new UnreachableDiagramWorkflow(),
      new UnreachableLayoutWorkflow(),
      new UnreachableCleanWorkflow()
    );

    const exitCode = await cli.run(['layout', 'landscape', '--rows', '0']);

    expect(exitCode).toBe(2);
    expect(outputWriter.errorLines).toEqual(['Atlas --rows must be a positive integer.']);
  });

  /**
   * Verifies the restored local viewer command delegates through the neutral hosting workflow.
   */
  it('starts the artifact viewer with explicit network and browser options', async () => {
    const outputWriter = new CapturingOutputWriter();
    const viewWorkflow = new RecordingViewWorkflow();
    const cli = new AtlasCli(
      new SilentAtlasLogger(),
      outputWriter,
      new UnreachableValidationWorkflow(),
      new UnreachableGenerationWorkflow(),
      new UnreachableDiagramWorkflow(),
      new UnreachableLayoutWorkflow(),
      new UnreachableCleanWorkflow(),
      undefined,
      viewWorkflow
    );

    const exitCode = await cli.run(['view', '--host', 'localhost', '--port', '0', '--open']);

    expect(exitCode).toBe(0);
    expect(viewWorkflow.host).toBe('localhost');
    expect(viewWorkflow.port).toBe(0);
    expect(viewWorkflow.openBrowser).toBe(true);
    expect(outputWriter.lines).toEqual([
      'Atlas viewer running at http://127.0.0.1:4321/landscape/index.html',
      'Press Ctrl+C to stop the viewer.'
    ]);
  });
});
