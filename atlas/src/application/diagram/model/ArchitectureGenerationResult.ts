import type { DiagramGraph } from '#application/diagram/model/DiagramGraph.js';
import type { DeclarationGraph } from '#application/graph/model/DeclarationGraph.js';
import type { ValidationCommandResult } from '#application/validation/model/ValidationCommandResult.js';

/**
 * Captures the validation outcome and optional generated graph artifacts for one generate command.
 */
export class ArchitectureGenerationResult {
  /**
   * Creates a completed generation result.
   *
   * @param validationResult - Completed analysis and policy validation result.
   * @param graph - Semantic graph written to artifacts, when generation was permitted.
   * @param diagrams - Generated diagram scope graphs, when generation was permitted.
   */
  public constructor(
    public readonly validationResult: ValidationCommandResult,
    public readonly graph: DeclarationGraph | undefined,
    public readonly diagrams: readonly DiagramGraph[]
  ) {}

  /**
   * Indicates whether semantic graph artifacts were generated.
   *
   * @returns True when a graph was built and diagrams were persisted.
   */
  public generated(): boolean {
    return this.graph !== undefined;
  }
}
