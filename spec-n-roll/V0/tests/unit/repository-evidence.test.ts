import { afterEach, describe, expect, it } from 'vitest';

import {
  classifyBehaviorTestCoverage,
  collectOnboardingEvidence,
  createTestCoverageMapping,
  extractBehaviorFacingTestReferences,
  groupTestCoverageByType,
  requiresValidationTarget,
} from '../../src/sdk/repository/evidence.js';
import { recommendOnboardingDiscoveryPlan } from '../../src/sdk/repository/workflow-run.js';
import { createRepositoryWorkflowFixtureRegistry } from '../helpers/repository-workflows.js';

const fixtureRegistry = createRepositoryWorkflowFixtureRegistry();

afterEach(async () => {
  await fixtureRegistry.cleanup();
});

describe('test coverage mapping', () => {
  it('extracts behavior-facing test references with file and case identifiers', () => {
    const content = `
describe('greet', () => {
  it('returns a greeting for a valid name', () => {
    expect(greet('Ada')).toBe('Hello, Ada');
  });

  it('re-exports greet from the public module entry', () => {
    expect(typeof greet).toBe('function');
  });
});
`;

    const refs = extractBehaviorFacingTestReferences('tests/greeting/greet.test.ts', content);

    expect(refs).toEqual([
      {
        testRef: 'tests/greeting/greet.test.ts#returns a greeting for a valid name',
        description: 'returns a greeting for a valid name',
      },
      {
        testRef: 'tests/greeting/greet.test.ts#re-exports greet from the public module entry',
        description: 're-exports greet from the public module entry',
      },
    ]);
  });

  it('classifies direct coverage when tests assert user-observable behavior', () => {
    const mapping = classifyBehaviorTestCoverage({
      behaviorId: 'greeting',
      behaviorSummary: 'Returns a greeting message for a valid user name',
      testRefs: [
        {
          testRef: 'tests/greeting/greet.test.ts#returns a greeting for a valid name',
          description: 'returns a greeting for a valid name',
        },
      ],
    });

    expect(mapping.coverageType).toBe('direct');
    expect(mapping.testRefs).toContain(
      'tests/greeting/greet.test.ts#returns a greeting for a valid name',
    );
    expect(mapping.recommendedValidationTarget).toBeUndefined();
  });

  it('classifies indirect coverage when tests only verify infrastructure details', () => {
    const mapping = classifyBehaviorTestCoverage({
      behaviorId: 'greeting',
      behaviorSummary: 'Returns a greeting message for a valid user name',
      testRefs: [
        {
          testRef: 'tests/greeting/module.test.ts#re-exports greet from the public module entry',
          description: 're-exports greet from the public module entry',
        },
      ],
    });

    expect(mapping.coverageType).toBe('indirect');
    expect(mapping.testRefs).toContain(
      'tests/greeting/module.test.ts#re-exports greet from the public module entry',
    );
    expect(mapping.notes).toMatch(/infrastructure|indirect/i);
  });

  it('classifies missing coverage and requires a validation target', () => {
    const mapping = classifyBehaviorTestCoverage({
      behaviorId: 'notify',
      behaviorSummary: 'Builds an alert message shown to the user',
      testRefs: [],
    });

    expect(mapping.coverageType).toBe('missing');
    expect(mapping.testRefs).toEqual([]);
    expect(mapping.recommendedValidationTarget).toMatch(/alert|user/i);
    expect(requiresValidationTarget(mapping.coverageType)).toBe(true);
  });

  it('classifies unknown coverage when tests exist but do not clearly map to behavior', () => {
    const mapping = classifyBehaviorTestCoverage({
      behaviorId: 'notify',
      behaviorSummary: 'Builds an alert message shown to the user',
      testRefs: [
        {
          testRef: 'tests/shared/setup.test.ts#supports callback registration',
          description: 'supports callback registration',
        },
      ],
    });

    expect(mapping.coverageType).toBe('unknown');
    expect(mapping.recommendedValidationTarget).toMatch(/alert|user/i);
    expect(requiresValidationTarget(mapping.coverageType)).toBe(true);
  });

  it('groups mappings by coverage type for workflow summaries', () => {
    const grouped = groupTestCoverageByType([
      createTestCoverageMapping({
        behaviorId: 'greeting',
        testRefs: ['tests/greeting/greet.test.ts#greet'],
        coverageType: 'direct',
      }),
      createTestCoverageMapping({
        behaviorId: 'notify',
        testRefs: [],
        coverageType: 'missing',
        recommendedValidationTarget: 'User sees an alert for a valid message.',
      }),
    ]);

    expect(grouped.get('direct')).toHaveLength(1);
    expect(grouped.get('missing')).toHaveLength(1);
    expect(grouped.get('indirect')).toEqual([]);
  });

  it('maps onboarding fixture behavior to direct, indirect, and missing coverage', async () => {
    const projectRoot = await fixtureRegistry.copy('onboarding-basic', 'coverage-mapping');
    const plan = await recommendOnboardingDiscoveryPlan({
      projectRoot,
      mode: 'repository-onboarding',
    });
    const result = await collectOnboardingEvidence({
      projectRoot,
      discoveryPlan: plan,
    });

    const greetingMapping = result.testCoverageMappings.find(
      (mapping) => mapping.behaviorId === 'greeting',
    );
    const notifyMapping = result.testCoverageMappings.find(
      (mapping) => mapping.behaviorId === 'notify',
    );

    expect(greetingMapping?.coverageType).toBe('direct');
    expect(greetingMapping?.testRefs.some((ref) => ref.includes('greet.test.ts'))).toBe(true);

    expect(notifyMapping?.coverageType).toBe('missing');
    expect(notifyMapping?.recommendedValidationTarget).toMatch(/alert|user/i);
    expect(result.testGapRecommendations.some((gap) => gap.behaviorId === 'notify')).toBe(true);

    const indirectEvidence = result.evidence.filter(
      (record) => record.sourceType === 'test' && record.sourceRef.includes('module.test.ts'),
    );
    expect(indirectEvidence.length).toBeGreaterThan(0);
  });
});
