import { DiagramProjectionService } from '#application/diagram/DiagramProjectionService.js';
import { FederatedDeclarationGraphAdapter } from '#application/federation/FederatedDeclarationGraphAdapter.js';
import { FederatedDependencyAnalysisAdapter } from '#application/federation/FederatedDependencyAnalysisAdapter.js';
import type { AtlasLogContext, AtlasLogger } from '#application/shared/logging/AtlasLogger.js';
import { ArchitectureValidator } from '#application/validation/ArchitectureValidator.js';
import { CircularDependencyRuleEvaluator } from '#application/validation/CircularDependencyRuleEvaluator.js';
import { DependencyDirectionRuleEvaluator } from '#application/validation/DependencyDirectionRuleEvaluator.js';
import { ForbidRuleEvaluator } from '#application/validation/ForbidRuleEvaluator.js';
import { PackageOwnershipResolver } from '#application/validation/PackageOwnershipResolver.js';
import { RuleSelectorMatcher } from '#application/validation/RuleSelectorMatcher.js';
import { ValidateArchitecture } from '#application/validation/ValidateArchitecture.js';
import type { DependencyAnalysisResult } from '#application/validation/model/DependencyAnalysisResult.js';
import type { DependencyAnalysisArtifactWriter } from '#application/validation/ports/DependencyAnalysisArtifactWriter.js';
import { WorkspaceLoader } from '#application/workspace/WorkspaceLoader.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';
import { YamlAtlasConfigurationLoader } from '#infrastructure/configuration/YamlAtlasConfigurationLoader.js';
import { YamlDocumentCodec } from '#infrastructure/configuration/YamlDocumentCodec.js';
import { NodeAtlasWorkspaceLoader } from '#infrastructure/federation/NodeAtlasWorkspaceLoader.js';
import { NodeWorkspacePathResolver } from '#infrastructure/workspace/NodeWorkspacePathResolver.js';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Verifies a Kotlin-style portable manifest drives shared validation and diagram behavior.
 */
describe('Federated manifest integration', () => {
  /**
   * Applies classification, selectors, cycles, groups, and folders without source-platform discovery.
   */
  it('validates and projects module-local Kotlin models through the shared pipeline', async () => {
    const fixturePath = resolve('tests/fixtures/federated-kotlin');
    const documentCodec = new YamlDocumentCodec();
    const manifestLoader = new NodeAtlasWorkspaceLoader(documentCodec);
    const workspaceLoader = new WorkspaceLoader(
      new NodeWorkspacePathResolver(),
      new YamlAtlasConfigurationLoader(documentCodec),
      manifestLoader,
      new SilentAtlasLogger()
    );
    const graphAdapter = new FederatedDeclarationGraphAdapter();
    const ownershipResolver = new PackageOwnershipResolver();
    const selectorMatcher = new RuleSelectorMatcher(ownershipResolver);
    const validationWorkflow = new ValidateArchitecture(
      workspaceLoader,
      new IgnoringAnalysisArtifactWriter(),
      new ArchitectureValidator([
        new CircularDependencyRuleEvaluator(),
        new DependencyDirectionRuleEvaluator(selectorMatcher),
        new ForbidRuleEvaluator(selectorMatcher)
      ]),
      new FederatedDependencyAnalysisAdapter(graphAdapter)
    );
    const request = {
      invocationDirectoryPath: fixturePath,
      workspaceOption: fixturePath,
      configurationOption: undefined,
      outputOption: undefined
    };

    const validation = await validationWorkflow.execute(request);
    const modelWorkspace = validation.workspace.modelWorkspace;
    expect(modelWorkspace).toBeDefined();
    const graph = graphAdapter.toGraph(modelWorkspace!);
    const diagrams = new DiagramProjectionService().project(validation.workspace, graph);
    const scopes = diagrams.map((diagram) => diagram.scope);
    const applicationModuleId = 'dev.example:app:1.0.0';
    const supportModuleId = 'dev.example:test-support:1.0.0';
    const folder = diagrams.find(
      (diagram) => diagram.scope === `module:${encodeURIComponent(applicationModuleId)}:app-feature`
    );

    expect(validation.workspace.packages.map((workspacePackage) => workspacePackage.name)).toEqual([
      'dev.example:app:1.0.0',
      'dev.example:test-support:1.0.0'
    ]);
    expect(validation.validation.violations.map((violation) => violation.ruleId)).toEqual([
      'application-no-support',
      'dev.example:app:1.0.0:feature-no-support',
      'no-cycles'
    ]);
    expect(scopes).toContain(`module:${encodeURIComponent(applicationModuleId)}:app`);
    expect(scopes.some((scope) => scope.includes(encodeURIComponent(supportModuleId)))).toBe(false);
    expect(folder?.nodes.map((node) => node.id)).toEqual([
      'boundary:dev.example%253Atest-support%253A1.0.0%3Asupport-service',
      'dev.example%3Aapp%3A1.0.0:application-service'
    ]);
  });
});

/**
 * Discards raw analysis artifacts while retaining validation behavior under test.
 */
class IgnoringAnalysisArtifactWriter implements DependencyAnalysisArtifactWriter {
  /**
   * Completes without persisting the supplied analysis.
   *
   * @returns Fulfilled completion promise.
   */
  public write(
    _workspace: WorkspaceSnapshot,
    _analysisResults: readonly DependencyAnalysisResult[]
  ): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * Discards structured diagnostics emitted while loading the integration fixture.
 */
class SilentAtlasLogger implements AtlasLogger {
  /**
   * Discards one trace diagnostic.
   */
  public trace(_message: string, _context: AtlasLogContext): void {
    this.discard(_message, _context);
  }

  /**
   * Discards one debug diagnostic.
   */
  public debug(_message: string, _context: AtlasLogContext): void {
    this.discard(_message, _context);
  }

  /**
   * Discards one informational diagnostic.
   */
  public info(_message: string, _context: AtlasLogContext): void {
    this.discard(_message, _context);
  }

  /**
   * Discards one warning diagnostic.
   */
  public warn(_message: string, _context: AtlasLogContext): void {
    this.discard(_message, _context);
  }

  /**
   * Discards one error diagnostic.
   */
  public error(_message: string, _context: AtlasLogContext): void {
    this.discard(_message, _context);
  }

  /**
   * Consumes diagnostic values without retaining test-global state.
   */
  private discard(message: string, context: AtlasLogContext): void {
    void message;
    void context;
  }
}
