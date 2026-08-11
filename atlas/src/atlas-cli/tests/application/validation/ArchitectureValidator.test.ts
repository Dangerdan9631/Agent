import type { AtlasConfiguration } from '#application/configuration/model/AtlasConfiguration.js';
import { ArchitectureValidator } from '#application/validation/ArchitectureValidator.js';
import { CircularDependencyRuleEvaluator } from '#application/validation/CircularDependencyRuleEvaluator.js';
import { DependencyDirectionRuleEvaluator } from '#application/validation/DependencyDirectionRuleEvaluator.js';
import { ForbiddenExternalRuleEvaluator } from '#application/validation/ForbiddenExternalRuleEvaluator.js';
import { ForbiddenImportRuleEvaluator } from '#application/validation/ForbiddenImportRuleEvaluator.js';
import { DependencyAnalysisResult } from '#application/validation/model/DependencyAnalysisResult.js';
import { DependencyRelationship } from '#application/validation/model/DependencyRelationship.js';
import { PackageOwnershipResolver } from '#application/validation/PackageOwnershipResolver.js';
import { RuleSelectorMatcher } from '#application/validation/RuleSelectorMatcher.js';
import { RuntimeToSupportRuleEvaluator } from '#application/validation/RuntimeToSupportRuleEvaluator.js';
import { ResolvedWorkspacePaths } from '#application/workspace/model/ResolvedWorkspacePaths.js';
import { WorkspacePackage } from '#application/workspace/model/WorkspacePackage.js';
import { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';
import { describe, expect, it } from 'vitest';

/**
 * Creates a stable workspace snapshot for architecture validation tests.
 */
class ValidationWorkspaceFactory {
  /**
   * Creates a workspace with one runtime package and one support package.
   *
   * @returns Fixture workspace with circular and runtime/support policies.
   */
  public create(): WorkspaceSnapshot {
    const configuration: AtlasConfiguration = {
      schemaVersion: 1,
      discovery: {
        packages: [
          { match: { name: '@demo/runtime' }, classification: 'runtime' },
          { match: { name: '@demo/support' }, classification: 'support' }
        ]
      },
      rules: [
        { id: 'no-cycle', type: 'no-circular', severity: 'error' },
        { id: 'runtime-no-support', type: 'no-runtime-to-support', severity: 'warning' }
      ]
    };
    const runtimePackage = new WorkspacePackage(
      '@demo/runtime',
      '/workspace/packages/runtime',
      'packages/runtime',
      ['/workspace/packages/runtime/src'],
      'runtime',
      [],
      undefined
    );
    const supportPackage = new WorkspacePackage(
      '@demo/support',
      '/workspace/packages/support',
      'packages/support',
      ['/workspace/packages/support/src'],
      'support',
      [],
      undefined
    );

    return new WorkspaceSnapshot(
      new ResolvedWorkspacePaths(
        '/workspace',
        '/workspace/atlas.config.yml',
        '/workspace/architecture'
      ),
      configuration,
      [runtimePackage, supportPackage]
    );
  }
}

/**
 * Verifies deterministic policy evaluation from normalized dependency relationships.
 */
describe('ArchitectureValidator', () => {
  /**
   * Verifies that cycles are deduplicated and runtime-to-support imports retain warning severity.
   */
  it('reports declared circular and runtime-to-support violations', () => {
    const workspace = new ValidationWorkspaceFactory().create();
    const analysisResults = [
      new DependencyAnalysisResult(
        '@demo/runtime',
        [
          new DependencyRelationship(
            'packages/runtime/src/a.ts',
            'packages/runtime/src/b.ts',
            './b',
            true,
            ['packages/runtime/src/a.ts', 'packages/runtime/src/b.ts']
          ),
          new DependencyRelationship(
            'packages/runtime/src/a.ts',
            'packages/support/src/tool.ts',
            '@demo/support',
            false,
            []
          )
        ],
        {}
      )
    ];
    const validator = new ArchitectureValidator([
      new CircularDependencyRuleEvaluator(),
      new RuntimeToSupportRuleEvaluator(new PackageOwnershipResolver())
    ]);

    const result = validator.validate(workspace, analysisResults);

    expect(result.violations).toHaveLength(2);
    expect(result.violations.map((violation) => violation.ruleId)).toEqual([
      'no-cycle',
      'runtime-no-support'
    ]);
    expect(result.hasErrors()).toBe(true);
  });

  /**
   * Verifies configurable direction, forbidden-import, and forbidden-external policy behavior.
   */
  it('reports configured direction and import restrictions', () => {
    const workspace = new ValidationWorkspaceFactory().create();
    const restrictedWorkspace = new WorkspaceSnapshot(
      workspace.paths,
      {
        ...workspace.configuration,
        layers: [
          {
            name: 'runtime-source',
            sourceGlobs: ['packages/runtime/src/**'],
            packageNames: ['@demo/runtime']
          }
        ],
        rules: [
          {
            id: 'runtime-cannot-use-support',
            type: 'dependency-direction',
            severity: 'error',
            mode: 'forbid',
            from: { layers: ['runtime-source'] },
            to: { packageNames: ['@demo/support'] }
          },
          {
            id: 'no-legacy-imports',
            type: 'forbidden-import',
            severity: 'warning',
            patterns: ['legacy/**']
          },
          {
            id: 'no-react',
            type: 'forbidden-external',
            severity: 'error',
            packages: ['react']
          }
        ]
      },
      workspace.packages
    );
    const analysisResults = [
      new DependencyAnalysisResult(
        '@demo/runtime',
        [
          new DependencyRelationship(
            'packages/runtime/src/app.ts',
            'packages/support/src/tool.ts',
            '@demo/support',
            false,
            []
          ),
          new DependencyRelationship(
            'packages/runtime/src/app.ts',
            undefined,
            'legacy/client',
            false,
            []
          ),
          new DependencyRelationship(
            'packages/runtime/src/app.ts',
            undefined,
            'react/jsx-runtime',
            false,
            []
          )
        ],
        {}
      )
    ];
    const ownershipResolver = new PackageOwnershipResolver();
    const selectorMatcher = new RuleSelectorMatcher(ownershipResolver);
    const validator = new ArchitectureValidator([
      new CircularDependencyRuleEvaluator(),
      new RuntimeToSupportRuleEvaluator(ownershipResolver),
      new DependencyDirectionRuleEvaluator(selectorMatcher),
      new ForbiddenImportRuleEvaluator(selectorMatcher),
      new ForbiddenExternalRuleEvaluator(selectorMatcher)
    ]);

    const result = validator.validate(restrictedWorkspace, analysisResults);

    expect(result.violations.map((violation) => violation.ruleId)).toEqual([
      'no-legacy-imports',
      'no-react',
      'runtime-cannot-use-support'
    ]);
  });
});
