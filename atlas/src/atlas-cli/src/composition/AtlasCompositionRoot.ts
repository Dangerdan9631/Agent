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
import { YamlAtlasConfigurationLoader } from '#infrastructure/configuration/YamlAtlasConfigurationLoader.js';
import { YamlDocumentCodec } from '#infrastructure/configuration/YamlDocumentCodec.js';
import { TslogAtlasLogger } from '#infrastructure/logging/TslogAtlasLogger.js';
import { ProcessRuntimeOutputWriter } from '#infrastructure/output/ProcessRuntimeOutputWriter.js';
import { DependencyCruiserAnalyzer } from '#infrastructure/validation/DependencyCruiserAnalyzer.js';
import { NodeDependencyAnalysisArtifactWriter } from '#infrastructure/artifacts/NodeDependencyAnalysisArtifactWriter.js';
import { NodeDiagramArtifactWriter } from '#infrastructure/artifacts/NodeDiagramArtifactWriter.js';
import { TypeScriptDeclarationGraphBuilder } from '#infrastructure/graph/TypeScriptDeclarationGraphBuilder.js';
import { DeterministicLayoutService } from '#application/layout/DeterministicLayoutService.js';
import { LayoutArchitecture } from '#application/layout/LayoutArchitecture.js';
import { CleanArtifacts } from '#application/clean/CleanArtifacts.js';
import { NodeWorkspacePackageDiscoverer } from '#infrastructure/workspace/WorkspacePackageDiscoverer.js';
import { NodeWorkspacePathResolver } from '#infrastructure/workspace/NodeWorkspacePathResolver.js';
import { PackagePolicySelector } from '#infrastructure/workspace/PackagePolicySelector.js';
import { AtlasCli } from '#presentation/cli/AtlasCli.js';
import { NodeArtifactCleaner } from '#infrastructure/artifacts/NodeArtifactCleaner.js';
import { GenerateFederatedModels } from '#application/federation/GenerateFederatedModels.js';
import { TypeScriptWorkspaceModelGenerator } from '#infrastructure/federation/TypeScriptWorkspaceModelGenerator.js';
import { NodeAtlasWorkspaceLoader } from '#infrastructure/federation/NodeAtlasWorkspaceLoader.js';
import { FederatedDeclarationGraphAdapter } from '#application/federation/FederatedDeclarationGraphAdapter.js';
import { FederatedDependencyAnalysisAdapter } from '#application/federation/FederatedDependencyAnalysisAdapter.js';
import { ManifestWorkspacePackageResolver } from '#infrastructure/federation/ManifestWorkspacePackageResolver.js';
import { ViewArtifacts } from '#application/view/ViewArtifacts.js';
import { NodeArtifactServer } from '#infrastructure/server/NodeArtifactServer.js';
import { NodeArtifactBrowser } from '#infrastructure/server/NodeArtifactBrowser.js';
import { AtlasArtifactHost } from '#composition/AtlasArtifactHost.js';

/**
 * Constructs Atlas's concrete runtime dependency graph.
 */
