import type { DiagramProjectionService } from '#application/diagram/DiagramProjectionService.js';
import type { DiagramGraph } from '#application/diagram/model/DiagramGraph.js';
import type { DiagramArtifactWriter } from '#application/diagram/ports/DiagramArtifactWriter.js';
import type { DeclarationGraphBuilder } from '#application/graph/ports/DeclarationGraphBuilder.js';
import type { DeterministicLayoutService } from '#application/layout/DeterministicLayoutService.js';
import { ArchitectureLayoutResult } from '#application/layout/model/ArchitectureLayoutResult.js';
import { LayoutSettings } from '#application/layout/model/LayoutDocument.js';
import type { LayoutDocument, LayoutOverrides } from '#application/layout/model/LayoutDocument.js';
import type { ArchitectureLayoutWorkflow } from '#application/layout/ports/ArchitectureLayoutWorkflow.js';
import type { ArchitectureValidationWorkflow } from '#application/validation/ports/ArchitectureValidationWorkflow.js';
import type { WorkspaceLoadingRequest } from '#application/workspace/model/WorkspaceLoadingRequest.js';
import type { AtlasWorkspaceLoader } from '#application/federation/ports/AtlasWorkspaceLoader.js';
import type { FederatedDeclarationGraphAdapter } from '#application/federation/FederatedDeclarationGraphAdapter.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';
import type { DeclarationGraph } from '#application/graph/model/DeclarationGraph.js';
import type { AtlasModelGenerator } from '#application/federation/ports/AtlasModelGenerator.js';
import { resolve } from 'node:path';

/**
 * Orchestrates validation-aware rebuilding and persistence of one diagram scope layout.
 */
export class LayoutArchitecture implements ArchitectureLayoutWorkflow {
  /**
   * Creates scoped layout behavior from validation, graph, projection, layout, and persistence collaborators.
   *
   * @param validationWorkflow - Produces workspace analysis and declared-rule outcome.
   * @param graphBuilder - Rebuilds the current semantic graph.
   * @param projectionService - Projects the graph into addressable diagram scopes.
   * @param layoutService - Computes deterministic placement for a selected scope.
   * @param artifactWriter - Persists graph artifacts and scoped layout documents.
   */
  public constructor(
    private readonly validationWorkflow: ArchitectureValidationWorkflow,
    private readonly graphBuilder: DeclarationGraphBuilder,
    private readonly projectionService: DiagramProjectionService,
    private readonly layoutService: DeterministicLayoutService,
    private readonly artifactWriter: DiagramArtifactWriter,
    private readonly manifestLoader?: AtlasWorkspaceLoader,
    private readonly federatedGraphAdapter?: FederatedDeclarationGraphAdapter,
    private readonly modelGenerator?: AtlasModelGenerator
  ) {}

  /**
   * Validates, rebuilds, and persists deterministic layout for one selected diagram scope.
   *
   * @param request - Workspace path options supplied by the command presentation boundary.
   * @param scope - Stable landscape or package scope identifier.
   * @param overrides - Optional command settings applied over workspace layout defaults.
   * @param generateArtifacts - Determines whether graph artifacts are regenerated before layout persistence.
   * @returns Validation outcome with optional generated layout state.
   */
  public async execute(
    request: WorkspaceLoadingRequest,
    scope: string,
    overrides: LayoutOverrides,
    generateArtifacts: boolean
  ): Promise<ArchitectureLayoutResult> {
    const validationResult = await this.validationWorkflow.execute(request);
    if (validationResult.validation.hasErrors()) {
      return new ArchitectureLayoutResult(validationResult, undefined, undefined, undefined, 0, 0);
    }

    let diagram: DiagramGraph | undefined;
    if (generateArtifacts) {
      const graph = await this.buildGraph(request, validationResult.workspace);
      const diagrams = this.projectionService.project(validationResult.workspace, graph);
      diagram = diagrams.find((candidate) => candidate.scope === scope);
      if (diagram !== undefined) {
        await this.artifactWriter.write(validationResult.workspace, diagrams);
      }
    } else {
      diagram = await this.artifactWriter.readDiagram(
        validationResult.workspace,
        scope as DiagramGraph['scope']
      );
    }
    if (diagram === undefined) {
      throw new Error(`Atlas does not have a generated diagram scope named '${scope}'.`);
    }
    const savedLayout = await this.artifactWriter.readLayout(validationResult.workspace, diagram);
    const settings = this.resolveSettings(
      validationResult.workspace.configuration.layout,
      overrides
    );
    const layout = this.layoutService.layout(diagram, savedLayout, settings);
    await this.artifactWriter.writeLayout(validationResult.workspace, diagram, layout);
    const retainedNodeCount = this.countRetainedPositions(savedLayout, layout, settings.force);
    return new ArchitectureLayoutResult(
      validationResult,
      diagram,
      layout,
      settings,
      retainedNodeCount,
      layout.positions.length - retainedNodeCount
    );
  }

