import { describe, expect, it } from 'vitest';

import type {
  DiscoveryPlan,
  DriftFinding,
  RepositoryEvidence,
  TestCoverageMapping,
  TestGapRecommendation,
} from '../../src/sdk/config/schema.js';
import {
  REPOSITORY_WORKFLOW_REPORT_SECTION_HEADINGS,
  REPOSITORY_WORKFLOW_REPORT_SECTIONS,
  renderRepositoryWorkflowReportMarkdown,
} from '../../src/sdk/repository/report.js';
import { createRepositoryEvidence } from '../../src/sdk/repository/evidence.js';

/**
 * Minimal discovery plan for report rendering tests.
 */
const sampleDiscoveryPlan: DiscoveryPlan = {
  mode: 'repository-onboarding',
  includedPaths: ['src/greeting'],
  omittedPaths: ['src/legacy'],
  livingSpecTargets: [],
  testMappingStrategy: 'Map behavior-facing tests first, then mark gaps.',
  documentationSources: ['docs/greeting.md'],
  reviewCheckpoints: ['approve discovery scope', 'complete specify interview'],
  bounds: { maxProductAreas: 5 },
};

/**
 * Sample evidence records covering confirmed facts and conflicts.
 */
const sampleEvidence: RepositoryEvidence[] = [
  createRepositoryEvidence({
    id: 'ev-confirmed',
    sourceType: 'code',
    sourceRef: 'src/greeting/greet.ts:greet',
    behaviorSummary: 'Returns a greeting for a valid user name',
    evidenceKind: 'confirmed-behavior',
    confidence: 'high',
  }),
  createRepositoryEvidence({
    id: 'ev-conflict',
    sourceType: 'test',
    sourceRef: 'tests/greeting/greet.test.ts#returns exclamation greeting',
    behaviorSummary: 'Tests expect an exclamation greeting',
    evidenceKind: 'conflict',
    confidence: 'medium',
  }),
];

/**
 * Sample test coverage mappings for report rendering tests.
 */
const sampleTestMappings: TestCoverageMapping[] = [
  {
    behaviorId: 'greeting-valid-name',
    testRefs: ['tests/greeting/greet.test.ts#returns greeting'],
    coverageType: 'direct',
  },
  {
    behaviorId: 'greeting-empty-name',
    testRefs: [],
    coverageType: 'missing',
    recommendedValidationTarget: 'living-specs/greeting.feature:Scenario Empty name is rejected',
  },
];

/**
 * Sample test gap recommendations for report rendering tests.
 */
const sampleTestGaps: TestGapRecommendation[] = [
  {
    behaviorId: 'greeting-empty-name',
    recommendedValidationTarget: 'living-specs/greeting.feature:Scenario Empty name is rejected',
  },
];

/**
 * Sample drift findings for drift report rendering tests.
 */
const sampleDriftFindings: DriftFinding[] = [
  {
    id: 'drift-1',
    category: 'behavior',
    livingSpecRef: 'living-specs/greeting.feature:Scenario User receives a greeting',
    evidenceRefs: ['ev-confirmed'],
    summary: 'Living spec greeting text differs from code and tests',
    authorityChoice: 'code',
    recommendedChange: 'update',
  },
];

