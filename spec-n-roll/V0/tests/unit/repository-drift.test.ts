import { describe, expect, it } from 'vitest';

import type { RepositoryEvidence } from '../../src/sdk/config/schema.js';
import {
  analyzeLivingSpecDrift,
  categorizeScenarioDrift,
  detectMergedScenarios,
  detectObsoleteScenarios,
  loadLivingSpecScenarios,
  type NormalizedLivingSpecScenario,
} from '../../src/sdk/repository/drift.js';
import { createRepositoryEvidence } from '../../src/sdk/repository/evidence.js';
import { resolveRepositoryWorkflowFixture } from '../helpers/repository-workflows.js';

const greetingScenario: NormalizedLivingSpecScenario = {
  livingSpecRef: 'living-specs/greeting.feature:Scenario User receives a greeting',
  featurePath: 'living-specs/greeting.feature',
  scenarioName: 'User receives a greeting',
  featureTitle: 'Greeting users',
  tags: ['@greeting'],
  steps: [
    'Given a signed-in user named "Ada"',
    'When the greeting is requested',
    'Then the user sees "Hello, Ada"',
  ],
  thenExpectations: ['Hello, Ada'],
  behaviorArea: 'greeting',
};

const emptyNameScenario: NormalizedLivingSpecScenario = {
  livingSpecRef: 'living-specs/greeting.feature:Scenario Empty name is rejected',
  featurePath: 'living-specs/greeting.feature',
  scenarioName: 'Empty name is rejected',
  featureTitle: 'Greeting users',
  tags: ['@greeting'],
  steps: [
    'Given a signed-in user with an empty name',
    'When the greeting is requested',
    'Then the request is rejected with "Name is required"',
  ],
  thenExpectations: ['Name is required'],
  behaviorArea: 'greeting',
};

function buildEvidence(
  overrides: Partial<RepositoryEvidence> &
    Pick<RepositoryEvidence, 'id' | 'sourceType' | 'sourceRef' | 'behaviorSummary'>,
): RepositoryEvidence {
  return createRepositoryEvidence({
    evidenceKind: 'confirmed-behavior',
    confidence: 'high',
    ...overrides,
  });
}

