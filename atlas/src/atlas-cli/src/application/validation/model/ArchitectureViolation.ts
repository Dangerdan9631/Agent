import type { AtlasRuleSeverity } from '#application/configuration/model/AtlasConfiguration.js';

/**
 * Describes one actionable architecture policy violation.
 */
export class ArchitectureViolation {
  /**
   * Creates a deterministic violation record suitable for command output and generated reports.
   *
   * @param ruleId - Unique identifier of the declared policy rule that failed.
   * @param severity - Error or warning severity declared by the policy.
   * @param sourcePath - Workspace-relative source file responsible for the relationship.
   * @param targetPath - Workspace-relative target file or unresolved module identity.
   * @param relationshipPath - Ordered related path when the analysis adapter can provide one.
   * @param message - Remediation-oriented explanation of the violation.
   */
  public constructor(
    public readonly ruleId: string,
    public readonly severity: AtlasRuleSeverity,
    public readonly sourcePath: string,
    public readonly targetPath: string,
    public readonly relationshipPath: readonly string[],
    public readonly message: string
  ) {}
}
