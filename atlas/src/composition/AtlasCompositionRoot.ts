import { WorkspaceLoader } from '#application/workspace/WorkspaceLoader.js';
import { GenerateArchitecture } from '#application/diagram/GenerateArchitecture.js';
import { GenerateDiagram } from '#application/diagram/GenerateDiagram.js';
import { DiagramProjectionService } from '#application/diagram/DiagramProjectionService.js';
import { ArchitectureValidator } from '#application/validation/ArchitectureValidator.js';
import { CircularDependencyRuleEvaluator } from '#application/validation/CircularDependencyRuleEvaluator.js';
import { DependencyDirectionRuleEvaluator } from '#application/validation/DependencyDirectionRuleEvaluator.js';
import { ForbiddenExternalRuleEvaluator } from '#application/validation/ForbiddenExternalRuleEvaluator.js';
import { ForbiddenImportRuleEvaluator } from '#application/validation/ForbiddenImportRuleEvaluator.js';
import { PackageOwnershipResolver } from '#application/validation/PackageOwnershipResolver.js';
import { RuleSelectorMatcher } from '#application/validation/RuleSelectorMatcher.js';
import { RuntimeToSupportRuleEvaluator } from '#application/validation/RuntimeToSupportRuleEvaluator.js';
import { ValidateArchitecture } from '#application/validation/ValidateArchitecture.js';
import { JsonAtlasConfigurationLoader } from '#infrastructure/configuration/JsonAtlasConfigurationLoader.js';
import { TslogAtlasLogger } from '#infrastructure/logging/TslogAtlasLogger.js';
import { ProcessRuntimeOutputWriter } from '#infrastructure/output/ProcessRuntimeOutputWriter.js';
import { DependencyCruiserAnalyzer } from '#infrastructure/validation/DependencyCruiserAnalyzer.js';
import { NodeDependencyAnalysisArtifactWriter } from '#infrastructure/artifacts/NodeDependencyAnalysisArtifactWriter.js';
import { NodeDiagramArtifactWriter } from '#infrastructure/artifacts/NodeDiagramArtifactWriter.js';
import { TypeScriptDeclarationGraphBuilder } from '#infrastructure/graph/TypeScriptDeclarationGraphBuilder.js';
import { DeterministicLayoutService } from '#application/layout/DeterministicLayoutService.js';
import { LayoutArchitecture } from '#application/layout/LayoutArchitecture.js';
import { ViewArtifacts } from '#application/view/ViewArtifacts.js';
import { CleanArtifacts } from '#application/clean/CleanArtifacts.js';
import { NodeWorkspacePackageDiscoverer } from '#infrastructure/workspace/WorkspacePackageDiscoverer.js';
import { NodeWorkspacePathResolver } from '#infrastructure/workspace/NodeWorkspacePathResolver.js';
import { PackagePolicySelector } from '#infrastructure/workspace/PackagePolicySelector.js';
import { NodeArtifactServer } from '#infrastructure/server/NodeArtifactServer.js';
import { NodeArtifactBrowser } from '#infrastructure/server/NodeArtifactBrowser.js';
import { AtlasCli } from '#presentation/cli/AtlasCli.js';
import { NodeArtifactCleaner } from '#infrastructure/artifacts/NodeArtifactCleaner.js';

/**
 * Constructs Atlas's concrete runtime dependency graph.
 */
export class AtlasCompositionRoot {
  /**
   * Creates the command-line adapter with its concrete runtime dependencies.
   *
   * @returns Ready command-line adapter for one Atlas process invocation.
   */
  public createCli(): AtlasCli {
    const logger = new TslogAtlasLogger();
    const workspaceLoader = new WorkspaceLoader(
      new NodeWorkspacePathResolver(),
      new JsonAtlasConfigurationLoader(),
      new NodeWorkspacePackageDiscoverer(new PackagePolicySelector()),
      logger
    );
    const ownershipResolver = new PackageOwnershipResolver();
    const selectorMatcher = new RuleSelectorMatcher(ownershipResolver);
    const architectureValidator = new ArchitectureValidator([
      new CircularDependencyRuleEvaluator(),
      new RuntimeToSupportRuleEvaluator(ownershipResolver),
      new DependencyDirectionRuleEvaluator(selectorMatcher),
      new ForbiddenImportRuleEvaluator(selectorMatcher),
      new ForbiddenExternalRuleEvaluator(selectorMatcher)
    ]);
    const validationWorkflow = new ValidateArchitecture(
      workspaceLoader,
      new DependencyCruiserAnalyzer(),
      new NodeDependencyAnalysisArtifactWriter(),
      architectureValidator
    );
    const layoutService = new DeterministicLayoutService();
    const diagramArtifactWriter = new NodeDiagramArtifactWriter(layoutService);
    const graphBuilder = new TypeScriptDeclarationGraphBuilder();
    const projectionService = new DiagramProjectionService();
    const generationWorkflow = new GenerateArchitecture(
      validationWorkflow,
      graphBuilder,
      projectionService,
      diagramArtifactWriter
    );
    const diagramWorkflow = new GenerateDiagram(
      validationWorkflow,
      graphBuilder,
      projectionService,
      diagramArtifactWriter
    );
    const layoutWorkflow = new LayoutArchitecture(
      validationWorkflow,
      graphBuilder,
      projectionService,
      layoutService,
      diagramArtifactWriter
    );
    const viewWorkflow = new ViewArtifacts(
      workspaceLoader,
      new NodeArtifactServer(layoutService, new JsonAtlasConfigurationLoader()),
      new NodeArtifactBrowser()
    );
    const cleanWorkflow = new CleanArtifacts(workspaceLoader, new NodeArtifactCleaner());

    return new AtlasCli(
      logger,
      new ProcessRuntimeOutputWriter(),
      validationWorkflow,
      generationWorkflow,
      diagramWorkflow,
      layoutWorkflow,
      viewWorkflow,
      cleanWorkflow
    );
  }
}
