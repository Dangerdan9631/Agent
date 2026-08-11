import type { AtlasConfiguration } from '#application/configuration/model/AtlasConfiguration.js';
import { FederatedDeclarationGraphAdapter } from '#application/federation/FederatedDeclarationGraphAdapter.js';
import { FederatedDependencyAnalysisAdapter } from '#application/federation/FederatedDependencyAnalysisAdapter.js';
import type { AtlasModuleModel } from '#application/federation/model/AtlasModuleModel.js';
import {
  ResolvedAtlasRelationship,
  ResolvedAtlasWorkspace
} from '#application/federation/model/ResolvedAtlasWorkspace.js';
import { ArchitectureValidator } from '#application/validation/ArchitectureValidator.js';
import { CircularDependencyRuleEvaluator } from '#application/validation/CircularDependencyRuleEvaluator.js';
import { DependencyDirectionRuleEvaluator } from '#application/validation/DependencyDirectionRuleEvaluator.js';
import { PackageOwnershipResolver } from '#application/validation/PackageOwnershipResolver.js';
import { RuleSelectorMatcher } from '#application/validation/RuleSelectorMatcher.js';
import { RuntimeToSupportRuleEvaluator } from '#application/validation/RuntimeToSupportRuleEvaluator.js';
import { ResolvedWorkspacePaths } from '#application/workspace/model/ResolvedWorkspacePaths.js';
import { WorkspacePackage } from '#application/workspace/model/WorkspacePackage.js';
import { WorkspaceSnapshot } from '#application/workspace/model/WorkspaceSnapshot.js';
import { describe, expect, it } from 'vitest';

/**
 * Verifies federated dependencies retain module policy context and directed cycle semantics.
 */
