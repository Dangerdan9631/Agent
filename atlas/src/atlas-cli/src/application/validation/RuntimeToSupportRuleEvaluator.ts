import type {
  AtlasArchitectureRule,
  AtlasRuntimeToSupportRule
} from '#application/configuration/model/AtlasConfiguration.js';
import type { PackageOwnershipResolver } from '#application/validation/PackageOwnershipResolver.js';
import { ArchitectureViolation } from '#application/validation/model/ArchitectureViolation.js';
import type { ArchitectureRuleEvaluator } from '#application/validation/ports/ArchitectureRuleEvaluator.js';
import type { DependencyAnalysisResult } from '#application/validation/model/DependencyAnalysisResult.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';

/**
 * Reports direct dependency relationships from runtime packages to support packages.
 */
export class RuntimeToSupportRuleEvaluator implements ArchitectureRuleEvaluator {
  /**
   * Creates the evaluator with workspace-relative package ownership resolution.
   *
   * @param ownershipResolver - Resolves dependency target paths to configured package roots.
   */
  public constructor(private readonly ownershipResolver: PackageOwnershipResolver) {}

  /**
   * Indicates whether this evaluator owns runtime-to-support dependency rules.
   *
   * @param rule - Declared architecture policy rule.
   * @returns True when the rule prohibits runtime-to-support dependencies.
   */
  public supports(rule: AtlasArchitectureRule): boolean {
    return rule.type === 'no-runtime-to-support';
  }

  /**
   * Reports direct runtime-to-support package dependency violations.
   *
   * @param rule - Runtime-to-support policy rule.
   * @param workspace - Loaded package classifications.
   * @param analysisResults - Normalized dependency analysis results.
   * @returns Deterministically sorted runtime-to-support violations.
   */
  public evaluate(
    rule: AtlasArchitectureRule,
    workspace: WorkspaceSnapshot,
    analysisResults: readonly DependencyAnalysisResult[]
  ): readonly ArchitectureViolation[] {
    const runtimeToSupportRule = rule as AtlasRuntimeToSupportRule;
    const violations: ArchitectureViolation[] = [];

    for (const analysisResult of analysisResults) {
      const sourcePackage = workspace.packages.find(
        (workspacePackage) => workspacePackage.name === analysisResult.packageName
      );

      if (sourcePackage?.classification !== 'runtime') {
        continue;
      }

      for (const relationship of analysisResult.relationships) {
        if (relationship.targetPath === undefined) {
          continue;
        }

        const targetPackage =
          relationship.targetModuleId === undefined
            ? this.ownershipResolver.resolve(relationship.targetPath, workspace.packages)
            : workspace.packages.find(
                (workspacePackage) => workspacePackage.name === relationship.targetModuleId
              );
        if (targetPackage?.classification !== 'support') {
          continue;
        }

        violations.push(
          new ArchitectureViolation(
            runtimeToSupportRule.id,
            runtimeToSupportRule.severity,
            relationship.sourcePath,
            relationship.targetPath,
            [relationship.sourcePath, relationship.targetPath],
            `Move the dependency from runtime package '${sourcePackage.name}' behind a runtime abstraction instead of importing support package '${targetPackage.name}'.`
          )
        );
      }
    }

    return violations.sort((left, right) => {
      const sourceOrder = left.sourcePath.localeCompare(right.sourcePath);
      return sourceOrder === 0 ? left.targetPath.localeCompare(right.targetPath) : sourceOrder;
    });
  }
}
