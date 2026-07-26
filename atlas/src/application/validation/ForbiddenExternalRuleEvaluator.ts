import type {
  AtlasArchitectureRule,
  AtlasForbiddenExternalRule
} from '#application/configuration/model/AtlasConfiguration.js';
import { ArchitectureViolation } from '#application/validation/model/ArchitectureViolation.js';
import type { ArchitectureRuleEvaluator } from '#application/validation/ports/ArchitectureRuleEvaluator.js';
import type { DependencyAnalysisResult } from '#application/validation/model/DependencyAnalysisResult.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';
import { minimatch } from 'minimatch';

import type { RuleSelectorMatcher } from '#application/validation/RuleSelectorMatcher.js';

/**
 * Reports external package imports forbidden by declared source-scoped package patterns.
 */
export class ForbiddenExternalRuleEvaluator implements ArchitectureRuleEvaluator {
  /**
   * Creates an external dependency evaluator with source selector matching.
   *
   * @param selectorMatcher - Matches importing source paths against optional rule selectors.
   */
  public constructor(private readonly selectorMatcher: RuleSelectorMatcher) {}

  /**
   * Indicates whether this evaluator owns forbidden-external rules.
   *
   * @param rule - Declared architecture policy rule.
   * @returns True when the rule prohibits external package imports.
   */
  public supports(rule: AtlasArchitectureRule): boolean {
    return rule.type === 'forbidden-external';
  }

  /**
   * Reports every matching unresolved external package dependency.
   *
   * @param rule - Declared forbidden-external rule.
   * @param workspace - Loaded workspace configuration.
   * @param analysisResults - Normalized dependency analysis results.
   * @returns Sorted actionable forbidden-external violations.
   */
  public evaluate(
    rule: AtlasArchitectureRule,
    workspace: WorkspaceSnapshot,
    analysisResults: readonly DependencyAnalysisResult[]
  ): readonly ArchitectureViolation[] {
    if (rule.type !== 'forbidden-external') {
      return [];
    }

    const externalRule: AtlasForbiddenExternalRule = rule;
    const violations: ArchitectureViolation[] = [];

    for (const analysisResult of analysisResults) {
      for (const relationship of analysisResult.relationships) {
        const externalPackageName = this.toExternalPackageName(relationship.moduleSpecifier);

        if (
          relationship.targetPath !== undefined ||
          externalPackageName === undefined ||
          (externalRule.from !== undefined &&
            !this.selectorMatcher.matches(externalRule.from, relationship.sourcePath, workspace)) ||
          !this.matchesPackage(externalRule.packages, externalPackageName)
        ) {
          continue;
        }

        violations.push(
          new ArchitectureViolation(
            externalRule.id,
            externalRule.severity,
            relationship.sourcePath,
            externalPackageName,
            [relationship.sourcePath, externalPackageName],
            `Remove forbidden external dependency '${externalPackageName}' or isolate it behind an allowed adapter required by rule '${externalRule.id}'.`
          )
        );
      }
    }

    return violations.sort((left, right) => {
      const sourceOrder = left.sourcePath.localeCompare(right.sourcePath);
      return sourceOrder === 0 ? left.targetPath.localeCompare(right.targetPath) : sourceOrder;
    });
  }

  /**
   * Extracts a package-root identity from an external import specifier.
   *
   * @param moduleSpecifier - Import text as it appeared in source code.
   * @returns Package-root identity, or undefined when the specifier is relative or otherwise internal.
   */
  private toExternalPackageName(moduleSpecifier: string): string | undefined {
    if (
      moduleSpecifier.startsWith('.') ||
      moduleSpecifier.startsWith('/') ||
      moduleSpecifier.startsWith('#')
    ) {
      return undefined;
    }

    if (moduleSpecifier.startsWith('node:')) {
      return moduleSpecifier;
    }

    const segments = moduleSpecifier.split('/');
    if (moduleSpecifier.startsWith('@')) {
      return segments.length >= 2 ? `${segments[0]}/${segments[1]}` : undefined;
    }

    return segments[0];
  }

  /**
   * Tests one external package identity against configured package glob patterns.
   *
   * @param patterns - Non-empty configured forbidden external package patterns.
   * @param packageName - External package-root identity.
   * @returns True when at least one forbidden pattern matches.
   */
  private matchesPackage(patterns: readonly string[], packageName: string): boolean {
    return patterns.some((pattern) =>
      minimatch(packageName, pattern.replaceAll('\\', '/'), { dot: true })
    );
  }
}