describe('repository drift categorization', () => {
  it('categorizes behavior drift when living spec expectations differ from code and tests', () => {
    const evidence = [
      buildEvidence({
        id: 'ev-code-greet',
        sourceType: 'code',
        sourceRef: 'src/greeting/greet.ts:greet',
        behaviorSummary: 'Returns a greeting message for a valid user name',
      }),
      buildEvidence({
        id: 'ev-test-greet',
        sourceType: 'test',
        sourceRef: 'tests/greeting/greet.test.ts#returns an exclamation greeting for a valid name',
        behaviorSummary: 'Returns an exclamation greeting for a valid name',
      }),
      buildEvidence({
        id: 'ev-spec-greet',
        sourceType: 'living-spec',
        sourceRef: greetingScenario.livingSpecRef,
        behaviorSummary: 'User receives a greeting',
      }),
    ];

    const finding = categorizeScenarioDrift(greetingScenario, evidence, {
      codeReturnLiterals: ['Hello, ${trimmed}!'],
      testExpectedValues: ['Hello, Ada!'],
      documentationSummary:
        'The greeting feature returns a friendly Hello, {name} message for signed-in users.',
    });

    expect(finding?.category).toBe('behavior');
    expect(finding?.recommendedChange).toBe('update');
    expect(finding?.summary).toMatch(/Hello, Ada/i);
    expect(finding?.evidenceRefs).toEqual(
      expect.arrayContaining(['ev-code-greet', 'ev-test-greet', 'ev-spec-greet']),
    );
  });

  it('categorizes documentation drift when docs are stale but executable behavior is stable', () => {
    const evidence = [
      buildEvidence({
        id: 'ev-code-greet',
        sourceType: 'code',
        sourceRef: 'src/greeting/greet.ts:greet',
        behaviorSummary: 'Returns a greeting message for a valid user name',
      }),
      buildEvidence({
        id: 'ev-test-greet',
        sourceType: 'test',
        sourceRef: 'tests/greeting/greet.test.ts#returns an exclamation greeting for a valid name',
        behaviorSummary: 'Returns an exclamation greeting for a valid name',
      }),
      buildEvidence({
        id: 'ev-doc-greet',
        sourceType: 'documentation',
        sourceRef: 'docs/greeting.md',
        behaviorSummary:
          'The greeting feature returns a friendly Hello, {name} message for signed-in users.',
        evidenceKind: 'inferred-intent',
        confidence: 'medium',
      }),
    ];

    const finding = categorizeScenarioDrift(emptyNameScenario, evidence, {
      codeReturnLiterals: [],
      testExpectedValues: [],
      documentationSummary:
        'The greeting feature returns a friendly Hello, {name} message for signed-in users.',
      documentationOnly: true,
    });

    expect(finding?.category).toBe('documentation');
    expect(finding?.recommendedChange).toBe('refresh-wording');
    expect(finding?.summary).toMatch(/documentation/i);
  });

  it('categorizes test drift when executable tests contradict observed code behavior', () => {
    const evidence = [
      buildEvidence({
        id: 'ev-code-greet',
        sourceType: 'code',
        sourceRef: 'src/greeting/greet.ts:greet',
        behaviorSummary: 'Returns a greeting message for a valid user name',
      }),
      buildEvidence({
        id: 'ev-test-greet',
        sourceType: 'test',
        sourceRef: 'tests/greeting/greet.test.ts#returns a plain greeting for a valid name',
        behaviorSummary: 'Returns a plain greeting for a valid name',
      }),
    ];

    const finding = categorizeScenarioDrift(greetingScenario, evidence, {
      codeReturnLiterals: ['Hello, ${trimmed}!'],
      testExpectedValues: ['Hello, Ada'],
      documentationSummary: '',
    });

    expect(finding?.category).toBe('test');
    expect(finding?.recommendedChange).toBe('add-test');
    expect(finding?.summary).toMatch(/test/i);
  });

  it('categorizes organization drift for merged scenarios with the same observable outcome', () => {
    const duplicateScenario: NormalizedLivingSpecScenario = {
      ...greetingScenario,
      livingSpecRef: 'living-specs/greeting.feature:Scenario User receives a duplicate greeting',
      scenarioName: 'User receives a duplicate greeting',
    };

    const findings = detectMergedScenarios([greetingScenario, duplicateScenario]);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.category).toBe('organization');
    expect(findings[0]?.recommendedChange).toBe('merge');
    expect(findings[0]?.summary).toMatch(/merge/i);
  });

  it('marks unchanged scenarios without proposing duplicate living-spec work', () => {
    const evidence = [
      buildEvidence({
        id: 'ev-code-greet',
        sourceType: 'code',
        sourceRef: 'src/greeting/greet.ts:greet',
        behaviorSummary: 'Rejects an empty name',
      }),
      buildEvidence({
        id: 'ev-test-greet',
        sourceType: 'test',
        sourceRef: 'tests/greeting/greet.test.ts#rejects an empty name',
        behaviorSummary: 'Rejects an empty name',
      }),
      buildEvidence({
        id: 'ev-spec-empty',
        sourceType: 'living-spec',
        sourceRef: emptyNameScenario.livingSpecRef,
        behaviorSummary: 'Empty name is rejected',
      }),
    ];

    const finding = categorizeScenarioDrift(emptyNameScenario, evidence, {
      codeReturnLiterals: [],
      testExpectedValues: ['Name is required'],
      documentationSummary: 'Rejects empty names with Name is required.',
    });

    expect(finding?.category).toBe('behavior');
    expect(finding?.recommendedChange).toBe('none');
    expect(finding?.summary).toMatch(/unchanged/i);
  });

  it('detects obsolete scenarios without supporting repository evidence', () => {
    const obsoleteScenario: NormalizedLivingSpecScenario = {
      livingSpecRef: 'living-specs/greeting.feature:Scenario Legacy banner is shown',
      featurePath: 'living-specs/greeting.feature',
      scenarioName: 'Legacy banner is shown',
      featureTitle: 'Greeting users',
      tags: [],
      steps: ['Then the user sees "Welcome back"'],
      thenExpectations: ['Welcome back'],
      behaviorArea: 'greeting',
    };

    const findings = detectObsoleteScenarios([obsoleteScenario], []);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.category).toBe('organization');
    expect(findings[0]?.recommendedChange).toBe('delete');
    expect(findings[0]?.summary).toMatch(/obsolete/i);
  });

  it('loads and normalizes existing Gherkin scenarios from living-spec files', async () => {
    const projectRoot = resolveRepositoryWorkflowFixture('drift-basic');
    const scenarios = await loadLivingSpecScenarios(projectRoot, ['living-specs']);

    expect(scenarios.map((scenario) => scenario.scenarioName)).toEqual([
      'User receives a greeting',
      'Empty name is rejected',
    ]);
    expect(scenarios[0]?.thenExpectations).toContain('Hello, Ada');
    expect(scenarios[1]?.thenExpectations).toContain('Name is required');
  });

  it('analyzes drift across behavior, documentation, unchanged, and authority conflicts', async () => {
    const projectRoot = resolveRepositoryWorkflowFixture('drift-basic');
    const analysis = await analyzeLivingSpecDrift({
      projectRoot,
      discoveryPlan: {
        mode: 'repository-drift',
        includedPaths: ['src', 'tests', 'docs', 'living-specs'],
        omittedPaths: ['dist', 'node_modules'],
        livingSpecTargets: ['living-specs/greeting.feature'],
        testMappingStrategy: 'Map behavior-facing tests first, then mark gaps.',
        documentationSources: ['docs/greeting.md'],
        reviewCheckpoints: ['approve discovery scope', 'complete specify interview'],
        bounds: {},
      },
    });

    const categories = new Set(analysis.driftFindings.map((finding) => finding.category));
    expect(categories.has('behavior')).toBe(true);
    expect(categories.has('documentation')).toBe(true);

    const unchanged = analysis.driftFindings.find(
      (finding) => finding.recommendedChange === 'none',
    );
    expect(unchanged).toBeDefined();

    const behaviorUpdate = analysis.proposedLivingSpecChanges.find(
      (change) => change.changeType === 'update',
    );
    expect(behaviorUpdate?.targetRef).toMatch(/greeting\.feature/i);

    const authorityQuestion = analysis.questions.find((question) =>
      question.id.startsWith('authority-'),
    );
    expect(authorityQuestion?.prompt).toMatch(/authoritative/i);
    expect(authorityQuestion?.prompt).not.toMatch(/defaults? to/i);

    expect(
      analysis.proposedLivingSpecChanges.filter((change) => change.changeType === 'add'),
    ).toHaveLength(0);
  });
});