export class AtlasCompositionRoot {
  /**
   * Creates a hosted artifact surface shared by Electron and browser presentation adapters.
   *
   * @returns Ready host that owns one constrained local artifact server.
   */
  public createArtifactHost(): AtlasArtifactHost {
    const logger = new TslogAtlasLogger();
    const policySelector = new PackagePolicySelector();
    const documentCodec = new YamlDocumentCodec();
    const manifestLoader = new NodeAtlasWorkspaceLoader(documentCodec);
    const configurationLoader = new YamlAtlasConfigurationLoader(documentCodec);
    const workspaceLoader = new WorkspaceLoader(
      new NodeWorkspacePathResolver(),
      configurationLoader,
      new NodeWorkspacePackageDiscoverer(policySelector),
      new ManifestWorkspacePackageResolver(manifestLoader, policySelector),
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
    const layoutService = new DeterministicLayoutService();
    const graphBuilder = new TypeScriptDeclarationGraphBuilder();
    const modelGenerator = new TypeScriptWorkspaceModelGenerator(graphBuilder, documentCodec);
    const federatedGraphAdapter = new FederatedDeclarationGraphAdapter();
    const validationWorkflow = new ValidateArchitecture(
      workspaceLoader,
      new DependencyCruiserAnalyzer(),
      new NodeDependencyAnalysisArtifactWriter(),
      architectureValidator,
      manifestLoader,
      new FederatedDependencyAnalysisAdapter(federatedGraphAdapter)
    );
    const generationWorkflow = new GenerateArchitecture(
      validationWorkflow,
      graphBuilder,
      new DiagramProjectionService(),
      new NodeDiagramArtifactWriter(layoutService),
      manifestLoader,
      federatedGraphAdapter,
      modelGenerator
    );
    const artifactServer = new NodeArtifactServer(
      layoutService,
      configurationLoader,
      documentCodec
    );
    return new AtlasArtifactHost(
      new ViewArtifacts(
        workspaceLoader,
        artifactServer,
        new NodeArtifactBrowser(),
        generationWorkflow
      ),
      artifactServer
    );
  }

  /**
   * Creates the command-line adapter with its concrete runtime dependencies.
   *
   * @returns Ready command-line adapter for one Atlas process invocation.
   */
  public createCli(): AtlasCli {
    const logger = new TslogAtlasLogger();
    const policySelector = new PackagePolicySelector();
    const documentCodec = new YamlDocumentCodec();
    const manifestLoader = new NodeAtlasWorkspaceLoader(documentCodec);
    const configurationLoader = new YamlAtlasConfigurationLoader(documentCodec);
    const workspaceLoader = new WorkspaceLoader(
      new NodeWorkspacePathResolver(),
      configurationLoader,
      new NodeWorkspacePackageDiscoverer(policySelector),
      new ManifestWorkspacePackageResolver(manifestLoader, policySelector),
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
    const layoutService = new DeterministicLayoutService();
    const diagramArtifactWriter = new NodeDiagramArtifactWriter(layoutService);
    const graphBuilder = new TypeScriptDeclarationGraphBuilder();
    const modelGenerator = new TypeScriptWorkspaceModelGenerator(graphBuilder, documentCodec);
    const federatedGraphAdapter = new FederatedDeclarationGraphAdapter();
    const validationWorkflow = new ValidateArchitecture(
      workspaceLoader,
      new DependencyCruiserAnalyzer(),
      new NodeDependencyAnalysisArtifactWriter(),
      architectureValidator,
      manifestLoader,
      new FederatedDependencyAnalysisAdapter(federatedGraphAdapter)
    );
    const projectionService = new DiagramProjectionService();
    const generationWorkflow = new GenerateArchitecture(
      validationWorkflow,
      graphBuilder,
      projectionService,
      diagramArtifactWriter,
      manifestLoader,
      federatedGraphAdapter,
      modelGenerator
    );
    const diagramWorkflow = new GenerateDiagram(
      validationWorkflow,
      graphBuilder,
      projectionService,
      diagramArtifactWriter,
      manifestLoader,
      federatedGraphAdapter,
      modelGenerator
    );
    const layoutWorkflow = new LayoutArchitecture(
      validationWorkflow,
      graphBuilder,
      projectionService,
      layoutService,
      diagramArtifactWriter,
      manifestLoader,
      federatedGraphAdapter,
      modelGenerator
    );
    const cleanWorkflow = new CleanArtifacts(workspaceLoader, new NodeArtifactCleaner());
    const federatedModelWorkflow = new GenerateFederatedModels(workspaceLoader, modelGenerator);
    const artifactServer = new NodeArtifactServer(
      layoutService,
      configurationLoader,
      documentCodec
    );
    const viewWorkflow = new ViewArtifacts(
      workspaceLoader,
      artifactServer,
      new NodeArtifactBrowser(),
      generationWorkflow
    );

    return new AtlasCli(
      logger,
      new ProcessRuntimeOutputWriter(),
      validationWorkflow,
      generationWorkflow,
      diagramWorkflow,
      layoutWorkflow,
      cleanWorkflow,
      federatedModelWorkflow,
      viewWorkflow
    );
  }
}
