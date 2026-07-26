import type {
  AtlasArchitectureRule,
  AtlasForbiddenImportRule
} from '#application/configuration/model/AtlasConfiguration.js';
import { ArchitectureViolation } from '#application/validation/model/ArchitectureViolation.js';
import type { ArchitectureRuleEvaluator } from '#application/validation/ports/ArchitectureRuleEvaluator.js';
import type { DependencyAnalysisResult } from '#application/validation/model/DependencyAnalysisResult.js';
import type { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';
import { minimatch } from 'minimatch';

import type { RuleSelectorMatcher } from '#application/validation/RuleSelectorMatcher.js';

/**
 * Reports import specifiers forbidden by declared source-scoped glob patterns.
 */
export class ForbiddenImportRuleEvaluator implements ArchitectureRuleEvaluator {
  /**
   * Creates an import evaluator with source selector matching.
   *
   * @param selectorMatcher - Matches importing source paths against optional rule selectors.
   */
  public constructor(private readonly selectorMatcher: RuleSelectorMatcher) {}

  /**
   * Indicates whether this evaluator owns forbidden-import rules.
   *
   * @param rule - Declared architecture policy rule.
   * @returns True when the rule prohibits import specifiers.
   */
  public supports(rule: AtlasArchitectureRule): boolean {
    return rule.type === 'forbidden-import';
  }

  /**
   * Reports every configured forbidden import specifier relationship.
   *
   * @param rule - Declared forbidden-import rule.
   * @param workspace - Loaded workspace configuration.
   * @param analysisResults - Normalized dependency analysis results.
   * @returns Sorted actionable forbidden-import violations.
   */
  public evaluate(
    rule: AtlasArchitectureRule,
    workspace: WorkspaceSnapshot,
    analysisResults: readonly DependencyAnalysisResult[]
  ): readonly ArchitectureViolation[] {
    if (rule.type !== 'forbidden-import') {
      return [];
    }

    const importRule: AtlasForbiddenImportRule = rule;
    const violations: ArchitectureViolation[] = [];

    for (const analysisResult of analysisResults) {
      for (const relationship of analysisResult.relationships) {
        if (
          (importRule.from !== undefined &&
            !this.selectorMatcher.matches(importRule.from, relationship.sourcePath, workspace)) ||
          !this.matchesPattern(importRule.patterns, relationship.moduleSpecifier)
        ) {
          continue;
        }

        violations.push(
          new ArchitectureViolation(
            importRule.id,
            importRule.severity,
            relationship.sourcePath,
            relationship.targetPath ?? relationship.moduleSpecifier,
            [relationship.sourcePath, relationship.targetPath ?? relationship.moduleSpecifier],
            `Replace forbidden import '${relationship.moduleSpecifier}' with an allowed dependency declared by rule '${importRule.id}'.`
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
   * Tests an import specifier against slash-normalized user-owned glob patterns.
   *
   * @param patterns - Non-empty configured forbidden import patterns.
   * @param moduleSpecifier - Import text as it appeared in source code.
   * @returns True when at least one forbidden pattern matches.
   */
  private matchesPattern(patterns: readonly string[], moduleSpecifier: string): boolean {
    return patterns.some((pattern) =>
      minimatch(moduleSpecifier, pattern.replaceAll('\\', '/'), { dot: true })
    );
  }
}
