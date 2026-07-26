import type { DependencyRelationship } from '#application/validation/model/DependencyRelationship.js';

/**
 * Groups normalized dependency relationships produced while analysing one workspace package.
 */
export class DependencyAnalysisResult {
  /**
   * Creates the deterministic analysis result for one explicitly selected package.
   *
   * @param packageName - Unique manifest name of the analysed package.
   * @param relationships - Relationships sorted by source path, target identity, and import text.
   * @param rawReport - Portable vendor-schema report retained for artifact persistence.
   */
  public constructor(
    public readonly packageName: string,
    public readonly relationships: readonly DependencyRelationship[],
    public readonly rawReport: unknown
  ) {}
}