describe('repository workflow report markdown', () => {
  it('renders all required section headings for onboarding reports', () => {
    const markdown = renderRepositoryWorkflowReportMarkdown({
      workflowTypeName: 'Repository Onboarding',
      specifyOutputRef: 'specs/001-repository-living-specs/spec.md',
      discoveryPlan: sampleDiscoveryPlan,
      evidence: sampleEvidence,
      driftFindings: [],
      testCoverageMappings: sampleTestMappings,
      testGapRecommendations: sampleTestGaps,
      assumptions: ['Greeting behavior is user-facing.'],
      limitations: 'Living-spec and test files are not modified during specify.',
      nextSteps: ['clarify', 'plan', 'tasks', 'implement'],
    });

    for (const section of REPOSITORY_WORKFLOW_REPORT_SECTIONS) {
      expect(markdown).toContain(`## ${REPOSITORY_WORKFLOW_REPORT_SECTION_HEADINGS[section]}`);
    }
  });

  it('links specify output to the produced spec.md path', () => {
    const specifyOutputRef = 'specs/002-repository-living-specs/spec.md';
    const markdown = renderRepositoryWorkflowReportMarkdown({
      workflowTypeName: 'Repository Onboarding',
      specifyOutputRef,
      discoveryPlan: sampleDiscoveryPlan,
      evidence: sampleEvidence,
      driftFindings: [],
      testCoverageMappings: sampleTestMappings,
      testGapRecommendations: sampleTestGaps,
      assumptions: [],
      limitations: 'No mutations during specify.',
      nextSteps: ['clarify'],
    });

    expect(markdown).toContain(`[spec.md](${specifyOutputRef})`);
  });

  it('summarizes included and omitted discovery scope', () => {
    const markdown = renderRepositoryWorkflowReportMarkdown({
      workflowTypeName: 'Repository Onboarding',
      specifyOutputRef: 'specs/001-repository-living-specs/spec.md',
      discoveryPlan: sampleDiscoveryPlan,
      evidence: sampleEvidence,
      driftFindings: [],
      testCoverageMappings: sampleTestMappings,
      testGapRecommendations: sampleTestGaps,
      assumptions: [],
      limitations: 'No mutations during specify.',
      nextSteps: ['clarify'],
      nextSuggestedScopedRun: {
        includedPaths: ['src/areas/area-06'],
        description: 'Follow-up pass for deferred product areas.',
      },
    });

    expect(markdown).toContain('src/greeting');
    expect(markdown).toContain('src/legacy');
    expect(markdown).toContain('maxProductAreas: 5');
    expect(markdown).toMatch(/next suggested scoped run/i);
    expect(markdown).toContain('src/areas/area-06');
  });

  it('lists evidence conflicts separately from confirmed facts', () => {
    const markdown = renderRepositoryWorkflowReportMarkdown({
      workflowTypeName: 'Repository Onboarding',
      specifyOutputRef: 'specs/001-repository-living-specs/spec.md',
      discoveryPlan: sampleDiscoveryPlan,
      evidence: sampleEvidence,
      driftFindings: [],
      testCoverageMappings: sampleTestMappings,
      testGapRecommendations: sampleTestGaps,
      assumptions: [],
      limitations: 'No mutations during specify.',
      nextSteps: ['clarify'],
    });

    const evidenceSection =
      markdown.split('## Evidence Summary')[1]?.split('## Drift Findings')[0] ?? '';
    expect(evidenceSection).toMatch(/confirmed/i);
    expect(evidenceSection).toMatch(/conflict/i);
    expect(evidenceSection).toContain('ev-confirmed');
    expect(evidenceSection).toContain('ev-conflict');
  });

  it('ties test gaps to behavior identifiers and validation targets', () => {
    const markdown = renderRepositoryWorkflowReportMarkdown({
      workflowTypeName: 'Repository Onboarding',
      specifyOutputRef: 'specs/001-repository-living-specs/spec.md',
      discoveryPlan: sampleDiscoveryPlan,
      evidence: sampleEvidence,
      driftFindings: [],
      testCoverageMappings: sampleTestMappings,
      testGapRecommendations: sampleTestGaps,
      assumptions: [],
      limitations: 'No mutations during specify.',
      nextSteps: ['clarify'],
    });

    const testGapSection = markdown.split('## Test Gaps')[1]?.split('## Assumptions')[0] ?? '';
    expect(testGapSection).toContain('greeting-empty-name');
    expect(testGapSection).toContain(
      'living-specs/greeting.feature:Scenario Empty name is rejected',
    );
  });

  it('renders drift findings with categories and authority choices for drift runs', () => {
    const markdown = renderRepositoryWorkflowReportMarkdown({
      workflowTypeName: 'Repository Drift',
      specifyOutputRef: 'specs/003-repository-living-spec-drift/spec.md',
      discoveryPlan: {
        ...sampleDiscoveryPlan,
        mode: 'repository-drift',
        livingSpecTargets: ['living-specs/greeting.feature'],
      },
      evidence: sampleEvidence,
      driftFindings: sampleDriftFindings,
      testCoverageMappings: sampleTestMappings,
      testGapRecommendations: sampleTestGaps,
      assumptions: ['Authority defaults to code when tests conflict with living specs.'],
      limitations: 'No mutations during specify.',
      nextSteps: ['clarify', 'plan'],
    });

    const driftSection = markdown.split('## Drift Findings')[1]?.split('## Test Gaps')[0] ?? '';
    expect(driftSection).toContain('[behavior]');
    expect(driftSection).toContain('authority: code');
    expect(driftSection).toContain(
      'living-specs/greeting.feature:Scenario User receives a greeting',
    );
  });

  it('keeps assumptions separate from evidence facts', () => {
    const markdown = renderRepositoryWorkflowReportMarkdown({
      workflowTypeName: 'Repository Onboarding',
      specifyOutputRef: 'specs/001-repository-living-specs/spec.md',
      discoveryPlan: sampleDiscoveryPlan,
      evidence: sampleEvidence,
      driftFindings: [],
      testCoverageMappings: sampleTestMappings,
      testGapRecommendations: sampleTestGaps,
      assumptions: ['Only greeting behavior is in scope.'],
      limitations: 'No mutations during specify.',
      nextSteps: ['clarify'],
    });

    const assumptionsSection =
      markdown.split('## Assumptions')[1]?.split('## Limitations')[0] ?? '';
    expect(assumptionsSection).toContain('Only greeting behavior is in scope.');
    expect(assumptionsSection).not.toContain('ev-confirmed');
  });
});