describe('FederatedDependencyAnalysisAdapter', () => {
  /**
   * Detects a cross-module cycle and enables module, class, and runtime/support selectors.
   */
  it('validates Kotlin-style module-local dependencies through explicit module identities', () => {
    const fixture = new CyclicFederatedWorkspaceFixture();
    const federatedWorkspace = fixture.createResolvedWorkspace();
    const analysis = new FederatedDependencyAnalysisAdapter(
      new FederatedDeclarationGraphAdapter()
    ).analyze(federatedWorkspace);
    const workspace = fixture.createPolicyWorkspace();
    const ownershipResolver = new PackageOwnershipResolver();
    const validator = new ArchitectureValidator([
      new CircularDependencyRuleEvaluator(),
      new RuntimeToSupportRuleEvaluator(ownershipResolver),
      new DependencyDirectionRuleEvaluator(new RuleSelectorMatcher(ownershipResolver))
    ]);

    const result = validator.validate(workspace, analysis);
    const applicationRelationship = analysis.find(
      (entry) => entry.packageName === fixture.applicationModuleId
    )?.relationships[0];

    expect(applicationRelationship).toMatchObject({
      sourcePath: 'src/main/kotlin/dev/example/app/ApplicationService.kt',
      targetPath: 'src/main/kotlin/dev/example/support/TestCatalog.kt',
      sourceModuleId: fixture.applicationModuleId,
      targetModuleId: fixture.supportModuleId,
      circular: true
    });
    expect(applicationRelationship?.cyclePath).toEqual(
      expect.arrayContaining([
        `${fixture.applicationModuleId}:src/main/kotlin/dev/example/app/ApplicationService.kt`,
        `${fixture.supportModuleId}:src/main/kotlin/dev/example/support/TestCatalog.kt`
      ])
    );
    expect(result.violations.map((violation) => violation.ruleId)).toEqual([
      'application-no-support-class',
      'no-cycles',
      'runtime-no-support'
    ]);
  });

  /**
   * Detects artifact cycles when portable relationships intentionally omit target element IDs.
   */
  it('detects cross-module cycles from module-only relationship targets', () => {
    const fixture = new CyclicFederatedWorkspaceFixture();
    const analysis = new FederatedDependencyAnalysisAdapter(
      new FederatedDeclarationGraphAdapter()
    ).analyze(fixture.createResolvedWorkspace(false));
    const relationships = analysis.flatMap((entry) => entry.relationships);
    const violations = new CircularDependencyRuleEvaluator().evaluate(
      { id: 'no-cycles', type: 'no-circular', severity: 'error' },
      fixture.createPolicyWorkspace(),
      analysis
    );

    expect(relationships).toHaveLength(2);
    expect(relationships.every((relationship) => relationship.circular)).toBe(true);
    expect(relationships.map((relationship) => relationship.cyclePath)).toEqual([
      [`module:${fixture.applicationModuleId}`, `module:${fixture.supportModuleId}`],
      [`module:${fixture.supportModuleId}`, `module:${fixture.applicationModuleId}`]
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.ruleId).toBe('no-cycles');
  });

  /**
   * Keeps structural ownership edges out of dependency policy evaluation.
   */
  it('excludes containment relationships from dependency analysis', () => {
    const fixture = new CyclicFederatedWorkspaceFixture();
    const analysis = new FederatedDependencyAnalysisAdapter(
      new FederatedDeclarationGraphAdapter()
    ).analyze(fixture.createContainmentWorkspace());

    expect(analysis).toHaveLength(1);
    expect(analysis[0]?.relationships).toEqual([]);
  });
});

/**
 * Builds two portable modules whose declaration references form one directed cycle.
 */
class CyclicFederatedWorkspaceFixture {
  /**
   * Identifies the runtime application artifact.
   */
  public readonly applicationModuleId = 'dev.example:app:1.0.0';

  /**
   * Identifies the support-only artifact.
   */
  public readonly supportModuleId = 'dev.example:test-support:1.0.0';

  /**
   * Creates linked language-neutral models with Kotlin-style module-local source paths.
   *
   * @param includeTargetElementIds - Whether cross-module targets identify a precise declaration.
   * @returns Resolved workspace containing a two-edge directed cycle.
   */
  public createResolvedWorkspace(includeTargetElementIds = true): ResolvedAtlasWorkspace {
    const application = this.createModel(
      this.applicationModuleId,
      'application-service',
      'ApplicationService',
      'dev.example.app.ApplicationService',
      'src/main/kotlin/dev/example/app/ApplicationService.kt',
      'application-support',
      this.supportModuleId,
      includeTargetElementIds ? 'support-service' : undefined
    );
    const support = this.createModel(
      this.supportModuleId,
      'support-service',
      'TestCatalog',
      'dev.example.support.TestCatalog',
      'src/main/kotlin/dev/example/support/TestCatalog.kt',
      'support-application',
      this.applicationModuleId,
      includeTargetElementIds ? 'application-service' : undefined
    );
    return new ResolvedAtlasWorkspace(
      new Map([
        [application.module.id, application],
        [support.module.id, support]
      ]),
      [
        new ResolvedAtlasRelationship(
          application.module.id,
          application.relationships[0]!,
          support,
          includeTargetElementIds ? 'support-service' : undefined
        ),
        new ResolvedAtlasRelationship(
          support.module.id,
          support.relationships[0]!,
          application,
          includeTargetElementIds ? 'application-service' : undefined
        )
      ]
    );
  }

  /**
   * Creates one module whose only relationship expresses declaration ownership.
   *
   * @returns Resolved workspace with a containment edge that is not a dependency.
   */
  public createContainmentWorkspace(): ResolvedAtlasWorkspace {
    const relationship = {
      id: 'application-contains-service',
      sourceElementId: 'application-namespace',
      kind: 'contains' as const,
      target: { elementId: 'application-service' }
    };
    const model: AtlasModuleModel = {
      schemaVersion: 1,
      generatorVersion: 'atlas-kt-test',
      module: {
        id: this.applicationModuleId,
        displayName: 'Application',
        version: '1.0.0',
        category: 'gradle-jvm-artifact'
      },
      sourceLanguage: 'kotlin',
      elements: [
        {
          id: 'application-namespace',
          name: 'app',
          kind: 'namespace',
          qualifiedName: 'dev.example.app'
        },
        {
          id: 'application-service',
          name: 'ApplicationService',
          kind: 'class',
          qualifiedName: 'dev.example.app.ApplicationService',
          parentId: 'application-namespace',
          sourcePath: 'src/main/kotlin/dev/example/app/ApplicationService.kt'
        }
      ],
      relationships: [relationship]
    };
    return new ResolvedAtlasWorkspace(new Map([[model.module.id, model]]), [
      new ResolvedAtlasRelationship(model.module.id, relationship, model, 'application-service')
    ]);
  }

  /**
   * Creates classification and validation policy for the two manifest modules.
   *
   * @returns Workspace whose packages use module-local source roots.
   */
  public createPolicyWorkspace(): WorkspaceSnapshot {
    const configuration: AtlasConfiguration = {
      schemaVersion: 1,
      discovery: {
        packages: [
          { match: { name: 'dev.example:app:*' }, classification: 'runtime' },
          {
            match: { name: 'dev.example:test-support:*' },
            classification: 'support',
            classes: ['support-tooling']
          }
        ]
      },
      rules: [
        { id: 'no-cycles', type: 'no-circular', severity: 'error' },
        { id: 'runtime-no-support', type: 'no-runtime-to-support', severity: 'error' },
        {
          id: 'application-no-support-class',
          type: 'dependency-direction',
          severity: 'error',
          mode: 'forbid',
          from: { moduleIds: [this.applicationModuleId] },
          to: { packageClasses: ['support-tooling'] }
        }
      ]
    };
    return new WorkspaceSnapshot(
      new ResolvedWorkspacePaths('/workspace', '/workspace/atlas.config.yml', '/workspace/out'),
      configuration,
      [
        new WorkspacePackage(
          this.applicationModuleId,
          '/workspace',
          '.',
          [],
          'runtime',
          [],
          undefined
        ),
        new WorkspacePackage(
          this.supportModuleId,
          '/workspace',
          '.',
          [],
          'support',
          ['support-tooling'],
          undefined
        )
      ]
    );
  }

  /**
   * Creates one module with a single cross-module reference.
   *
   * @returns Portable module model containing one owned class and reference.
   */
  private createModel(
    moduleId: string,
    elementId: string,
    name: string,
    qualifiedName: string,
    sourcePath: string,
    relationshipId: string,
    targetModuleId: string,
    targetElementId: string | undefined
  ): AtlasModuleModel {
    return {
      schemaVersion: 1,
      generatorVersion: 'atlas-kt-test',
      module: {
        id: moduleId,
        displayName: name,
        version: '1.0.0',
        category: 'gradle-jvm-artifact'
      },
      sourceLanguage: 'kotlin',
      elements: [{ id: elementId, name, kind: 'class', qualifiedName, sourcePath }],
      relationships: [
        {
          id: relationshipId,
          sourceElementId: elementId,
          kind: 'references',
          target:
            targetElementId === undefined
              ? { moduleId: targetModuleId }
              : { moduleId: targetModuleId, elementId: targetElementId }
        }
      ]
    };
  }
}