  /** Builds the selected manifest graph or the compatibility TypeScript graph. */
  private async buildGraph(
    request: WorkspaceLoadingRequest,
    workspace: WorkspaceSnapshot
  ): Promise<DeclarationGraph> {
    const manifestPath = await this.toManifestPath(request, workspace);
    if (manifestPath === undefined) return this.graphBuilder.build(workspace);
    if (this.manifestLoader === undefined || this.federatedGraphAdapter === undefined) {
      throw new Error('Atlas manifest layout generation is not configured for this command host.');
    }
    return this.federatedGraphAdapter.toGraph(await this.manifestLoader.load(manifestPath));
  }

  /** Resolves a selected manifest or generates the compatibility manifest from selected packages. */
  private async toManifestPath(
    request: WorkspaceLoadingRequest,
    workspace: WorkspaceSnapshot
  ): Promise<string | undefined> {
    if (request.manifestOption !== undefined) return request.manifestOption;
    if (this.modelGenerator === undefined) return undefined;
    if (workspace.paths.artifactRootPath === undefined) {
      throw new Error(
        'Atlas requires an artifact root to generate its canonical workspace manifest.'
      );
    }
    return this.modelGenerator.generate(
      workspace,
      resolve(workspace.paths.artifactRootPath, 'models')
    );
  }

  /**
   * Counts persisted positions that survived the current layout operation unchanged.
   *
   * @param savedLayout - Prior compatible layout state, when present.
   * @param layout - Current canonical layout state.
   * @param force - Determines whether retained positions were intentionally replaced.
   * @returns Count of prior positions with identical current parent and coordinates.
   */
  private countRetainedPositions(
    savedLayout: LayoutDocument | undefined,
    layout: LayoutDocument,
    force: boolean
  ): number {
    if (savedLayout === undefined || force) {
      return 0;
    }
    const currentPositions = new Map(
      layout.positions.map((position) => [position.nodeId, position])
    );
    return savedLayout.positions.filter((savedPosition) => {
      const currentPosition = currentPositions.get(savedPosition.nodeId);
      return (
        currentPosition !== undefined &&
        currentPosition.parentId === savedPosition.parentId &&
        currentPosition.x === savedPosition.x &&
        currentPosition.y === savedPosition.y
      );
    }).length;
  }

  /**
   * Merges workspace defaults and optional command overrides into complete layout settings.
   *
   * @param configuredLayout - Optional workspace-owned layout defaults.
   * @param overrides - Optional command-level settings with highest precedence.
   * @returns Fully specified deterministic layout settings.
   */
  private resolveSettings(
    configuredLayout:
      | {
          readonly orientation?: 'horizontal' | 'vertical';
          readonly rows?: number;
          readonly horizontalGap?: number;
          readonly verticalGap?: number;
        }
      | undefined,
    overrides: LayoutOverrides
  ): LayoutSettings {
    return new LayoutSettings(
      overrides.orientation ?? configuredLayout?.orientation ?? 'horizontal',
      overrides.rows ?? configuredLayout?.rows ?? 6,
      overrides.horizontalGap ?? configuredLayout?.horizontalGap ?? 80,
      overrides.verticalGap ?? configuredLayout?.verticalGap ?? 60,
      overrides.force
    );
  }
}
