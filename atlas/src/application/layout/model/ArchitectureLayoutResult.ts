import type { DiagramGraph } from '#application/diagram/model/DiagramGraph.js';
import type { LayoutDocument } from '#application/layout/model/LayoutDocument.js';
import type { LayoutSettings } from '#application/layout/model/LayoutDocument.js';
import type { ValidationCommandResult } from '#application/validation/model/ValidationCommandResult.js';

/**
 * Captures validation and optional persisted layout state from one layout command execution.
 */
export class ArchitectureLayoutResult {
  /**
   * Creates a layout workflow result.
   *
   * @param validationResult - Architecture validation outcome used to authorize layout work.
   * @param diagram - Resolved scope diagram when generation proceeded.
   * @param layout - Persisted canonical layout when generation proceeded.
   * @param settings - Fully resolved placement settings when generation proceeded.
   * @param retainedNodeCount - Count of valid saved node positions retained unchanged.
   * @param movedNodeCount - Count of nodes placed or replaced by the current layout operation.
   */
  public constructor(
    public readonly validationResult: ValidationCommandResult,
    public readonly diagram: DiagramGraph | undefined,
    public readonly layout: LayoutDocument | undefined,
    public readonly settings: LayoutSettings | undefined,
    public readonly retainedNodeCount: number,
    public readonly movedNodeCount: number
  ) {}

  /**
   * Reports whether a scope layout was successfully generated and persisted.
   *
   * @returns True when both diagram and layout are available.
   */
  public completed(): boolean {
    return this.diagram !== undefined && this.layout !== undefined;
  }
}
