import { WorkspaceLoader } from '#application/workspace/WorkspaceLoader.js';
import { GenerateArchitecture } from '#application/diagram/GenerateArchitecture.js';
import { GenerateDiagram } from '#application/diagram/GenerateDiagram.js';
import { DiagramProjectionService } from '#application/diagram/DiagramProjectionService.js';
import { ArchitectureValidator } from '#application/validation/ArchitectureValidator.js';
import { CircularDependencyRuleEvaluator } from '#application/validation/CircularDependencyRuleEvaluator.js';
import { DependencyDirectionRuleEvaluator } from '#application/validation/DependencyDirectionRuleEvaluator.js';
import { DependencyBudgetRuleEvaluator } from '#application/validation/DependencyBudgetRuleEvaluator.js';
import { ForbidRuleEvaluator } from '#application/validation/ForbidRuleEvaluator.js';
import { NoOrphansRuleEvaluator } from '#application/validation/NoOrphansRuleEvaluator.js';
import { PackageOwnershipResolver } from '#application/validation/PackageOwnershipResolver.js';
import { PublicApiOnlyRuleEvaluator } from '#application/validation/PublicApiOnlyRuleEvaluator.js';
import { RequiredDependencyRuleEvaluator } from '#application/validation/RequiredDependencyRuleEvaluator.js';
import { RuleSelectorMatcher } from '#application/validation/RuleSelectorMatcher.js';
import { ValidateArchitecture } from '#application/validation/ValidateArchitecture.js';
import { YamlAtlasConfigurationLoader } from '#infrastructure/configuration/YamlAtlasConfigurationLoader.js';
import { YamlDocumentCodec } from '#infrastructure/configuration/YamlDocumentCodec.js';
import { TslogAtlasLogger } from '#infrastructure/logging/TslogAtlasLogger.js';
import { ProcessRuntimeOutputWriter } from '#infrastructure/output/ProcessRuntimeOutputWriter.js';
import { NodeDependencyAnalysisArtifactWriter } from '#infrastructure/artifacts/NodeDependencyAnalysisArtifactWriter.js';
import { NodeValidationReportWriter } from '#infrastructure/artifacts/NodeValidationReportWriter.js';
import { NodeDiagramArtifactWriter } from '#infrastructure/artifacts/NodeDiagramArtifactWriter.js';
import { DeterministicLayoutService } from '#application/layout/DeterministicLayoutService.js';
import { LayoutArchitecture } from '#application/layout/LayoutArchitecture.js';
import { CleanArtifacts } from '#application/clean/CleanArtifacts.js';
import { NodeWorkspacePathResolver } from '#infrastructure/workspace/NodeWorkspacePathResolver.js';
import { AtlasCli } from '#presentation/cli/AtlasCli.js';
import { NodeArtifactCleaner } from '#infrastructure/artifacts/NodeArtifactCleaner.js';
import { NodeAtlasWorkspaceLoader } from '#infrastructure/federation/NodeAtlasWorkspaceLoader.js';
import { FederatedDeclarationGraphAdapter } from '#application/federation/FederatedDeclarationGraphAdapter.js';
import { FederatedDependencyAnalysisAdapter } from '#application/federation/FederatedDependencyAnalysisAdapter.js';
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
    const documentCodec = new YamlDocumentCodec();
    const modelLoader = new NodeAtlasWorkspaceLoader(documentCodec);
    const configurationLoader = new YamlAtlasConfigurationLoader(documentCodec);
    const workspaceLoader = new WorkspaceLoader(
      new NodeWorkspacePathResolver(),
      configurationLoader,
      modelLoader,
      logger
    );
    const ownershipResolver = new PackageOwnershipResolver();
    const selectorMatcher = new RuleSelectorMatcher(ownershipResolver);
    const architectureValidator = new ArchitectureValidator([
      new CircularDependencyRuleEvaluator(selectorMatcher),
      new DependencyDirectionRuleEvaluator(selectorMatcher),
      new ForbidRuleEvaluator(selectorMatcher),
      new PublicApiOnlyRuleEvaluator(selectorMatcher),
      new DependencyBudgetRuleEvaluator(selectorMatcher),
      new RequiredDependencyRuleEvaluator(selectorMatcher),
      new NoOrphansRuleEvaluator(selectorMatcher)
    ]);
    const layoutService = new DeterministicLayoutService();
    const federatedGraphAdapter = new FederatedDeclarationGraphAdapter();
    const validationWorkflow = new ValidateArchitecture(
      workspaceLoader,
      new NodeDependencyAnalysisArtifactWriter(),
      architectureValidator,
      new FederatedDependencyAnalysisAdapter(federatedGraphAdapter),
      new NodeValidationReportWriter()
    );
    const generationWorkflow = new GenerateArchitecture(
      validationWorkflow,
      new DiagramProjectionService(),
      new NodeDiagramArtifactWriter(layoutService),
      federatedGraphAdapter
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
    const documentCodec = new YamlDocumentCodec();
    const modelLoader = new NodeAtlasWorkspaceLoader(documentCodec);
    const configurationLoader = new YamlAtlasConfigurationLoader(documentCodec);
    const workspaceLoader = new WorkspaceLoader(
      new NodeWorkspacePathResolver(),
      configurationLoader,
      modelLoader,
      logger
    );
    const ownershipResolver = new PackageOwnershipResolver();
    const selectorMatcher = new RuleSelectorMatcher(ownershipResolver);
    const architectureValidator = new ArchitectureValidator([
      new CircularDependencyRuleEvaluator(selectorMatcher),
      new DependencyDirectionRuleEvaluator(selectorMatcher),
      new ForbidRuleEvaluator(selectorMatcher),
      new PublicApiOnlyRuleEvaluator(selectorMatcher),
      new DependencyBudgetRuleEvaluator(selectorMatcher),
      new RequiredDependencyRuleEvaluator(selectorMatcher),
      new NoOrphansRuleEvaluator(selectorMatcher)
    ]);
    const layoutService = new DeterministicLayoutService();
    const diagramArtifactWriter = new NodeDiagramArtifactWriter(layoutService);
    const federatedGraphAdapter = new FederatedDeclarationGraphAdapter();
    const validationWorkflow = new ValidateArchitecture(
      workspaceLoader,
      new NodeDependencyAnalysisArtifactWriter(),
      architectureValidator,
      new FederatedDependencyAnalysisAdapter(federatedGraphAdapter),
      new NodeValidationReportWriter()
    );
    const projectionService = new DiagramProjectionService();
    const generationWorkflow = new GenerateArchitecture(
      validationWorkflow,
      projectionService,
      diagramArtifactWriter,
      federatedGraphAdapter
    );
    const diagramWorkflow = new GenerateDiagram(
      validationWorkflow,
      projectionService,
      diagramArtifactWriter,
      federatedGraphAdapter
    );
    const layoutWorkflow = new LayoutArchitecture(
      validationWorkflow,
      projectionService,
      layoutService,
      diagramArtifactWriter,
      federatedGraphAdapter
    );
    const cleanWorkflow = new CleanArtifacts(workspaceLoader, new NodeArtifactCleaner());
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
      viewWorkflow
    );
  }
}
