import { afterEach, describe, expect, it } from 'vitest';

import {
  collectOnboardingEvidence,
  createRepositoryEvidence,
} from '../../src/sdk/repository/evidence.js';
import {
  normalizeApprovedDiscoveryPlan,
  recommendDiscoveryPlan,
} from '../../src/sdk/repository/discovery-plan.js';
import { recommendOnboardingDiscoveryPlan } from '../../src/sdk/repository/workflow-run.js';
import { createRepositoryWorkflowFixtureRegistry } from '../helpers/repository-workflows.js';

const fixtureRegistry = createRepositoryWorkflowFixtureRegistry();

afterEach(async () => {
  await fixtureRegistry.cleanup();
});

describe('repository onboarding discovery', () => {
  it('recommends a discovery plan with included source, test, and documentation paths', async () => {
    const projectRoot = await fixtureRegistry.copy('onboarding-basic', 'discovery-plan');

    const plan = await recommendOnboardingDiscoveryPlan({
      projectRoot,
      mode: 'repository-onboarding',
    });

    expect(plan.mode).toBe('repository-onboarding');
    expect(plan.includedPaths).toEqual(expect.arrayContaining(['src', 'tests', 'docs']));
    expect(plan.documentationSources.length).toBeGreaterThan(0);
    expect(plan.reviewCheckpoints).toEqual(
      expect.arrayContaining(['approve discovery scope', 'complete specify interview']),
    );
  });

  it('discovers user-facing greeting behavior with code, test, and documentation evidence', async () => {
    const projectRoot = await fixtureRegistry.copy('onboarding-basic', 'discovery-evidence');

    const plan = await recommendOnboardingDiscoveryPlan({
      projectRoot,
      mode: 'repository-onboarding',
    });
    const result = await collectOnboardingEvidence({
      projectRoot,
      discoveryPlan: plan,
    });

    expect(result.evidence.length).toBeGreaterThan(0);

    const codeEvidence = result.evidence.find(
      (record) =>
        record.sourceType === 'code' && record.sourceRef.includes('src/greeting/greet.ts'),
    );
    expect(codeEvidence?.behaviorSummary).toMatch(/greeting|hello/i);
    expect(codeEvidence?.evidenceKind).toBe('confirmed-behavior');

    const testEvidence = result.evidence.find(
      (record) =>
        record.sourceType === 'test' && record.sourceRef.includes('tests/greeting/greet.test.ts#'),
    );
    expect(testEvidence?.evidenceKind).toBe('confirmed-behavior');

    const docEvidence = result.evidence.find(
      (record) =>
        record.sourceType === 'documentation' && record.sourceRef.includes('docs/greeting.md'),
    );
    expect(docEvidence).toBeDefined();

    expect(result.proposedLivingSpecChanges.length).toBeGreaterThan(0);
    expect(result.proposedLivingSpecChanges[0]?.changeType).toBe('add');
    expect(result.proposedLivingSpecChanges[0]?.targetRef).toMatch(/living-specs\/.*\.feature/);
  });

  it('recommends default onboarding paths when no scope hints are provided', async () => {
    const projectRoot = await fixtureRegistry.copy('onboarding-basic', 'default-plan');

    const plan = await recommendDiscoveryPlan({
      projectRoot,
      mode: 'repository-onboarding',
    });

    expect(plan.includedPaths).toEqual(expect.arrayContaining(['src', 'tests', 'docs']));
    expect(plan.omittedPaths).toEqual(expect.arrayContaining(['dist', 'node_modules']));
    expect(plan.bounds).toEqual({});
    expect(plan.testMappingStrategy).toMatch(/behavior-facing tests/i);
  });

  it('narrows discovery scope to maintainer-selected included paths', async () => {
    const projectRoot = await fixtureRegistry.copy('onboarding-basic', 'narrowed-plan');

    const plan = await recommendDiscoveryPlan({
      projectRoot,
      mode: 'repository-onboarding',
      scope: { includedPaths: ['src/greeting'] },
    });

    expect(plan.includedPaths).toEqual(['src/greeting']);
    expect(plan.includedPaths).not.toContain('src/notify');
  });

  it('broadens discovery scope when maintainers add paths beyond defaults', async () => {
    const projectRoot = await fixtureRegistry.copy('onboarding-basic', 'broadened-plan');

    const plan = await recommendDiscoveryPlan({
      projectRoot,
      mode: 'repository-onboarding',
      scope: { includedPaths: ['src', 'tests', 'docs', 'README.md'] },
    });

    expect(plan.includedPaths).toEqual(
      expect.arrayContaining(['src', 'tests', 'docs', 'README.md']),
    );
    expect(plan.documentationSources).toContain('README.md');
  });

  it('applies product-area bounds and records deferred areas as omitted paths', async () => {
    const projectRoot = await fixtureRegistry.copy('large-repo', 'bounded-plan');

    const plan = await recommendDiscoveryPlan({
      projectRoot,
      mode: 'repository-onboarding',
      bounds: { maxProductAreas: 5 },
    });

    expect(plan.bounds.maxProductAreas).toBe(5);
    expect(plan.includedPaths).toEqual(
      expect.arrayContaining([
        'src/areas/area-01',
        'src/areas/area-05',
        'tests/areas/area-01.test.ts',
        'tests/areas/area-05.test.ts',
      ]),
    );
    expect(plan.includedPaths).not.toContain('src/areas/area-06');
    expect(plan.omittedPaths).toEqual(
      expect.arrayContaining(['src/areas/area-06', 'src/areas/area-24']),
    );
  });

  it('normalizes approved scope paths and rejects paths outside the project root', async () => {
    const projectRoot = await fixtureRegistry.copy('onboarding-basic', 'approved-plan');

    const normalized = normalizeApprovedDiscoveryPlan(projectRoot, {
      mode: 'repository-onboarding',
      includedPaths: ['src\\greeting'],
      omittedPaths: ['dist'],
      livingSpecTargets: [],
      testMappingStrategy: 'Map behavior-facing tests first, then mark gaps.',
      documentationSources: ['docs'],
      reviewCheckpoints: ['approve discovery scope', 'complete specify interview'],
      bounds: {},
    });

    expect(normalized.includedPaths).toEqual(['src/greeting']);

    expect(() =>
      normalizeApprovedDiscoveryPlan(projectRoot, {
        mode: 'repository-onboarding',
        includedPaths: ['../outside'],
        omittedPaths: [],
        livingSpecTargets: [],
        testMappingStrategy: 'Map behavior-facing tests first, then mark gaps.',
        documentationSources: [],
        reviewCheckpoints: ['approve discovery scope'],
        bounds: {},
      }),
    ).toThrow(/inside the project root|escapes project root/i);
  });

  it('classifies evidence kinds and excludes internal-only utilities without user-facing behavior', () => {
    const conflict = createRepositoryEvidence({
      id: 'ev-conflict',
      sourceType: 'code',
      sourceRef: 'src/internal/cache.ts',
      behaviorSummary: 'Caches values in memory',
      evidenceKind: 'limitation',
      confidence: 'low',
      notes: 'Internal utility without user-facing behavior',
    });

    expect(conflict.evidenceKind).toBe('limitation');
    expect(conflict.confidence).toBe('low');
  });
});
