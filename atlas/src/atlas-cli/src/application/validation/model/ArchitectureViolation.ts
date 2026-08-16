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
   * @param details - Optional structured relationship and measurement metadata for reports.
   */
  public constructor(
    public readonly ruleId: string,
    public readonly severity: AtlasRuleSeverity,
    public readonly sourcePath: string,
    public readonly targetPath: string,
    public readonly relationshipPath: readonly string[],
    public readonly message: string,
    public readonly details: ArchitectureViolationDetails = {}
  ) {}
}

/**
 * Carries optional portable metadata associated with a rule violation.
 */
export interface ArchitectureViolationDetails {
  /**
   * Identifies the owning root or module policy boundary.
   */
  readonly owner?: string | undefined;

  /**
   * Identifies the relationship kind responsible for the violation.
   */
  readonly relationshipKind?: string | undefined;

  /**
   * Identifies the source module when the fact originated in a module model.
   */
  readonly sourceModuleId?: string | undefined;

  /**
   * Identifies the source element when the fact originated in a module model.
   */
  readonly sourceElementId?: string | undefined;

  /**
   * Identifies the target module when it resolved to a loaded model.
   */
  readonly targetModuleId?: string | undefined;

  /**
   * Identifies the target element when it resolved to a loaded model element.
   */
  readonly targetElementId?: string | undefined;

  /**
   * Stores an actual measurement for a budget violation.
   */
  readonly actual?: number | undefined;

  /**
   * Stores the permitted maximum for a budget violation.
   */
  readonly maximum?: number | undefined;
}
